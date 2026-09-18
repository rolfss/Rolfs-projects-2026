import {angle} from './tracks.js';
// Render between completed physics ticks. Lift includes the ramp, whose end
// transfers height to the airborne state in a single simulation tick.
export function interpolateState(previous,current,alpha,track){
 const t=Math.max(0,Math.min(1,alpha)),out={...current};
 for(const key of ['s','x','speed','steer','air','drift','time','turbo','stagger'])out[key]=(previous[key]||0)+((current[key]||0)-(previous[key]||0))*t;
 out.heading=previous.heading+angle(current.heading-previous.heading)*t;
 out.rideHeight=previous.air+track.rampHeight(previous.s)+(current.air+track.rampHeight(current.s)-previous.air-track.rampHeight(previous.s))*t;
 out.rampPitch=(track.rampHeight(previous.s)>0?.114:0)*(1-t)+(track.rampHeight(current.s)>0?.114:0)*t;
 return out;
}
