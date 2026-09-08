import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {benefitPlacement,benefitView,worldPoint,galleryFraming,wallPlacement} from '../src/gallery-layout.ts';
const cases=JSON.parse(readFileSync(new URL('../cases/cases.json',import.meta.url)));
const benefits=JSON.parse(readFileSync(new URL('../cases/benefits.json',import.meta.url)));

test('The entry centrepieces leave chapter boards and existing gallery viewpoints unobstructed',()=>{
 const p=benefitPlacement;
 // The bottom of the chapter screen must be seen over the top of the foreground stand.
 const lineHeight=1.9+(3.15-2.31/2-1.9)*(5.8-p.z)/(5.8-.65);
 assert.ok(p.y+p.height/2+.15+.025/2<lineHeight);
 for(const c of cases){
  const centre=worldPoint([0,0,p.z],c.position),view=benefitView(c.position);
  assert.ok(Math.abs(view.from[0])>9&&Math.abs(view.from[0])<27.4);
  for(const slot of ['left','right','back-left','back-right']){
   const point=worldPoint(wallPlacement(slot).view,c.position);
   assert.ok(Math.abs(point[0]-centre[0])>=(p.depth+.6)/2||Math.abs(point[2]-centre[2])>=(p.width+.55)/2);
  }
  for(const [w,h] of [[320,568],[390,844],[768,1024],[1440,900]]){
   const f=galleryFraming(w/h,view.width,view.height,view.distance),cam=new T.PerspectiveCamera(f.fov,w/h,.08,420);cam.position.fromArray(view.from);cam.rotation.set(view.pitch,view.yaw,0,'YXZ');cam.setViewOffset(w,h,w*f.offsetX,h*f.offsetY,w,h);cam.updateMatrixWorld();
   for(const x of [-view.width/2,view.width/2])for(const y of [-view.height/2,view.height/2]){
    const corner=new T.Vector3(...worldPoint([x,p.y+y,p.z+.17],c.position)).project(cam);
    assert.ok(corner.x>-.99&&corner.x<.99);assert.ok(corner.y>-.13&&corner.y<.99);
   }
  }
 }
});
test('Each historical room has a practical gain and the legal purpose excerpts are attributed',()=>{
 assert.deepEqual(benefits.rooms.map(b=>b.caseId),cases.map(c=>c.id));
 assert.equal(new Set(benefits.rooms.map(b=>b.title)).size,5);
 for(const b of benefits.rooms)assert.ok(b.text&&b.action&&b.title);
 for(const s of benefits.sources){assert.ok(s.url.startsWith('https://lovdata.no/'));assert.equal(s.locator,'§ 1');assert.ok(s.excerpt.split(/\s+/).length<=25);}
 assert.match(benefits.basis,/faglige tolkning/);
});
