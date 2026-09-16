import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {MuseumWorld} from '../src/world.ts';
import ts from 'typescript';
// Compile the same TypeScript module as Vite; this suite needs no browser or GPU.
const source=readFileSync(new URL('../src/investigation-world.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
 .replace("from 'three'","from '"+import.meta.resolve('three')+"'")
 .replace("from './investigation-state'","from '"+new URL('../src/investigation-state.ts',import.meta.url).href+"'");
const {InvestigationWorld}=await import('data:text/javascript,'+encodeURIComponent(compiled));
import {freshCase,collectEvidence} from '../src/investigation-state.ts';
function setup(){
 const world=Object.assign(Object.create(MuseumWorld.prototype),{
  scene:new T.Scene(),solids:[],doors:[],rooms:new Map(),
  cases:JSON.parse(readFileSync(new URL('../cases/cases.json',import.meta.url))),
  renderer:{domElement:new EventTarget()},model:()=>new T.Group(),instanceObjects:()=>{},
  label(text,sub,x,y,z,width=4,rotation=0,color='#ffffff',parent=this.scene){
   const mesh=new T.Mesh(new T.PlaneGeometry(width,width/4),new T.MeshBasicMaterial());
   mesh.position.set(x,y,z);mesh.rotation.y=rotation;mesh.userData.text=text;parent.add(mesh);return mesh;
  },
 });
 world.buildHall();world.buildRoomShells();
 const before=[...world.scene.children];
 const scenery=new InvestigationWorld(world,()=>{},()=>{});
 return {world,scenery,before};
}
test('Investigation scenery is additive and retains all original hall objects',()=>{
 const {world,before}=setup();for(const object of before)assert.ok(world.scene.children.includes(object));
 for(const c of world.cases)assert.ok(world.scene.getObjectByName('case17-'+c.id));
 assert.ok(world.scene.getObjectByName('case17-memory'));
});
test('New desk collisions leave all portal paths and room arrivals open',()=>{
 const {world}=setup();
 for(const z of [9,27,45])for(const side of [-1,1])for(let step=0;step<=132;step++)assert.ok(world.valid(side*step/10,z));
 for(const c of world.cases){const [x,z]=c.position;assert.ok(world.valid(x-Math.sign(x)*5.8,z));
  const desk=world.scene.getObjectByName('case17-'+c.id);assert.equal(world.valid(desk.position.x,desk.position.z),false);}
});
test('The hall responds to collected clues and actual decisions, not unanswered choices',()=>{
 const {world,scenery}=setup(),state=freshCase();scenery.reflect(state);
 const hall=world.scene.getObjectByName('case17-memory');
 const markers=hall.children.filter(o=>o instanceof T.Mesh&&o.geometry.type==='BoxGeometry');
 assert.equal(markers.length,16);assert.ok(markers.every(o=>o.material.color.getHex()===0x51655c));
 collectEvidence(state,'e1');collectEvidence(state,'e2');state.crisis[0]=1;state.crisis[1]=0;scenery.reflect(state);
 assert.equal(markers[0].material.color.getHex(),0xb6d6b8);assert.equal(markers[1].material.color.getHex(),0xb6d6b8);
 assert.equal(markers[2].material.color.getHex(),0x51655c);
 assert.equal(markers[10].material.color.getHex(),0x93c7ad);assert.equal(markers[11].material.color.getHex(),0xc58c69);
 assert.equal(markers[12].material.color.getHex(),0x51655c);
});
