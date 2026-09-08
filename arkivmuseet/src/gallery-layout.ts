// Positions are relative to a room facing its entrance (+Z). No renderer is needed.
export type WallSlot='back-left'|'back-right'|'left'|'right';
export type Placement={position:[number,number,number];yaw:number;width:number;height:number;view:[number,number,number];target:[number,number,number]};
export function wallPlacement(slot:WallSlot,portrait=false):Placement{
  const height=portrait?3.8:3.25,width=portrait?2.7:5.1;
  if(slot==='left')return {position:[-7.57,3.3,-1.9],yaw:Math.PI/2,width,height,view:[-3.5,2.65,-1.9],target:[-7.57,3.3,-1.9]};
  if(slot==='right')return {position:[7.57,3.3,-1.9],yaw:-Math.PI/2,width,height,view:[3.5,2.65,-1.9],target:[7.57,3.3,-1.9]};
  const x=slot==='back-left'?-3.4:3.4;
  return {position:[x,3.4,-8.12],yaw:0,width,height,view:[x,2.7,-3.5],target:[x,3.4,-8.12]};
}
export function worldPoint(local:[number,number,number],room:[number,number]):[number,number,number]{
  const side=Math.sign(room[0]);return [room[0]-side*local[2],local[1],room[1]+side*local[0]];
}
export function viewAngles(from:[number,number,number],to:[number,number,number]){
  const dx=to[0]-from[0],dy=to[1]-from[1],dz=to[2]-from[2];return {yaw:Math.atan2(-dx,-dz),pitch:Math.atan2(dy,Math.hypot(dx,dz))};
}

// Fit a framed exhibit above its reading plaque, including portrait phones.
export function galleryFraming(aspect:number,width:number,height:number,distance:number){
  const narrow=aspect<1.2,usableWidth=narrow?.88:.6,usableHeight=.44;
  const verticalSize=Math.max(height/usableHeight,width/(aspect*usableWidth));
  return {fov:Math.max(60,2*Math.atan(verticalSize/(2*distance))*180/Math.PI),offsetX:narrow?0:-.15,offsetY:.2};
}
