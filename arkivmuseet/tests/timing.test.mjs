import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {MuseumWorld} from '../src/world.ts';
const world=()=>Object.assign(Object.create(MuseumWorld.prototype),{
 camera:new T.PerspectiveCamera(),settings:{reduced:false,sensitivity:1,quality:1},
 keys:new Set(),from:new T.Vector3(),yaw:Math.PI,pitch:0,solids:[],
});
test('The entrance flight follows elapsed time, not the rendering frame rate',()=>{
 for(const frames of [[.7,.7,.7,.7],Array(56).fill(.05),[3.1]]){
  const w=world();w.camera.position.set(0,2.15,-9);w.start();
  for(const elapsed of frames)w.advanceFlight(elapsed);
  assert.equal(w.target,null);assert.deepEqual(w.camera.position.toArray(),[0,1.72,1]);
 }
});
test('Walking covers the same distance at low and high rendering rates',()=>{
 const positions=[];
 for(const frames of [[.7],Array(14).fill(.05)]){
  const w=world();w.camera.position.set(0,1.72,2);w.keys.add('KeyW');
  for(const elapsed of frames)w.move(elapsed);positions.push(w.camera.position.z);
 }
 assert.ok(Math.abs(positions[0]-3.855)<1e-9);assert.ok(Math.abs(positions[0]-positions[1])<1e-9);
});
test('Long movement frames cannot tunnel through a thin solid object',()=>{
 const w=world();w.camera.position.set(0,1.72,2);w.keys.add('KeyW');w.solids=[{x:0,z:3,w:2,d:.4}];
 w.move(1);assert.ok(w.camera.position.z<2.8);assert.ok(w.camera.position.z>2.5);
});
test('Diagonal movement does not give extra speed, and idle input does not move',()=>{
 const w=world();w.camera.position.set(0,1.72,2);w.keys.add('KeyW');w.keys.add('KeyD');
 const start=w.camera.position.clone();w.move(.7);assert.ok(Math.abs(w.camera.position.distanceTo(start)-1.855)<1e-9);
 w.keys.clear();const end=w.camera.position.clone();w.move(1);assert.deepEqual(w.camera.position.toArray(),end.toArray());
});
