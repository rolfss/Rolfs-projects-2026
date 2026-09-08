/** Static reading views need not redraw at gaming frame rates. Camera flights
 * and free movement retain the engine's normal requestAnimationFrame cadence. */
export function passiveFrameInterval(paused:boolean,guided:boolean,active:boolean,flying:boolean,reduced:boolean){
 return paused||(!flying&&(guided||!active))?(reduced?250:1000/15):0;
}
