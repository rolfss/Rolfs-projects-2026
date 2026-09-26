import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {graphicsPolicy,parseGraphicsProfile} from '../../src/graphics-settings.ts';
import {MuseumWorld} from '../../src/world.ts';
import * as T from 'three';
const root=new URL('../../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
test('Automatic graphics keep touch devices on 512px textures; high detail is explicit',()=>{
 assert.equal(graphicsPolicy('auto',390,844,3,true).textureSize,512);
 assert.equal(graphicsPolicy('auto',1440,960,1,false).textureSize,1024);
 assert.equal(graphicsPolicy('high',390,844,3,true).textureSize,2048);
 assert.equal(parseGraphicsProfile('ultra'),'auto');assert.equal(parseGraphicsProfile(null),'auto');
});
test('Graphics resolution is bounded and economy disables live shadows',()=>{
 for(const [w,h] of [[390,844],[1920,1080],[3840,2160],[7680,4320]]){
  const p=graphicsPolicy('high',w,h,4,false);assert.ok(w*h*p.ratio*p.ratio<=8294400+1);assert.ok(p.ratio<=2);
 }
 const p=graphicsPolicy('high',1920,1080,2,false,true);assert.equal(p.shadows,false);assert.ok(p.ratio<=1);
});
test('Geometry batching retains secondary UVs and separately replaceable exhibit groups',()=>{
 const w=Object.assign(Object.create(MuseumWorld.prototype),{doors:[]});
 const root=new T.Group(),m=new T.MeshStandardMaterial(),g=new T.BoxGeometry(1,1,1);
 g.setAttribute('uv1',g.getAttribute('uv').clone());root.add(new T.Mesh(g,m));
 const preserved=new T.Group();preserved.userData.preserveGroup=true;
 const child=new T.Mesh(g.clone(),m);preserved.add(child);root.add(preserved);w.mergeStatic(root);
 assert.equal(child.parent,preserved);assert.ok(root.children.some(o=>o.isMesh&&o.geometry.hasAttribute('uv1')));
});
test('The visual explanation is explicit in browser and JavaScript-free reading',()=>{
 assert.match(read('src/main.ts'),/ikke Tokkes faktiske utbedring/);
 assert.match(read('scripts/make-text-version.mjs'),/Oppbevart eller brukbart/);
 assert.match(read('scripts/make-text-version.mjs'),/ingen påstand om nye historiske funn/i);
});
test('Every compiled asset matches its provenance manifest and all three quality tiers exist',()=>{
 const manifest=JSON.parse(read('public/assets/visual-preview/manifest.json'));
 for(const e of manifest.entries){
  const data=readFileSync(new URL('public/assets/visual-preview/'+e.file,root));
  assert.equal(data.byteLength,e.bytes);assert.equal(createHash('sha256').update(data).digest('hex'),e.sha256);
 }
 for(const n of [512,1024,2048])for(const material of ['limestone','floor','oak'])for(const c of ['color','normal','orm'])assert.ok(manifest.entries.some(e=>e.file===`${material}-${c}-${n}.ktx2`));
});
