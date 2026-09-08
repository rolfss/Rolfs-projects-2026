import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import * as T from 'three';
import {itemsForCase,galleryRooms} from '../src/gallery.ts';
import {wallPlacement,worldPoint,viewAngles,galleryFraming} from '../src/gallery-layout.ts';
const cases=JSON.parse(readFileSync(new URL('../cases/cases.json',import.meta.url)));
const credits=JSON.parse(readFileSync(new URL('../public/assets/cases/credits.json',import.meta.url)));

test('Every gallery has a distinct colour and non-overlapping, source-linked exhibits',()=>{
  assert.deepEqual(galleryRooms.map(r=>r.caseId),cases.map(c=>c.id));
  assert.equal(new Set(galleryRooms.map(r=>r.wall)).size,5);
  const all=cases.flatMap(itemsForCase);assert.equal(all.length,14);assert.equal(new Set(all.map(i=>i.id)).size,all.length);
  for(const c of cases){const items=itemsForCase(c);assert.equal(new Set(items.map(i=>i.slot)).size,items.length,c.id);assert.ok(items.length>=2);for(const i of items){assert.ok(i.caption&&i.credit&&i.text);assert.ok(i.url.startsWith('https://'));}}
});
test('All wall images have a bundled file, matching credits and an explicit evidence type',()=>{
  for(const item of cases.flatMap(itemsForCase).filter(i=>i.image)){
    assert.ok(existsSync(new URL('../public/'+item.image,import.meta.url)));
    const credit=credits.images.find(i=>i.src===item.image);assert.ok(credit);
    assert.equal(item.imageWidth,credit.width);assert.equal(item.imageHeight,credit.height);
    assert.ok(item.license&&item.licenseUrl.startsWith('https://'));
    assert.ok(item.kind==='photo'?item.caption.includes('Stedsbilde'):item.caption.includes('Faksimile'));
  }
  const tokke=itemsForCase(cases.find(c=>c.id==='tokke')).find(i=>i.kind==='document');assert.match(tokke.caption,/fastslår ikke/);
  const npe=itemsForCase(cases.find(c=>c.id==='npe')).find(i=>i.kind==='document');assert.match(npe.caption,/sjekket ikke/);assert.match(npe.caption,/2025/);
});
test('Press panels are short real headlines with dates and are distinguished from facsimiles',()=>{
  const press=cases.flatMap(itemsForCase).filter(i=>i.kind==='press');assert.equal(press.length,2);
  for(const p of press){assert.equal(p.image,undefined);assert.match(p.caption,/Kuratert/);assert.match(p.kicker,/2007-02-\d{2}/);assert.ok(p.title.split(/\s+/).length<25);}
  assert.match(press.find(p=>p.id==='vg-hanekleiv').caption,/ikke.*2008\/171/);
});
test('Every guided camera position is inside its room and outside the central plinth',()=>{
  for(const c of cases)for(const item of itemsForCase(c)){
    const p=wallPlacement(item.slot,item.kind==='document');const from=worldPoint(p.view,c.position),to=worldPoint(p.target,c.position);
    assert.ok(Math.abs(from[0])>9&&Math.abs(from[0])<27.4);assert.ok(Math.abs(from[2]-c.position[1])<7.4);
    assert.ok(Math.abs(from[0]-c.position[0])>=3.3/2||Math.abs(from[2]-c.position[1])>=5.2/2);
    const a=viewAngles(from,to),camera=new T.PerspectiveCamera();camera.position.fromArray(from);camera.rotation.set(a.pitch,a.yaw,0,'YXZ');camera.updateMatrixWorld();
    assert.ok(camera.getWorldDirection(new T.Vector3()).dot(new T.Vector3(...to).sub(camera.position).normalize())>.99999);
  }
});
test('Framed images fit above the reading plaque across phone, tablet and desktop viewports',()=>{
  for(const [width,height] of [[320,568],[390,844],[768,1024],[1024,768],[1440,900],[1920,1080]])for(const c of cases)for(const item of itemsForCase(c)){
    const p=wallPlacement(item.slot,item.kind==='document'),from=worldPoint(p.view,c.position),to=worldPoint(p.target,c.position),angles=viewAngles(from,to);
    const distance=new T.Vector3(...from).distanceTo(new T.Vector3(...to)),f=galleryFraming(width/height,p.width,p.height,distance);
    const camera=new T.PerspectiveCamera(f.fov,width/height,.08,420);camera.position.fromArray(from);camera.rotation.set(angles.pitch,angles.yaw,0,'YXZ');camera.setViewOffset(width,height,width*f.offsetX,height*f.offsetY,width,height);camera.updateMatrixWorld();
    for(const x of [-p.width/2,p.width/2])for(const y of [-p.height/2,p.height/2]){
      const local=new T.Vector3(x,y,0).applyAxisAngle(new T.Vector3(0,1,0),p.yaw).add(new T.Vector3(...p.position));const point=new T.Vector3(...worldPoint(local.toArray(),c.position)).project(camera);
      assert.ok(point.x>-.99&&point.x<.99,`${item.id}: width at ${width}x${height}`);assert.ok(point.y>-.13&&point.y<.99,`${item.id}: height at ${width}x${height}`);
    }
  }
});
