import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {MuseumWorld} from '../src/world.ts';

// Exercise camera/navigation methods without constructing a WebGL renderer.
function world(reduced=true){
  return Object.assign(Object.create(MuseumWorld.prototype),{
    camera:new T.PerspectiveCamera(), settings:{reduced,sensitivity:1,quality:1},
    keys:new Set(['KeyW']), from:new T.Vector3(), yaw:0, pitch:0,
    active:false, guided:true, paused:true, solids:[],
  });
}

test('Entry opens the hall facing inward, with free movement enabled',()=>{
  for(const reduced of [false,true]){
    const w=world(reduced);w.start();
    assert.equal(w.active,true);assert.equal(w.guided,false);assert.equal(w.paused,false);
    assert.equal(w.keys.size,0);
    const arrival=reduced?w.camera.position:w.target;
    assert.deepEqual(arrival.toArray(),[0,1.72,1]);
    assert.ok(w.valid(arrival.x,arrival.z));
    if(reduced)assert.ok(w.camera.getWorldDirection(new T.Vector3()).z>.99);
    else assert.equal(w.targetYaw,Math.PI);
  }
});

test('Immediate room or hall navigation cancels an unfinished entrance flight',()=>{
  for(const destination of ['hall','room']){
    const w=world(false);w.start();assert.ok(w.target);
    w.settings.reduced=true;
    if(destination==='hall')w.home();
    else w.fly(new T.Vector3(13.2,1.9,9),-Math.PI/2);
    assert.equal(w.target,null);
    assert.deepEqual(w.camera.position.toArray(),destination==='hall'?[0,1.72,2]:[13.2,1.9,9]);
  }
});

test('All six rooms remain reachable through the open hall portals',()=>{
  const w=world();
  Object.assign(w,{scene:new T.Scene(),doors:[],rooms:new Map(),
    cases:JSON.parse(readFileSync(new URL('../cases/cases.json',import.meta.url))),
    model:()=>new T.Group(),label:()=>{},instanceObjects:()=>{},
  });
  w.buildHall();w.buildRoomShells();
  for(const z of [9,27,45])for(const side of [-1,1])for(let step=0;step<=132;step++){
    assert.ok(w.valid(side*step/10,z),`Portal path ${side*step/10}, ${z}`);
  }
  assert.equal(w.valid(10,18),false,'Solid masonry still blocks passage');
  assert.equal(w.valid(0,20),false,'Central exhibit still blocks passage');
});
