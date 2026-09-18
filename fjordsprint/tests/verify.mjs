import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import * as THREE from '../dist/vendor/three.module.js';
import {courses,Track} from '../dist/tracks.js';
import {initialState,stepCar,recoverCar} from '../dist/physics.js';
import {createDemoDriver} from '../dist/demo.js';
import {World} from '../dist/world.js';
import {carveRoadClearance,groundHeight} from '../dist/terrain.js';
const root=fileURLToPath(new URL('../',import.meta.url));
for(const file of fs.readdirSync(path.join(root,'dist')).filter(f=>f.endsWith('.js'))){execFileSync(process.execPath,['--check',path.join(root,'dist',file)]);const source=fs.readFileSync(path.join(root,'dist',file),'utf8');for(const match of source.matchAll(/from\s+['"](\.\/[^'"]+)['"]/g))assert.ok(fs.existsSync(path.join(root,'dist',match[1])),`Missing import ${file}: ${match[1]}`);}
const content=JSON.parse(fs.readFileSync(path.join(root,'dist/archive-content.json'),'utf8'));
assert.equal(content.questions.length,30);assert.equal(new Set(content.questions.map(q=>q.id)).size,30);const ids=new Set(content.sources.map(s=>s.id));for(const q of content.questions){assert.equal(q.options.length,3);assert.ok(q.correct>=0&&q.correct<=2);assert.ok(q.explanation.length>20);assert.ok(ids.has(q.source));}for(const s of content.sources)assert.ok(s.url.startsWith('https://'));
const hard=JSON.parse(fs.readFileSync(path.join(root,'dist/hard-questions.json'),'utf8'));
assert.equal(hard.questions.length,12);assert.equal(new Set([...content.questions,...hard.questions].map(q=>q.id)).size,42);
const allIds=new Set([...content.sources,...hard.sources].map(s=>s.id));for(const q of hard.questions){assert.equal(q.options.length,3);assert.ok(q.correct>=0&&q.correct<3);assert.ok(allIds.has(q.source));assert.ok(q.explanation.length>30);}for(const mascot of ['riks','arkiv'])assert.equal(hard.questions.filter(q=>q.mascot===mascot).length,6);
const summary=[];
for(const c of courses){
 const track=new Track(c);
 for(const assist of [true,false]){
  const car=initialState(),drive=createDemoDriver(),events={};let previous=0;
  for(let frame=0;frame<120*180&&!car.finished;frame++){
   const input=drive(car,track,assist);
   for(const e of stepCar(car,input,1/120,track,{assist})){events[e]=(events[e]||0)+1;}
   assert.ok(car.s>=previous);previous=car.s;assert.ok(Number.isFinite(car.speed)&&car.speed>=0&&car.speed<=100);assert.ok(car.boost>=0&&car.boost<=100);
  }
  assert.ok(car.finished,`${c.id} failed to finish`);assert.equal(car.crashes,0);assert.equal(events.checkpoint,3);assert.equal(events.jump,c.jumps.length);assert.equal(events.land,c.jumps.length);assert.ok(car.time<c.medals[0]);summary.push({course:c.name,assist,time:+car.time.toFixed(3),collisions:car.crashes});
 }
 // Recovery must not allow checkpoints to reward a second time.
 const recovery=initialState();recovery.checkpoint=1;recovery.checkpointS=track.checkpoints[0]+3;recovery.s=recovery.checkpointS+50;recovery.time=20;recovery.air=4;recoverCar(recovery,track);assert.equal(recovery.time,23);assert.equal(recovery.air,0);assert.equal(recovery.checkpoint,1);assert.ok(!stepCar(recovery,{throttle:true},1/120,track,{assist:true}).includes('checkpoint'));
 // A booster must never reduce high speed, and releasing boost must preserve momentum.
 const boosted=initialState();boosted.s=track.pads[0]-.01;boosted.speed=99;boosted.boost=100;const hit=stepCar(boosted,{throttle:true,boost:true},1/120,track,{assist:true});assert.ok(hit.includes('pad'));assert.equal(boosted.speed,100);const speed=boosted.speed;stepCar(boosted,{throttle:true},1/120,track,{assist:true});assert.ok(boosted.speed>speed-1);
 // Audit the actual terrain triangles under every metre of asphalt and shoulders.
 const world=Object.create(World.prototype);world.track=track;const len=-Math.min(...c.points.map(p=>p[2]))+1600,geo=new THREE.PlaneGeometry(6000,len,170,Math.round(len/32));geo.rotateX(-Math.PI/2);geo.translate(100,0,-len/2+650);const attr=geo.attributes.position;for(let i=0;i<attr.count;i++)attr.setY(i,world.terrainHeight(attr.getX(i),attr.getZ(i)));carveRoadClearance(geo,track);let minimum=Infinity;
 for(let s=0;s<=track.length;s+=1)for(let lateral=0;lateral<=28;lateral++){const half=c.width/2+1.3,p=track.position(s,-half+2*half*lateral/28),clearance=p.y-groundHeight(geo,p.x,p.z);minimum=Math.min(minimum,clearance);assert.ok(clearance>0,`${c.id} terrain intrusion at ${s}`);}geo.dispose();console.log(`${c.name}: road clearance ${minimum.toFixed(3)} m minimum`);
}
console.table(summary);console.log('PASS: assets, source references, all 42 questions, six complete physics races, boost momentum, checkpoint recovery, medals and road clearance.');
