const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

// Recreate this driver for each demo race. It returns ordinary controller input;
// it never changes the car, advances the simulation, recovers, or writes records.
// The caller runs stepCar normally and handles quiz answering through its UI flow.
export function createDemoDriver({reactionInterval=.125,cruise=72,keyboard=false}={}){
  let nextDecision=0,lastTime=-1,input={steer:0,throttle:true,brake:false,boost:false,drift:false};
  return function demoInput(car,track,assist=true){
    if(car.time<lastTime)nextDecision=0;
    lastTime=car.time;
    if(car.time<nextDecision)return input;
    nextDecision=car.time+reactionInterval;
    let tightness=0;
    for(let distance=0;distance<=Math.max(32,car.speed*1.1);distance+=6){
      tightness=Math.max(tightness,Math.abs(track.curvature(car.s+distance)));
    }
    const targetSpeed=Math.min(cruise,.78*1.05/Math.max(tightness,.001));
    const curvature=track.curvature(car.s+car.speed*.14);
    const targetHeading=clamp(-car.x*.055,-.3,.3);
    const turn=curvature*car.speed+(assist?2.1:.55)*targetHeading+2.8*(targetHeading-car.heading);
    let steer=clamp(turn/((.72+Math.min(car.speed,60)*.006)*(car.air>.1?.35:1)),-1,1);
    if(keyboard)steer=Math.abs(steer)>.32?Math.sign(steer):0;
    input={
      steer,
      throttle:car.speed<targetSpeed+.3,
      brake:car.speed>targetSpeed+3,
      boost:car.speed<targetSpeed-3&&tightness<.009&&Math.abs(car.x)<3.5,
      drift:false
    };
    return input;
  };
}
