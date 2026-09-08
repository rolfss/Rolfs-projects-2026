import {RoomStoryWorld} from './room-world';
import * as T from 'three';
import {galleryRooms,itemsForCase,panelCanvas} from './gallery';
import type {GalleryItem} from './gallery';
import {wallPlacement,worldPoint,viewAngles} from './gallery-layout';
import type {MuseumCase} from './types';

export class GalleryWorld{
  targets:T.Mesh[]=[];groups=new Map<string,T.Group>();items=new Map<string,GalleryItem>();
  private textures=new Map<string,T.Texture>();
  private loader=new T.TextureLoader();
  private chapters:RoomStoryWorld;
  constructor(private scene:T.Scene,private cases:MuseumCase[]){this.chapters=new RoomStoryWorld(scene,cases);}
  private texture(path:string){let tx=this.textures.get(path);if(!tx){tx=this.loader.load(import.meta.env.BASE_URL+path,undefined,undefined,()=>{document.dispatchEvent(new CustomEvent('gallery-image-error',{detail:path}));});tx.colorSpace=T.SRGBColorSpace;this.textures.set(path,tx);}return tx;}
  private box(parent:T.Object3D,w:number,h:number,d:number,x:number,y:number,z:number,color:string,metalness=0){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color,metalness,roughness:.58}));mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
  private caption(item:GalleryItem,accent:string){const c=document.createElement('canvas');c.width=1536;c.height=270;const ctx=c.getContext('2d')!;ctx.fillStyle='#f6eedc';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle=accent;ctx.fillRect(0,0,16,c.height);ctx.fillStyle='#172932';ctx.font='bold 42px Arial';ctx.fillText(item.kicker,54,68,1428);ctx.font='37px Georgia';ctx.fillText(item.title,54,127,1428);ctx.font='28px Arial';ctx.fillText(item.credit+' · Åpne for bildetekst og originalkilde',54,205,1428);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;}
  buildRoom(c:MuseumCase){
    if(this.groups.has(c.id))return;this.chapters.build(c.id);
    const theme=galleryRooms.find(r=>r.caseId===c.id)!;const room=new T.Group();room.position.set(c.position[0],0,c.position[1]);room.rotation.y=Math.sign(c.position[0])>0?-Math.PI/2:Math.PI/2;this.scene.add(room);this.groups.set(c.id,room);
    for(const item of itemsForCase(c)){
      this.items.set(item.id,item);const p=wallPlacement(item.slot,item.kind==='document');const frame=new T.Group();frame.position.fromArray(p.position);frame.rotation.y=p.yaw;room.add(frame);
      // Real exhibit frames and mat boards; images keep their original proportions.
      this.box(frame,p.width+.2,p.height+.2,.12,0,0,-.025,'#a8894c',.65);
      this.box(frame,p.width,p.height,.025,0,0,.045,item.kind==='photo'?'#f2eddf':'#172632');
      const tx=item.image?this.texture(item.image):new T.CanvasTexture(panelCanvas(item,theme.accent));tx.colorSpace=T.SRGBColorSpace;
      const ratio=item.image?(item.imageWidth!/item.imageHeight!):1536/980;
      const w=Math.min(p.width-.2,(p.height-.2)*ratio),h=w/ratio;
      const plane=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tx,toneMapped:false}));plane.position.z=.069;plane.userData.galleryId=item.id;frame.add(plane);this.targets.push(plane);
      const label=new T.Mesh(new T.PlaneGeometry(p.width,.78),new T.MeshBasicMaterial({map:this.caption(item,theme.accent),toneMapped:false}));label.position.set(0,-p.height/2-.54,.02);label.userData.galleryId=item.id;frame.add(label);this.targets.push(label);
      // A small warm picture light gives the wall the rhythm of an actual gallery.
      this.box(frame,p.width*.7,.055,.22,0,p.height/2+.23,.13,'#d5b56b',.6);
      const strip=new T.Mesh(new T.PlaneGeometry(p.width*.68,.032),new T.MeshBasicMaterial({color:'#fff4c8',toneMapped:false}));strip.position.set(0,p.height/2+.2,.245);frame.add(strip);
    }
  }
  buildHall(){
    // Suspended colour fields mark the five galleries without obscuring the nave.
    for(const [i,c] of this.cases.entries()){
      const theme=galleryRooms.find(r=>r.caseId===c.id)!;const side=Math.sign(c.position[0]);
      const canvas=document.createElement('canvas');canvas.width=640;canvas.height=1200;const ctx=canvas.getContext('2d')!;
      ctx.fillStyle=theme.wall;ctx.fillRect(0,0,640,1200);ctx.fillStyle=theme.accent;ctx.font='190px Georgia';ctx.textAlign='center';ctx.fillText(String(i+1).padStart(2,'0'),320,280);
      ctx.font='42px Arial';const names:Record<string,string[]>= {osen:['OFFENTLIGHET'],tokke:['HUKOMMELSE'],innsyn:['INNSYN'],hanekleiv:['SIKKERHET'],npe:['SAMMENHENG']};ctx.fillText(names[c.id][0],320,790,590);ctx.font='32px Arial';ctx.fillText('ARKIVMUSEET',320,1050);
      const tx=new T.CanvasTexture(canvas);tx.colorSpace=T.SRGBColorSpace;const banner=new T.Mesh(new T.PlaneGeometry(2.3,4.3),new T.MeshBasicMaterial({map:tx,side:T.DoubleSide,toneMapped:false}));banner.position.set(side*6.4,8.25,c.position[1]);banner.rotation.y=side>0?-Math.PI/2:Math.PI/2;this.scene.add(banner);
      const rail=new T.Mesh(new T.BoxGeometry(.07,.025,12),new T.MeshBasicMaterial({color:theme.accent,toneMapped:false}));rail.position.set(side*8.55,.07,c.position[1]);this.scene.add(rail);
    }
    // Four genuine images also welcome visitors from the main hall.
    for(const [i,c] of this.cases.filter(c=>c.image).entries()){
      const side=i%2?1:-1,z=i<2?-.5:35.5,photo=c.image!;const w=Math.min(3.6,3.4*photo.width/photo.height),h=w*photo.height/photo.width;
      const group=new T.Group();group.position.set(side*9.62,3.35,z);group.rotation.y=side>0?-Math.PI/2:Math.PI/2;this.scene.add(group);this.box(group,w+.16,h+.16,.08,0,0,-.025,'#a8894c',.65);
      const plane=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:this.texture(photo.src),toneMapped:false}));plane.position.z=.025;group.add(plane);plane.userData.galleryId=c.id+'-hall';this.targets.push(plane);
      this.items.set(c.id+'-hall',{id:c.id+'-hall',caseId:c.id,kind:photo.kind==='photo'?'photo':'document',title:c.title,kicker:c.organization,text:c.shortNarrative.text,caption:photo.caption,credit:photo.credit,url:photo.sourceUrl,image:photo.src,imageWidth:photo.width,imageHeight:photo.height,license:photo.license,licenseUrl:photo.licenseUrl,slot:'back-left'});
    }
  }
  focus(itemId:string){const item=this.items.get(itemId);if(!item)return null;const c=this.cases.find(c=>c.id===item.caseId)!;const p=wallPlacement(item.slot,item.kind==='document');const from=worldPoint(p.view,c.position),to=worldPoint(p.target,c.position);return {from,...viewAngles(from,to),width:p.width,height:p.height,distance:Math.hypot(...from.map((v,i)=>v-to[i]))};}
  pick(ray:T.Raycaster){const visible=(object:T.Object3D)=>{let node:T.Object3D|null=object;while(node){if(!node.visible)return false;node=node.parent;}return true;};const hit=ray.intersectObjects(this.targets,false).find(h=>h.distance<15&&visible(h.object));if(!hit)return;const blocker=ray.intersectObjects(this.scene.children,true).find(h=>visible(h.object)&&h.object instanceof T.Mesh&&!(Array.isArray(h.object.material)?h.object.material.every(m=>m.transparent):h.object.material.transparent));return !blocker||blocker.distance>=hit.distance-.02?hit.object.userData.galleryId as string:undefined;}
  update(x:number,z:number){for(const [id,group] of this.groups){const c=this.cases.find(c=>c.id===id)!;group.visible=Math.hypot(x-c.position[0],z-c.position[1])<38;}}
}
