import * as T from './vendor/three.module.js';

// The timed stage ends at track.length. The car continues onto the scenic
// run-out for presentation only, so records and ghosts retain their old timing.
export function finishPose(car,elapsed,track){
 const time=Math.max(0,elapsed),v=Math.max(0,car.speed),braking=30,t=Math.min(time,v/braking),distance=v*t-.5*braking*t*t;
 return {...car,s:track.length+Math.min(distance,track.runoffLength-40),x:car.x*Math.exp(-time*1.5),heading:car.heading*Math.exp(-time*3),steer:car.steer*Math.exp(-time*4),speed:Math.max(0,v-braking*time),air:Math.max(0,car.air-time*8),boosting:false,turbo:0,stagger:0,drift:0};
}

export function buildFinishVenue({scene,track}){
 const root=new T.Group();root.name='Open finish village';scene.add(root);
 const geometries={box:new T.BoxGeometry(1,1,1),ball:new T.IcosahedronGeometry(1,1),cone:new T.ConeGeometry(1,1,8)},materials={},batches=new Map(),dummy=new T.Object3D();
 const colors={cream:0xf2edd7,navy:0x172e3b,wood:0x95613e,mint:0x77e6ca,gold:0xf5c966,red:0xb64237,blue:0x476cad,skin:0xe0b092,orange:0xe99754,purple:0x8f79b9};
 for(const [key,color] of Object.entries(colors))materials[key]=new T.MeshStandardMaterial({color,roughness:.85,flatShading:true});
 function part(shape,color,s,x,y,sx,sy,sz,rz=0){const f=track.at(s);dummy.position.copy(f.p).addScaledVector(f.r,x);dummy.position.y+=y;dummy.rotation.set(0,-f.yaw,rz);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();const key=shape+color;if(!batches.has(key))batches.set(key,{shape,color,matrices:[]});batches.get(key).matrices.push(dummy.matrix.clone());}
 // A paved forecourt surrounds the road, with the driving corridor kept clear.
 const pos=[],indices=[],half=track.config.width/2+25;
 for(let i=0;i<=46;i++){const s=track.length-40+i*5,f=track.at(s);for(const side of [-1,1])pos.push(f.p.x+f.r.x*half*side,f.p.y-.07,f.p.z+f.r.z*half*side);if(i<46){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}}
 const ground=new T.BufferGeometry();ground.setAttribute('position',new T.Float32BufferAttribute(pos,3));ground.setIndex(indices);ground.computeVertexNormals();const plaza=new T.Mesh(ground,new T.MeshStandardMaterial({color:0x65757a,roughness:1}));plaza.receiveShadow=true;root.add(plaza);
 const tile=track.config.width/16;
 for(let row=0;row<2;row++)for(let i=0;i<16;i++)part('box',(i+row)%2?'navy':'cream',track.length+(row-.5)*1.8,(i-7.5)*tile,.035,tile,.06,1.8);
 // Reception tents, depot crates and a podium sit outside both guardrails.
 for(const side of [-1,1]){
  const x=side*(track.config.width/2+15),s=track.length+40;
  part('box','navy',s,x,.22,14,.45,18);part('cone',side<0?'mint':'red',s,x,6,10,4,10);
  for(const dx of [-5,5])for(const ds of [-6,6])part('box','cream',s+ds,x+dx,2.4,.25,4.7,.25);
  part('box','wood',s-2,x,1.15,8,1.1,2);for(let i=0;i<5;i++)part('box',i%2?'mint':'gold',s+7,x-4+i*1.8,.8,1.35,1.6,1.4);
  // Spectators in jackets stand in shallow rows, all behind the rail.
  for(let i=0;i<14;i++){
   const ps=track.length-28+i*7,px=side*(track.config.width/2+4+(i%3)*1.25),coat=['red','mint','gold','blue','purple','orange'][i%6];
   part('box',coat,ps,px,1.35,.8,.95,.5);part('ball','skin',ps,px,2.07,.31,.36,.3);part('ball',coat,ps,px,2.32,.33,.13,.32);
   for(const sign of [-1,1]){part('box','navy',ps,px+sign*.23,.49,.24,.96,.28);part('box',coat,ps,px+sign*.62,1.62,.22,.9,.24,sign*.65);}
  }
  // Slim finish lanterns frame the straight, without blocking the skyline.
  for(let i=0;i<7;i++){const ps=track.length-35+i*30,px=side*(track.config.width/2+1.8);part('box','navy',ps,px,3.1,.2,6.2,.2);part('box','gold',ps,px,6.35,.6,.7,.6);}
 }
 for(let i=0;i<3;i++){const x=-track.config.width/2-15+(i-1)*3.3;part('box',i===1?'gold':'mint',track.length+80,x,.45+(i===1?.35:0),3, i===1?1.6:.9,3);}
 // Course-specific timber landmark at the far side of the venue.
 const hutX=track.config.width/2+17,hs=track.length+128;
 part('box','red',hs,hutX,3,12,6,10);part('cone','navy',hs,hutX,7,9,3,8);
 for(const dx of [-3.5,3.5])part('box','gold',hs-5.02,hutX+dx,3.4,2.1,2,.12);
 part('box','navy',hs-5.04,hutX,1.8,2.1,3.6,.12);
 for(const b of batches.values()){const mesh=new T.InstancedMesh(geometries[b.shape],materials[b.color],b.matrices.length);b.matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);}
 return {root,stats:{spectators:28,tents:2,runoffMetres:track.runoffLength,drawCalls:batches.size+1}};
}
