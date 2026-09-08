import {MuseumWorld as MuseumArchitecture} from './world-core';
import {passiveFrameInterval} from './render-budget';

/** Keep the original spatial museum, while avoiding a full GPU redraw on every
 * animation frame while the visitor is reading or using a stationary exhibit. */
export class MuseumWorld extends MuseumArchitecture{
 constructor(...args:ConstructorParameters<typeof MuseumArchitecture>){
  super(...args);
  const paint=this.tick;let lastPaint=-Infinity;
  this.tick=()=>{
   if(this.disposed)return;
   const now=performance.now();
   const interval=passiveFrameInterval(this.paused,this.guided,this.active,!!this.target,this.settings.reduced);
   if(now-lastPaint<interval){requestAnimationFrame(this.tick);return;}
   lastPaint=now;paint();
  };
 }
}
