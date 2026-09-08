import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Sky} from 'three/addons/objects/Sky.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {MuseumCase} from './types';

type Settings={reduced:boolean;sensitivity:number;quality:number};
type Box={x:number;z:number;w:number;d:number};
const stone=new T.MeshStandardMaterial({color:0xc4b89b,roughness:.86});
const pale=new T.MeshStandardMaterial({color:0xd5ccba,roughness:.78});
const trim=new T.MeshStandardMaterial({color:0x958369,roughness:.7});
const wood=new T.MeshStandardMaterial({color:0x261b14,roughness:.7});
const brass=new T.MeshStandardMaterial({color:0xa68c52,metalness:.8,roughness:.32});
const slate=new T.MeshStandardMaterial({color:0x263c39,roughness:.84});
const paper=new T.MeshStandardMaterial({color:0xe7deca,roughness:.9});

export class MuseumWorld {
 scene=new T.Scene(); camera=new T.PerspectiveCamera( sixty(),innerWidth/innerHeight,.08,420); renderer:T.WebGLRenderer;
 kit!:T.Group; keys=new Set<string>(); yaw=Math.PI; pitch=.04; active=false; paused=false; guided=false;
 settings:Settings={reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,sensitivity:1,quality:1};
 solids:Box[]=[]; moving=false; loaded=new Set<string>(); rooms=new Map<string,T.Group>(); artifacts=new Map<string,T.Group>();
 startTime=performance.now(); lastTime=performance.now(); sun!:T.DirectionalLight; nearest:string|null=null; doors:T.Group[]=[];
 target:T.Vector3|null=null; targetYaw=0; targetPitch=0; flight=0; from=new T.Vector3(); fromYaw=0; fromPitch=0;
 pointer:{id:number;x:number;y:number}|null=null; onNear:(id:string|null)=>void; onActivate:(id:string)=>void; onStep:()=>void; onMenu:()=>void;
 dragDistance=0; disposed=false; stepAt=0; frameCount=0; fps=60;
 constructor(canvas:HTMLCanvasElement,cases:MuseumCase[],callbacks:{near:(id:string|null)=>void;activate:(id:string)=>void;step:()=>void;menu:()=>void}){
  this.onNear=callbacks.near;this.onActivate=callbacks.activate;this.onStep=callbacks.step;this.onMenu=callbacks.menu;this.cases=cases;
  this.renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));this.renderer.setSize(innerWidth,innerHeight);
  this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.13;
  this.scene.fog=new T.Fog(0xb5b6ab,65,210);this.scene.background=new T.Color(0xaab9bb);
  this.camera.position.set(0,2.15,-9);this.camera.rotation.order='YXZ';this.look();
  canvas.addEventListener('pointerdown',e=>{if(!this.active||this.paused||this.guided)return;this.dragDistance=0;this.pointer={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!this.active||this.paused||this.guided)return;if(document.pointerLockElement===canvas){this.dragDistance+=Math.abs(e.movementX)+Math.abs(e.movementY);this.turn(e.movementX,e.movementY);}else if(this.pointer?.id===e.pointerId){this.dragDistance+=Math.abs(e.clientX-this.pointer.x)+Math.abs(e.clientY-this.pointer.y);this.turn(e.clientX-this.pointer.x,e.clientY-this.pointer.y);this.pointer={id:e.pointerId,x:e.clientX,y:e.clientY};}});
  canvas.addEventListener('pointerup',()=>{this.pointer=null;});canvas.addEventListener('pointercancel',()=>{this.pointer=null;});
  canvas.addEventListener('dblclick',()=>{if(this.active&&!this.guided&&!this.paused)canvas.requestPointerLock()?.catch(()=>{});});
  canvas.addEventListener('click',e=>{if(this.dragDistance>6)return;if(this.active&&!this.paused&&this.nearest){const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2),this.camera);const g=this.artifacts.get(this.nearest);if(g&&ray.intersectObject(g,true).length)this.onActivate(this.nearest);}});
  window.addEventListener('keydown',e=>{if((e.target as HTMLElement).matches('input,textarea,select,button')||this.paused)return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyE'].includes(e.code)){e.preventDefault();this.keys.add(e.code);if(e.code==='KeyE'&&this.nearest)this.onActivate(this.nearest);}});
  window.addEventListener('keyup',e=>this.keys.delete(e.code));window.addEventListener('blur',()=>{this.keys.clear();this.pointer=null;});
  document.addEventListener('visibilitychange',()=>{this.keys.clear();this.lastTime=performance.now();});
  window.addEventListener('resize',()=>{this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.frameReading(document.body.classList.contains('reading'));this.renderer.setSize(innerWidth,innerHeight);});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.paused=true;document.dispatchEvent(new CustomEvent('museum-render-error'));});
 }
 cases:MuseumCase[];
 async init(){
  this.kit=(await new GLTFLoader().loadAsync(import.meta.env.BASE_URL+'assets/museum-kit.glb')).scene;
  this.scene.add(new T.HemisphereLight(0xeaf0ee,0x615c4e,1.7));
  this.sun=new T.DirectionalLight(0xffe3ab,3.1);this.sun.position.set(-27,39,8);this.sun.target.position.set(0,0,24);this.scene.add(this.sun,this.sun.target);
  this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-42,right:42,top:44,bottom:-44,near:1,far:105});this.sun.shadow.bias=-.0003;this.sun.shadow.normalBias=.035;
  const pmrem=new T.PMREMGenerator(this.renderer);const env=new RoomEnvironment();this.scene.environment=pmrem.fromScene(env,.05).texture;env.dispose();pmrem.dispose();this.scene.environmentIntensity=.25;
  this.addMaterialDetail();this.buildExterior();this.buildHall();this.buildRoomShells();this.mergeStatic(this.scene);this.loadRoom(this.cases[0]);
  await this.renderer.compileAsync(this.scene,this.camera);this.tick();
 }
 addMaterialDetail(){
  const stoneMap=this.surfaceTexture('stone'),woodMap=this.surfaceTexture('wood');
  for(const m of [stone,pale,trim]){m.map=stoneMap;m.bumpMap=stoneMap;m.bumpScale=.006;m.needsUpdate=true;}
  wood.map=woodMap;wood.bumpMap=woodMap;wood.bumpScale=.018;wood.needsUpdate=true;
 }
 surfaceTexture(kind:string){const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d')!;const im=ctx.createImageData(256,256);let seed=3729;for(let y=0;y<256;y++)for(let x=0;x<256;x++){seed=(seed*1664525+1013904223)>>>0;const noise=seed/4294967296;const vein=Math.sin(x*.065+Math.sin(y*.025)*4+Math.sin(x*.013+y*.02)*5);const grain=Math.sin(x*.3+Math.sin(y*.03+x*.025)*3);const v=kind==='wood'?194+grain*13+noise*12:242+noise*4+Math.pow(Math.abs(vein),18)*3;const i=(y*256+x)*4;im.data[i]=v;im.data[i+1]=v;im.data[i+2]=v;im.data[i+3]=255;}ctx.putImageData(im,0,0);const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(2,2);t.colorSpace=T.SRGBColorSpace;return t;}
 mergeStatic(root:T.Object3D){root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert();const buckets=new Map<string,{mat:T.Material;geos:T.BufferGeometry[];objects:T.Mesh[]}>();root.traverse(o=>{let ancestor:T.Object3D|null=o;while(ancestor&&ancestor!==root){if(!ancestor.visible)return;ancestor=ancestor.parent;}if(!(o instanceof T.Mesh)||o instanceof T.InstancedMesh||Array.isArray(o.material)||o.material.transparent||this.doors.some(d=>o.parent===d))return;const mat=o.material;if(!(mat instanceof T.MeshStandardMaterial))return;const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(inverse.clone().multiply(o.matrixWorld));for(const key of Object.keys(g.attributes))if(!['position','normal','uv'].includes(key))g.deleteAttribute(key);if(!g.getAttribute('uv'))g.setAttribute('uv',new T.BufferAttribute(new Float32Array(g.getAttribute('position').count*2),2));let b=buckets.get(mat.uuid);if(!b){b={mat,geos:[],objects:[]};buckets.set(mat.uuid,b);}b.geos.push(g);b.objects.push(o);});for(const b of buckets.values()){const geo=mergeGeometries(b.geos);if(!geo)continue;const mesh=new T.Mesh(geo,b.mat);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);b.objects.forEach(o=>o.removeFromParent());b.geos.forEach(g=>g.dispose());}}
 frameReading(reading:boolean){if(reading&&innerWidth>800)this.camera.setViewOffset(innerWidth,innerHeight,innerWidth*.17,0,innerWidth,innerHeight);else this.camera.clearViewOffset();this.camera.updateProjectionMatrix();}
 box(w:number,h:number,d:number,x:number,y:number,z:number,mat:T.Material=stone,parent:T.Object3D=this.scene,solid=false){const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);if(solid)this.solids.push({x,z,w:w+.55,d:d+.55});return m;}
 model(name:string,x:number,y:number,z:number,parent:T.Object3D=this.scene,scale=1,rot=0){const proto=this.kit.getObjectByName(name);if(!proto)throw new Error('Mangler modell: '+name);const m=proto.clone(true);m.position.set(x,y,z);m.rotation.y=rot;m.scale.multiplyScalar(scale);m.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;}});parent.add(m);return m;}
 label(text:string,sub:string,x:number,y:number,z:number,width=4,rot=0,color='#d9c695',parent:T.Object3D=this.scene){const cv=document.createElement('canvas');cv.width=1024;cv.height=256;const ctx=cv.getContext('2d')!;ctx.fillStyle=color;ctx.textAlign='center';ctx.font='42px Georgia';ctx.fillText(text,512,100,980);ctx.font='23px Segoe UI';ctx.fillText(sub,512,167,970);const tx=new T.CanvasTexture(cv);tx.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(width,width/4),new T.MeshBasicMaterial({map:tx,transparent:true,depthWrite:false,side:T.DoubleSide}));m.position.set(x,y,z);m.rotation.y=rot;parent.add(m);return m;}
 buildExterior(){
  const sky=new Sky();sky.scale.setScalar(380);this.scene.add(sky);const u=sky.material.uniforms;u.turbidity.value=5;u.rayleigh.value=1.6;u.mieCoefficient.value=.006;u.mieDirectionalG.value=.78;u.sunPosition.value.copy(this.sun.position);
  this.box(190,.3,220,0,-.52,40,new T.MeshStandardMaterial({color:0x697768,roughness:1}));
  for(let i=0;i<20;i++){const side=i%2?1:-1;const hill=new T.Mesh(new T.SphereGeometry(1,14,9),new T.MeshStandardMaterial({color:i%2?0x566559:0x758277,roughness:1}));hill.scale.set(18+i%5*4,7+i%4*3,24);hill.position.set(side*(62+i%4*9),0,i*12-35);this.scene.add(hill);}
  const trunks=new T.InstancedMesh(new T.CylinderGeometry(.22,.3,4,6),wood,40);const leaves=new T.InstancedMesh(new T.ConeGeometry(2.1,7,8),new T.MeshStandardMaterial({color:0x445b49,roughness:1}),40);const d=new T.Object3D();
  for(let i=0;i<40;i++){d.position.set((i%2?1:-1)*(36+i%7*2),1.6,Math.floor(i/2)*6-20);d.updateMatrix();trunks.setMatrixAt(i,d.matrix);d.position.y=6;d.updateMatrix();leaves.setMatrixAt(i,d.matrix);}this.scene.add(trunks,leaves);
  // Visible terrace and low parapet establish a bounded building in a landscape.
  this.box(58,.28,80,0,-.15,24,pale);this.box(58,.6,.55,0,.3,-16,trim);
  for(let i=0;i<3;i++)this.box(12+i*1.2,.15,1.1,0,-.08-i*.12,-12-i*.8,pale);
 }
 buildHall(){
  const tiles=new T.InstancedMesh(new T.BoxGeometry(1.98,.12,1.98),pale,300);const tiles2=new T.InstancedMesh(new T.BoxGeometry(1.98,.12,1.98),new T.MeshStandardMaterial({color:0xb3ad9d,roughness:.68}),300);const d=new T.Object3D();let a=0,b=0;
  for(let x=-9;x<=9;x+=2)for(let z=-7;z<=51;z+=2){d.position.set(x,-.03,z);d.updateMatrix();((x+z)%4===0?tiles:tiles2).setMatrixAt((x+z)%4===0?a++:b++,d.matrix);}tiles.count=a;tiles2.count=b;tiles.receiveShadow=tiles2.receiveShadow=true;this.scene.add(tiles,tiles2);
  for(const x of [-7.3,7.3])this.box(.06,.015,60,x,.055,22,brass);
  // Repeated Blender columns use instancing for every shared primitive.
  const columns:T.Object3D[]=[];for(const x of [-7.6,7.6])for(const z of [-3,3,15,21,33,39,51]){const o=this.model('column',x,0,z);columns.push(o);this.solids.push({x,z,w:1.7,d:1.7});}this.instanceObjects(columns);
  for(const side of [-1,1]){
   // Six-metre portal gaps alternate with solid masonry and high windows.
   for(const [z,len] of [[-3,12],[18,12],[36,12],[51,6]])this.box(.65,6.2,len,side*10,3.1,z,stone,this.scene,true);
   for(const z of [9,27,45]){const arch=this.model('arch',side*10,4.1,z,this.scene,1,Math.PI/2);for(const dz of [-2.7,2.7])this.box(.7,4.1,.45,side*10,2.05,z+dz,trim,this.scene,true);this.box(.6,2.3,6,side*10,8.3,z,stone);}
   for(const z of [-4,4,14,22,32,40,50]){
    this.box(.65,1.0,6,side*10,6.7,z,pale);this.box(.65,.9,6,side*10,11.55,z,stone);
    for(const dz of [-2.6,0,2.6])this.box(.25,3.9,.11,side*10,9.1,z+dz,brass);
    this.box(.25,.1,5.3,side*10,9,z,brass);
   }
   this.box(.9,.28,61,side*9.95,6.2,22,pale);this.box(.8,.22,61,side*9.95,11.95,22,pale);
  }
  // Coffered barrel roof around a long glass skylight.
  for(let z=-7;z<53;z+=6){
   for(const side of [-1,1])for(let j=0;j<7;j++){const angle=.10+j*.16;const roof=this.box(.3,1.67,5.86,side*Math.cos(angle)*10,11.8+Math.sin(angle)*5,z+2.5,pale);roof.rotation.z=side*Math.atan(2*Math.tan(angle));}
   const rib=new T.Mesh(new T.TorusGeometry(10,.16,6,64,Math.PI),trim);rib.scale.y=.5;rib.position.set(0,11.8,z);this.scene.add(rib);
   this.box(7,.12,.1,0,16.5,z,brass);
  }
  for(const x of [-3.4,0,3.4])this.box(.12,.15,60,x,16.5,22,brass);
  for(const side of [-1,1])for(const z of [-4,4,14,22,32,40,50]){const glass=new T.Mesh(new T.PlaneGeometry(5.2,3.7),new T.MeshPhysicalMaterial({color:0xb3d6dd,transparent:true,opacity:.07,roughness:.12,metalness:.1,side:T.DoubleSide,depthWrite:false}));glass.position.set(side*10,9.1,z);glass.rotation.y=Math.PI/2;this.scene.add(glass);}
  this.box(20,17,.7,0,8.5,54,stone,this.scene,true);
  this.label('LA MÉMOIRE PUBLIQUE','HUKOMMELSE · RETTIGHETER · TILLIT',0,8.4,53.6,10,Math.PI,'#4e4839');
  this.label('Hva skjer når samfunnet mister sporene?','ARKIVMUSEET',0,5.8,53.55,12,Math.PI,'#4e4839');
  // Rotunda: round inlay and a sculptural stack of unmarked leaves.
  const disc=new T.Mesh(new T.CylinderGeometry(3.8,3.8,.03,96),slate);disc.position.set(0,.07,20);disc.receiveShadow=true;this.scene.add(disc);
  for(const r of [3.55,3.72]){const ring=new T.Mesh(new T.TorusGeometry(r,.022,6,96),brass);ring.rotation.x=Math.PI/2;ring.position.set(0,.1,20);this.scene.add(ring);}
  this.box(1.65,.8,1.6,0,.5,20,pale,this.scene,true);this.model('memory',0,.91,20,this.scene,1.1);this.solids.push({x:0,z:20,w:2.4,d:2.4});
  this.label('SPOR','Det som gjør det mulig å vite.',0,.69,19.18,1.5,Math.PI);
  for(const x of [-5,5])for(const z of [18,35])this.model('desk',x,0,z,this.scene,.65);
  // Vestibule and opening oak doors.
  for(const x of [-6.8,6.8])this.box(6.4,10,.9,x,5,-6,stone,this.scene,true);this.box(7.2,3.2,1,0,8.4,-6,stone);
  for(const side of [-1,1]){const hinge=new T.Group();hinge.position.set(side*3.45,0,-6);this.scene.add(hinge);this.box(3.4,6.8,.2,-side*1.7,3.4,0,wood,hinge);for(const y of [1.7,5])this.box(2.95,2.65,.23,-side*1.7,y,0,trim,hinge);this.box(.07,.7,.32,-side*3.1,3.1,-.1,brass,hinge);this.doors.push(hinge);}
  // Start screen reveals the hall through the slightly open doorway.
  this.doors[0].rotation.y=-1.23;this.doors[1].rotation.y=1.23;
 }
 instanceObjects(objects:T.Object3D[]){const buckets=new Map<T.BufferGeometry,{mat:T.Material|T.Material[];matrices:T.Matrix4[]}>();for(const o of objects){o.updateMatrixWorld(true);o.traverse(m=>{if(m instanceof T.Mesh){let b=buckets.get(m.geometry);if(!b){b={mat:m.material,matrices:[]};buckets.set(m.geometry,b);}b.matrices.push(m.matrixWorld.clone());}});this.scene.remove(o);}for(const [g,b] of buckets){const m=new T.InstancedMesh(g,b.mat,b.matrices.length);b.matrices.forEach((v,i)=>m.setMatrixAt(i,v));m.castShadow=true;m.receiveShadow=true;this.scene.add(m);}}
 buildRoomShells(){
  const places=[...this.cases.map(c=>({id:c.id,position:c.position,title:c.title,wing:c.wing,accent:c.accent})),{id:'leader',position:[19,45],title:'Det neste arkivet skapes nå',wing:'V · Lederens rom',accent:'#d6b675'}];
  for(const c of places){const [x,z]=c.position;const side=Math.sign(x);const group=new T.Group();this.rooms.set(c.id,group);this.scene.add(group);
   this.box(18,.16,16,x,0,z,wood,group);this.box(18,7.2,.65,x,3.6,z-8,slate,group,true);this.box(18,7.2,.65,x,3.6,z+8,slate,group,true);
   this.box(.65,7.2,16,side*28,3.6,z,slate,group,true);this.box(18,.3,16,x,7.3,z,slate,group);
   this.box(.12,4.5,12,side*27.6,2.9,z,slate,group);
   this.label(c.wing.split(' · ')[0],c.wing.split(' · ')[1]||'',side*9.85,3.25,z,4,side>0?-Math.PI/2:Math.PI/2,'#dbcba1');
   this.label(c.title,c.wing,side*27.49,5.55,z,8,side>0?-Math.PI/2:Math.PI/2,c.accent,group);
   const light=new T.PointLight(0xffdfa6,55,19,2);light.position.set(x,4.4,z+1);group.add(light);
   this.box(.1,.045,13,side*27.42,.2,z,brass,group);
   const strip=new T.Mesh(new T.BoxGeometry(.05,.08,12),new T.MeshBasicMaterial({color:c.accent}));strip.position.set(side*27.4,6.5,z);group.add(strip);
  }
 }
 loadRoom(c:MuseumCase){if(this.loaded.has(c.id))return;this.loaded.add(c.id);const [x,z]=c.position;const group=new T.Group();group.position.set(x,0,z);this.artifacts.set(c.id,group);this.rooms.get(c.id)!.add(group);const side=Math.sign(x);
  // Turn installations toward the entrance and leave a clear circulation zone.
  group.rotation.y=side>0?-Math.PI/2:Math.PI/2;
  this.box(4.7,.25,2.8,0,.12,0,trim,group);this.solids.push({x,z,w:3.3,d:5.2});
  if(c.visualConcept==='journal'||c.visualConcept==='timeline'){
   this.model('desk',0,.25,0,group);const posts=new T.Group();group.add(posts);
   for(let i=0;i<9;i++){const f=this.model('folder',-1.1+(i%3)*1.05,1.4+Math.floor(i/3)*.5,-.5,posts,.8);f.rotation.x=Math.PI*.32;if(i%3===1){f.visible=false;const outline=new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(.4,.03,.5)),new T.LineBasicMaterial({color:c.accent,transparent:true,opacity:.65}));outline.position.copy(f.position);posts.add(outline);}}
   if(c.visualConcept==='timeline'){this.box(3.5,.04,.04,0,2.4,-.8,brass,group);this.label('DATO →','Når?  ·  Hva?  ·  Hvem?',0,2.95,-.8,3.3,0,c.accent,group);}else this.label(c.displayMetric?.value??'JOURNAL',c.displayMetric?.label??'Spor av virksomhetens arbeid',0,2.9,-.8,3.5,0,c.accent,group);
   for(const a of [-2.8,2.8])this.model('cabinet',a,.2,-1.8,group,.8);
  }else if(c.visualConcept==='server'){
   this.model('server',-.9,.25,0,group);this.model('server',.9,.25,0,group);
   for(let i=0;i<7;i++){const bar=this.box(.65,.024,.04,-.9,2.7-i*.3,.44,new T.MeshBasicMaterial({color:i<3?0x84babe:0x1a2e2d}),group);bar.userData.signal=true;}
   this.label(c.eventDate.split('–')[0]+'  —  ?','Systemet avsluttes. Kan innholdet leses?',0,3.65,0,4.4,0,c.accent,group);
   const wire=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(-.8,.27,.7),new T.Vector3(-.8,.27,1.7),new T.Vector3(.6,.27,1.7)]),new T.LineBasicMaterial({color:c.accent}));group.add(wire);
  }else if(c.visualConcept==='desk'){
   this.model('desk',0,.25,0,group);this.model('folder',-.8,1.36,.2,group);this.model('folder',.8,1.36,.2,group);
   const outline=new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(.5,.08,.68)),new T.LineBasicMaterial({color:c.accent}));outline.position.set(0,1.43,.2);group.add(outline);
   this.label('INNSYN  →  AVSLAG  →  KLAGE','Hvordan følger dokumentene saken?',0,2.7,-.55,4.4,0,c.accent,group);
  }else{
   this.box(4.3,.18,2.4,0,.37,0,slate,group);
   const geo=new T.CylinderGeometry(.9,.9,3.8,32,1,true,0,Math.PI);const shell=new T.Mesh(geo,new T.MeshStandardMaterial({color:0x9b9f97,side:T.DoubleSide,roughness:.9}));shell.rotation.set(0,0,Math.PI/2);shell.position.set(0,.55,0);group.add(shell);
   for(let i=0;i<9;i++){const ring=new T.Mesh(new T.TorusGeometry(.95,.025,5,24,Math.PI),brass);ring.rotation.y=Math.PI/2;ring.position.set(-1.7+i*.43,.6,0);group.add(ring);}
   for(let i=0;i<5;i++){const rock=new T.Mesh(new T.DodecahedronGeometry(.22+i*.012),trim);rock.position.set(.3+i*.2,.65,.1);group.add(rock);}
   this.label('SIKRING · KONTROLL · KUNNSKAP','En teknisk historie om etterprøvbarhet',0,2.7,-.5,4.4,0,c.accent,group);
  }
  this.label('Visuell rekonstruksjon','Ingen dokumenter i installasjonen er originaler.',0,.42,1.43,3.8,0,'#e4d6b7',group);
  this.mergeStatic(group);
  // Simple glazing, no costly screen-space refraction.
  const glass=new T.Mesh(new T.BoxGeometry(4.9,3.6,3),new T.MeshPhysicalMaterial({color:0xc4dfd6,transparent:true,opacity:.055,roughness:.15,metalness:.2,depthWrite:false}));glass.position.y=2.02;group.add(glass);
 }
 loadLeader(){if(this.loaded.has('leader'))return;this.loaded.add('leader');const group=new T.Group();group.position.set(19,0,45);group.rotation.y=-Math.PI/2;this.artifacts.set('leader',group);this.rooms.get('leader')!.add(group);this.model('desk',0,0,0,group,1.4);this.solids.push({x:19,z:45,w:3,d:5});const names=['Teams','E-post','Fagsystem','KI-innhold','Sak / arkiv'];for(let i=0;i<5;i++){this.box(.7,.06,.55,-1.65+i*.82,1.58,0,slate,group);this.label(names[i],'',-1.65+i*.82,2.1,0,.77,0,'#e3d2a7',group);}this.label('OM FEM ÅR','Finnes sporene av denne beslutningen?',0,3.4,-.2,5,0,'#e2c78d',group);}
 start(guided:boolean){this.active=true;this.guided=guided;this.paused=false;this.keys.clear();if(!guided)this.fly(new T.Vector3(0,1.72,1),Math.PI,.02);}
 fly(position:T.Vector3,yaw:number,pitch=0){this.keys.clear();if(this.settings.reduced){this.camera.position.copy(position);this.yaw=yaw;this.pitch=pitch;this.look();return;}this.from.copy(this.camera.position);this.fromYaw=this.yaw;this.fromPitch=this.pitch;this.target=position;this.targetYaw=yaw;this.targetPitch=pitch;this.flight=0;}
 visit(id:string){const c=this.cases.find(c=>c.id===id);if(c)this.loadRoom(c);else this.loadLeader();const [x,z]=c?.position??[19,45];const side=Math.sign(x);this.fly(new T.Vector3(x-side*5.8,1.9,z),side>0?-Math.PI/2:Math.PI/2,-.01);}
 home(){this.fly(new T.Vector3(0,1.72,2),Math.PI,.03);}
 setPaused(p:boolean){this.paused=p;this.keys.clear();this.pointer=null;if(p&&document.pointerLockElement)document.exitPointerLock();}
 turn(x:number,y:number){this.target=null;this.yaw-=x*.002*this.settings.sensitivity;this.pitch=T.MathUtils.clamp(this.pitch-y*.0018*this.settings.sensitivity,-1,1);this.look();}
 look(){this.camera.rotation.set(this.pitch,this.yaw,0,'YXZ');}
 valid(x:number,z:number){const hall=Math.abs(x)<9.65&&z> -10&&z<53.3;const wing=Math.abs(x)<27.4&&Math.abs(x)>9&&[9,27,45].some(v=>Math.abs(z-v)<7.4);if(!(hall||wing))return false;return !this.solids.some(b=>Math.abs(x-b.x)<b.w/2&&Math.abs(z-b.z)<b.d/2);}
 setStage(id:string,step:number){const g=this.artifacts.get(id);if(!g)return;g.traverse(o=>{if(o.userData.signal&&(o instanceof T.Mesh)){(o.material as T.MeshBasicMaterial).color.setHex(step>=1?0x1a2e2d:0x84babe);}});}
 tick=()=>{if(this.disposed)return;requestAnimationFrame(this.tick);const now=performance.now(),dt=Math.min((now-this.lastTime)/1000,.05);this.lastTime=now;if(document.hidden)return;
  if(!this.paused){
   if(this.active){this.doors[0].rotation.y=T.MathUtils.damp(this.doors[0].rotation.y,-1.55,1.2,dt);this.doors[1].rotation.y=T.MathUtils.damp(this.doors[1].rotation.y,1.55,1.2,dt);}
   if(this.target){this.flight+=dt;const t=Math.min(this.flight/2.8,1),e=t*t*(3-2*t);this.camera.position.lerpVectors(this.from,this.target,e);let diff=(this.targetYaw-this.fromYaw)%(Math.PI*2);if(diff>Math.PI)diff-=Math.PI*2;if(diff<-Math.PI)diff+=Math.PI*2;this.yaw=this.fromYaw+diff*e;this.pitch=T.MathUtils.lerp(this.fromPitch,this.targetPitch,e);this.look();if(t===1)this.target=null;}
   this.moving=false;
   if(this.active&&!this.guided&&!this.target){const f=Number(this.keys.has('KeyW')||this.keys.has('ArrowUp'))-Number(this.keys.has('KeyS')||this.keys.has('ArrowDown'));const s=Number(this.keys.has('KeyD'))-Number(this.keys.has('KeyA'));if(this.keys.has('ArrowLeft'))this.yaw+=dt*1.2;if(this.keys.has('ArrowRight'))this.yaw-=dt*1.2;this.look();const len=Math.hypot(f,s)||1;const dx=(-Math.sin(this.yaw)*f+Math.cos(this.yaw)*s)*dt*2.65/len,dz=(-Math.cos(this.yaw)*f-Math.sin(this.yaw)*s)*dt*2.65/len;
    if(this.valid(this.camera.position.x+dx,this.camera.position.z))this.camera.position.x+=dx;if(this.valid(this.camera.position.x,this.camera.position.z+dz))this.camera.position.z+=dz;this.moving=!!(f||s);if(this.moving&&now-this.stepAt>570){this.onStep();this.stepAt=now;}}
   if(!this.settings.reduced)this.sun.position.z=8+Math.sin((now-this.startTime)/600000)*9;
  }
  if(this.active){let nearest:string|null=null;let min=8;for(const c of this.cases){const dist=Math.hypot(c.position[0]-this.camera.position.x,c.position[1]-this.camera.position.z);if(dist<22)this.loadRoom(c);if(this.artifacts.has(c.id))this.artifacts.get(c.id)!.visible=dist<37;if(dist<min){nearest=c.id;min=dist;}}if(Math.hypot(19-this.camera.position.x,45-this.camera.position.z)<22)this.loadLeader();if(Math.hypot(19-this.camera.position.x,45-this.camera.position.z)<min)nearest='leader';if(nearest!==this.nearest){this.nearest=nearest;this.onNear(nearest);}}
  this.renderer.render(this.scene,this.camera);this.frameCount++;if(dt>0)this.fps=this.fps*.97+(1/dt)*.03;
 };
 diagnostics(){return {position:this.camera.position.toArray(),yaw:this.yaw,fps:Math.round(this.fps),drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,rooms:[...this.loaded],frameCount:this.frameCount,paused:this.paused};}
}
function sixty(){return 60;}
