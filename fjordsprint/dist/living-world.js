import * as THREE from './vendor/three.module.js';
import {groundHeight} from './terrain.js';

// Original low-poly scenery. Everything static is instanced; only the handful of
// grazing heads near the driver receive matrix updates. No per-frame allocation.
const TAU=Math.PI*2;
const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.93,flatShading:true,...extra});
function rng(seed=741){let n=Number(seed)>>>0;return()=>{n=(1664525*n+1013904223)>>>0;return n/4294967296;};}
function shapes(){return{box:new THREE.BoxGeometry(1,1,1),ball:new THREE.IcosahedronGeometry(1,1),soft:new THREE.IcosahedronGeometry(1,0),pole:new THREE.CylinderGeometry(1,1,1,6),cone:new THREE.ConeGeometry(1,1,7),ring:new THREE.TorusGeometry(1,.075,5,18)};}

export function buildLivingWorld({scene,track,terrainGeometry,seed=741}){
 const random=rng(seed),geo=shapes(),dark=track.config.id==='aurora';
 const root=new THREE.Group();root.name='Norwegian meadows and grazing animals';scene.add(root);
 const mats={stem:material(0x49724b),grass:material(dark?0x6b8570:0x739454),purple:material(0x9877d0,{emissive:0x442b65,emissiveIntensity:dark?.17:.02}),pink:material(0xc88bb4),white:material(0xf6f1d9,{emissive:0xb1b7a3,emissiveIntensity:dark?.10:0}),yellow:material(0xf7ce4f),cow:material(0xeadfd0),patch:material(0x473729),leg:material(0x443c34),pinkNose:material(0x9f7462),wool:material(0xf0ece0),face:material(0x574d42),black:material(0x16222a),wood:material(0x9c805d),hay:material(0xc2a34f),metal:material(0x617c87),water:material(0x649da7,{metalness:.4,roughness:.3}),bell:material(0xe2b75e,{metalness:.5,roughness:.4})};
 const batches=new Map(),temp=new THREE.Object3D(),rootMat=new THREE.Matrix4(),combined=new THREE.Matrix4(),headMat=new THREE.Matrix4(),animRoot=new THREE.Object3D(),headPivot=new THREE.Object3D();
 const animated=[],stats={flowers:0,flowerPatches:0,cows:0,sheep:0,farms:0,drawCalls:0};
 function batch(shape,color){const key=shape+':'+color;let b=batches.get(key);if(!b){b={geometry:geo[shape],material:mats[color],matrices:[],mesh:null};batches.set(key,b);}return b;}
 function part(shape,color,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0,parent=null){temp.position.set(x,y,z);temp.rotation.set(rx,ry,rz,'YXZ');temp.scale.set(sx,sy,sz);temp.updateMatrix();const b=batch(shape,color),index=b.matrices.length,matrix=temp.matrix.clone();if(parent)matrix.premultiply(parent);b.matrices.push(matrix);return{batch:b,index,local:temp.matrix.clone()};}
 function makeRoot(x,y,z,yaw=0,scale=1){temp.position.set(x,y,z);temp.rotation.set(0,yaw,0);temp.scale.setScalar(scale);temp.updateMatrix();return temp.matrix.clone();}
 // Use every centreline segment, including neighbouring hairpins. Scenery must
 // never spill onto a different section of road at a switchback.
 const road=track.samples.map(f=>f.p),clearance=track.config.width*.5+7;
 function roadDistance(x,z){let best=Infinity;for(let i=1;i<road.length;i++){const a=road[i-1],b=road[i],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1))),xx=a.x+dx*t-x,zz=a.z+dz*t-z;const d=xx*xx+zz*zz;if(d<best)best=d;}return Math.sqrt(best);}
 function land(x,z,margin=0){const y=groundHeight(terrainGeometry,x,z);if(y<2||roadDistance(x,z)<clearance+margin)return null;return y;}
 function slope(x,z,r=3){const y=groundHeight(terrainGeometry,x,z);return Math.max(Math.abs(groundHeight(terrainGeometry,x+r,z)-y),Math.abs(groundHeight(terrainGeometry,x-r,z)-y),Math.abs(groundHeight(terrainGeometry,x,z+r)-y),Math.abs(groundHeight(terrainGeometry,x,z-r)-y))/r;}
 function flower(x,z,alpine=false){const y=land(x,z);if(y===null||slope(x,z,1)>1)return;const kind=random(),height=(alpine?.28:.50)+random()*(alpine?.3:.8),yaw=random()*TAU;
  part('pole','stem',x,y+height*.5,z,.045,height,.045);part('soft','grass',x,y+.16,z,.26,.20,.28,0,yaw,.3);
  if(!alpine&&kind<.35){for(let i=0;i<3;i++)part('soft','purple',x,y+height+.12+i*.19,z,.20-i*.04,.28-i*.035,.20-i*.04,0,yaw,0);}
  else if(kind<.67){part('soft','yellow',x,y+height,z,.12,.08,.12,0,yaw,0);for(let j=0;j<5;j++){const a=j*TAU/5+yaw;part('soft','white',x+Math.cos(a)*.18,y+height-.015,z+Math.sin(a)*.18,.19,.065,.10,0,-a,0);}}
  else{part('soft',alpine&&kind>.86?'pink':'yellow',x,y+height,z,.23,.10,.23,0,yaw,0);part('soft','yellow',x,y+height+.06,z,.07,.045,.07);}
  stats.flowers++;
 }
 function flowerPatch(s,side,radius=4.2){const f=track.at(s),offset=side*(clearance+3+random()*17),cx=f.p.x+f.r.x*offset,cz=f.p.z+f.r.z*offset,cy=land(cx,cz);if(cy===null||slope(cx,cz)>1)return;
  const alpine=cy>300||track.config.id==='pass'&&cy>255,count=alpine?8:15;stats.flowerPatches++;
  for(let j=0;j<count;j++){const a=random()*TAU,r=Math.sqrt(random())*radius;flower(cx+Math.cos(a)*r,cz+Math.sin(a)*r,alpine);}
  for(let j=0;j<7;j++){const x=cx+(random()-.5)*radius*2,z=cz+(random()-.5)*radius*2,y=land(x,z);if(y!==null)part('soft','grass',x,y+.09,z,.45+random()*.65,.2,.45+random()*.65,0,random()*TAU,0);}
 }
 // Flowers occur in irregular drifts instead of a uniform strip or a forest of
 // oversized lupins; the high pass changes to low daisies and flowering heath.
 for(let s=35;s<track.length-25;s+=30+random()*22)flowerPatch(s,random()<.5?-1:1);

 function animal(kind,x,z,yaw,scale,s,animate){const y=land(x,z,1);if(y===null||slope(x,z,2)>.37)return false;const isCow=kind==='cow',base=makeRoot(x,y+.03,z,yaw,scale),bodyY=isCow?1.22:.91;
  part('ball',isCow?'cow':'wool',0,bodyY,0,isCow?.75:.63,isCow?.72:.62,isCow?1.24:.91,0,0,0,base);
  // Separate lobes make the sheep read as wool rather than a smooth white ball.
  if(!isCow)for(const v of [[-.32,1.08,-.40],[.32,1.09,-.4],[-.34,1.02,.4],[.32,1.08,.4],[0,1.35,0]])part('soft','wool',...v,.46,.37,.50,0,0,0,base);
  else for(const v of [[-.61,1.29,-.35],[.60,1.38,.35],[.05,1.70,-.35]])part('soft','patch',...v,.25,.38,.50,0,0,0,base);
  for(const side of [-1,1])for(const front of [-1,1]){const lx=side*(isCow?.46:.37),lz=front*(isCow?.78:.54),wx=x+(Math.cos(yaw)*lx+Math.sin(yaw)*lz)*scale,wz=z+(-Math.sin(yaw)*lx+Math.cos(yaw)*lz)*scale,foot=(groundHeight(terrainGeometry,wx,wz)-y)/scale,legHeight=Math.max(.35,.90-foot);part('pole','leg',lx,foot+legHeight*.5,lz,isCow?.12:.087,legHeight,isCow?.12:.087,0,0,0,base);part('box','leg',lx,foot+.08,lz-.035,isCow?.29:.20,.16,isCow?.33:.24,0,0,0,base);}
  if(isCow)part('soft','pinkNose',0,.75,.4,.38,.22,.43,0,0,0,base);
  // Head parts share their render batches with all other animals, including the
  // animated members. There is no separate draw call per head, leg or wool tuft.
  const hy=isCow?1.43:1.14,hz=isCow?-.99:-.71,headParts=[];headPivot.position.set(0,hy,hz);headPivot.rotation.set(.50,0,0);headPivot.scale.setScalar(1);headPivot.updateMatrix();headMat.multiplyMatrices(base,headPivot.matrix);
  const hp=(shape,color,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0)=>headParts.push(part(shape,color,x,y,z,sx,sy,sz,rx,ry,rz,headMat));
  hp('ball',isCow?'cow':'face',0,0,-.19,isCow?.39:.27,isCow?.46:.33,isCow?.55:.37);
  hp('ball',isCow?'pinkNose':'face',0,-.16,isCow?-.64:-.46,isCow?.34:.22,.21,.18);
  for(const side of [-1,1]){hp('soft',isCow?'cow':'face',side*(isCow?.43:.30),.12,-.17,isCow?.24:.20,.10,.15,0,0,side*.30);hp('ball','black',side*(isCow?.28:.20),.065,-.49,.055,.055,.055);}
  if(isCow){for(const side of [-1,1])hp('cone','white',side*.28,.39,-.02,.09,.28,.09,0,0,-side*.27);hp('cone','bell',0,-.45,.04,.17,.22,.17);}
  else hp('soft','wool',0,.24,-.07,.28,.17,.26);
  const tail=part('pole',isCow?'patch':'wool',0,isCow?1.27:.82,isCow?1.28:.88,.058,isCow?.7:.28,.058,.4,0,.1,base);
  if(animate)animated.push({base,headParts,hy,hz,tail,s,phase:random()*TAU,cow:isCow});
  if(isCow)stats.cows++;else stats.sheep++;return true;
 }
 function farm(s,side,index){const f=track.at(s),offset=side*(clearance+17),cx=f.p.x+f.r.x*offset,cz=f.p.z+f.r.z*offset,y=land(cx,cz,10);if(y===null||slope(cx,cz,10)>.3)return false;
  const alpine=y>300,isCow=!alpine&&track.config.id!=='pass'&&index%2===0,along=f.t.clone().setY(0).normalize(),cross=f.r,halfW=9,halfL=14;
  const point=(u,v)=>({x:cx+cross.x*u+along.x*v,z:cz+cross.z*u+along.z*v});
  // Preflight the whole enclosure, not just its centre. Fences follow rendered
  // terrain; neighbours at hairpins can reject an otherwise plausible pasture.
  for(let u=-halfW;u<=halfW;u+=halfW/2)for(let v=-halfL;v<=halfL;v+=halfL/3){const p=point(u,v);if(land(p.x,p.z)===null||slope(p.x,p.z,2)>.50)return false;}
  const corners=[point(-halfW,-halfL),point(halfW,-halfL),point(halfW,halfL),point(-halfW,halfL)];
  for(let e=0;e<4;e++){const a=corners[e],b=corners[(e+1)%4],len=Math.hypot(b.x-a.x,b.z-a.z),n=Math.ceil(len/4),yaw=Math.atan2(b.x-a.x,b.z-a.z);for(let j=0;j<=n;j++){const t=j/n,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,yy=groundHeight(terrainGeometry,x,z);part('box','wood',x,yy+.76,z,.20,1.6,.20);if(j<n){const nt=(j+1)/n,nx=a.x+(b.x-a.x)*nt,nz=a.z+(b.z-a.z)*nt,ny=groundHeight(terrainGeometry,nx,nz),dy=ny-yy,segment=Math.hypot(len/n,dy);for(const level of [.65,1.22])part('box','wood',(x+nx)/2,(yy+ny)/2+level,(z+nz)/2,.10,.13,segment,-Math.atan2(dy,len/n),yaw);}}}
  let count=0;for(let i=0;i<(isCow?5:7);i++){const p=point((random()-.5)*12,(random()-.5)*21);if(animal(isCow?'cow':'sheep',p.x,p.z,random()*TAU,isCow?1.10:.92+random()*.18,s,animated.length<10&&i<2))count++;}
  if(!alpine){const p=point(6,-10),yy=groundHeight(terrainGeometry,p.x,p.z),base=makeRoot(p.x,yy,p.z,-f.yaw);part('box','metal',0,.48,0,3.2,.75,1.4,0,0,0,base);part('box','water',0,.87,0,2.9,.025,1.14,0,0,0,base);const h=point(-6,10),hy=groundHeight(terrainGeometry,h.x,h.z);part('pole','hay',h.x,hy+.85,h.z,.86,1.6,.86,Math.PI/2,-f.yaw,0);part('pole','hay',h.x+1.6,groundHeight(terrainGeometry,h.x+1.6,h.z)+.65,h.z,.65,1.2,.65,Math.PI/2,-f.yaw,.15);}
  if(count)stats.farms++;return count>0;
 }
 // Search stable, shallow verges. Siting is deterministic for a given course.
 const wanted=track.config.id==='pass'?5:6;let attempts=0;
 while(stats.farms<wanted&&attempts<85){const s=100+(attempts*.61803398875%1)*(track.length-220),side=attempts%2?1:-1;attempts++;if(animated.some(a=>Math.abs(a.s-s)<160))continue;farm(s,side,stats.farms);}
 // A few unfenced mountain sheep make the treeless upper pass feel inhabited.
 if(track.config.id==='pass')for(let i=0;i<9&&stats.sheep<40;i++){const s=track.length*(.26+i*.046),f=track.at(s),side=i%2?1:-1,x=f.p.x+f.r.x*side*(clearance+9+random()*10),z=f.p.z+f.r.z*side*(clearance+9+random()*10);if(f.p.y>295)animal('sheep',x,z,random()*TAU,1,s,animated.length<10);}

 for(const [key,b] of batches){if(!b.matrices.length)continue;const mesh=new THREE.InstancedMesh(b.geometry,b.material,b.matrices.length);mesh.name='Living world '+key;mesh.castShadow=!['stem','grass','purple','pink','yellow','white'].includes(key.split(':')[1]);mesh.receiveShadow=true;for(let i=0;i<b.matrices.length;i++)mesh.setMatrixAt(i,b.matrices[i]);mesh.computeBoundingSphere();b.mesh=mesh;b.matrices=null;root.add(mesh);stats.drawCalls++;}
 // Slow grazing motions use continuous time, with at most 30 matrix uploads per
 // second and only for the nearby herds.
 const dirty=new Set();let lastTime=-1;
 function update(time,carS){if(Math.abs(time-lastTime)<1/30)return;lastTime=time;dirty.clear();for(const a of animated){if(Math.abs(a.s-carS)>190)continue;headPivot.position.set(0,a.hy,a.hz);headPivot.rotation.set(.48+Math.sin(time*.72+a.phase)*.23,Math.sin(time*.33+a.phase)*.11,0);headPivot.updateMatrix();rootMat.multiplyMatrices(a.base,headPivot.matrix);for(const h of a.headParts){combined.multiplyMatrices(rootMat,h.local);h.batch.mesh.setMatrixAt(h.index,combined);dirty.add(h.batch.mesh);}animRoot.position.set(0,a.cow?1.27:.82,a.cow?1.28:.88);animRoot.rotation.set(.4,0,.16+Math.sin(time*1.4+a.phase)*.22);animRoot.scale.set(.058,a.cow?.7:.28,.058);animRoot.updateMatrix();combined.multiplyMatrices(a.base,animRoot.matrix);a.tail.batch.mesh.setMatrixAt(a.tail.index,combined);dirty.add(a.tail.batch.mesh);}for(const m of dirty)m.instanceMatrix.needsUpdate=true;}
 return{root,update,stats};
}

// Original characters, not institutional logos. Both face local -Z. Wings are
// pivots with a neutral zero rotation so the caller can flap them directly.
export function createMascot(kind){
 const g=new THREE.Group(),s=shapes(),owl=kind==='riks'||kind==='Riksrevisjonen',m={gold:material(0xe4b34e,{roughness:.64}),blue:material(0x294c75),teal:material(0x48b6a6),dark:material(0x163447),paper:material(0xfff1cf),white:material(0xf8fbec),eye:material(0x152635),strap:material(0x765139),shine:material(0xffffff,{emissive:0xc2eee2,emissiveIntensity:.15})};
 const add=(parent,shape,mat,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0)=>{const o=new THREE.Mesh(s[shape],m[mat]);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.rotation.set(rx,ry,rz);o.castShadow=true;parent.add(o);return o;};
 const wingL=new THREE.Group(),wingR=new THREE.Group();wingL.name='wing-left';wingR.name='wing-right';g.add(wingL,wingR);g.userData.wings=[wingL,wingR];g.userData.kind=owl?'riks':'arkiv';g.name=owl?'Riksrevisjonen — original flying auditor':'Arkivverket — original archive keeper';
 if(owl){
  add(g,'ball','blue',0,-.13,.07,.91,1.11,.73);add(g,'ball','paper',0,-.32,-.52,.63,.73,.20);
  const head=new THREE.Group();head.name='expressive-head';head.position.set(0,.80,-.04);g.add(head);g.userData.head=head;
  add(head,'ball','gold',0,0,0,1.02,.81,.74);for(const side of [-1,1]){add(head,'cone','gold',side*.66,.65,.07,.29,.58,.24,0,0,-side*.25);add(head,'ball','paper',side*.39,.05,-.64,.41,.43,.13);add(head,'ball','eye',side*.39,.08,-.777,.16,.22,.06);add(head,'ball','shine',side*.35,.16,-.828,.05,.066,.035);add(head,'ring','blue',side*.40,.05,-.80,.44,.46,.56);}
  add(head,'box','blue',0,.05,-.80,.16,.06,.07);add(head,'cone','gold',0,-.29,-.78,.19,.36,.17,-Math.PI/2);
  for(const side of [-1,1]){const wing=side<0?wingL:wingR;wing.position.set(side*.76,.10,.13);add(wing,'ball','gold',side*.81,-.08,.04,1.03,.32,.54,0,0,side*.13);for(let j=0;j<2;j++)add(wing,'soft','blue',side*(1.15+j*.25),-.04,.20+j*.20,.54,.16,.28,0,side*-.30,0);add(g,'cone','gold',side*.33,-1.12,-.16,.18,.43,.25,.4,0,side*.15);}
  add(g,'box','strap',.57,-.05,-.64,.17,1.6,.10,0,0,-.46);add(g,'box','blue',.78,-.62,-.63,.68,.58,.36,0,0,-.13);add(g,'box','gold',.78,-.51,-.84,.25,.14,.05,0,0,-.13);
 }else{
  add(g,'box','teal',0,0,0,1.85,1.55,1.38);add(g,'box','dark',0,.70,0,1.97,.16,1.49);add(g,'box','teal',0,.89,.12,2.02,.21,1.58,0,0,-.06);
  for(let i=0;i<3;i++)add(g,'box','paper',-.48+i*.45,1.08+i*.08,.06,.56,.60,.045,0,0,(i-1)*.18);
  for(const side of [-1,1]){add(g,'ball','white',side*.39,.13,-.718,.26,.30,.07);add(g,'ball','eye',side*.37,.13,-.783,.12,.17,.055);add(g,'ball','shine',side*.34,.20,-.824,.044,.058,.03);add(g,'box','gold',side*.85,-.56,-.73,.20,.19,.075);}
  const smile=new THREE.Mesh(new THREE.TorusGeometry(.28,.045,5,12,Math.PI),m.dark);smile.rotation.z=Math.PI;smile.position.set(0,-.21,-.725);g.add(smile);
  add(g,'box','paper',0,-.55,-.735,.73,.15,.035);add(g,'box','gold',0,.66,-.77,.43,.15,.08);
  for(const side of [-1,1]){const wing=side<0?wingL:wingR;wing.position.set(side*.90,.12,.05);for(let i=0;i<3;i++)add(wing,'box',i===1?'white':'paper',side*(.58+i*.27),.16-i*.13,.12+i*.15,1.08-i*.14,.12,.45,0,side*.15,side*(.30+i*.10));}
 }
 return g;
}
