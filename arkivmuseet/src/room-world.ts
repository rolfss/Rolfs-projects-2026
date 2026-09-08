import * as T from 'three';
import {roomStories,newProgress} from './room-stories';
import {roomScene} from './room-scene';
import type {RoomProgress} from './room-stories';
import type {MuseumCase} from './types';
/** A physical illuminated exhibit board changes with the player's investigation.
 * The inline version remains fully usable on phones, without WebGL, and with a keyboard. */
export class RoomStoryWorld{
 private boards=new Map<string,{mesh:T.Mesh<T.PlaneGeometry,T.MeshBasicMaterial>;version:number}>();
 private progress=new Map<string,{p:RoomProgress;safe:boolean|null}>();
 constructor(private scene:T.Scene,private cases:MuseumCase[]){
  document.addEventListener('museum-story-stage',this.changed as EventListener);
 }
 private changed=(event:CustomEvent<{id:string;p:RoomProgress;safe:boolean|null}>)=>{const {id,p,safe}=event.detail;this.progress.set(id,{p,safe});this.build(id);this.draw(id);};
 build(id:string){if(this.boards.has(id))return;const c=this.cases.find(c=>c.id===id);if(!c)return;
  const group=new T.Group();group.name='chapter-installation-'+id;group.position.set(c.position[0],0,c.position[1]);group.rotation.y=Math.sign(c.position[0])>0?-Math.PI/2:Math.PI/2;
  const frame=new T.Mesh(new T.BoxGeometry(4.34,2.46,.16),new T.MeshStandardMaterial({color:'#a78c50',metalness:.55,roughness:.4}));frame.position.set(0,3.15,.56);group.add(frame);
  const mesh=new T.Mesh(new T.PlaneGeometry(4.2,2.31),new T.MeshBasicMaterial({color:0xffffff,toneMapped:false}));mesh.name='chapter-screen-'+id;mesh.position.set(0,3.15,.65);group.add(mesh);
  // Ahead of the older labels and server faces, not hidden behind them.
  // Two supports make the board a mounted exhibit rather than a floating panel.
  for(const x of [-1.9,1.9]){const post=new T.Mesh(new T.BoxGeometry(.06,1.9,.06),new T.MeshStandardMaterial({color:'#a78c50',metalness:.55,roughness:.4}));post.position.set(x,1.05,.55);group.add(post);}
  this.scene.add(group);this.boards.set(id,{mesh,version:0});this.draw(id);
 }
 private draw(id:string){const b=this.boards.get(id);if(!b)return;const v=++b.version,s=roomStories.find(s=>s.id===id)!,state=this.progress.get(id)??{p:newProgress(),safe:null};
  const image=new Image();const url=URL.createObjectURL(new Blob([roomScene(s,state.p,state.safe).replace('<svg ', '<svg width="1280" height="704" ')],{type:'image/svg+xml;charset=utf-8'}));
  image.onload=()=>{try{if(v!==b.version)return;const tx=new T.Texture(image);tx.colorSpace=T.SRGBColorSpace;tx.needsUpdate=true;b.mesh.material.map?.dispose();b.mesh.material.map=tx;b.mesh.material.needsUpdate=true;b.mesh.userData.chapter={phase:state.p.phase,steps:state.p.investigation.length,turn:state.p.turn,safe:state.safe};}finally{URL.revokeObjectURL(url);}};
  image.onerror=()=>URL.revokeObjectURL(url);image.src=url;
 }
}
