import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {nextVisitRoom} from '../src/visit-state.ts';
import {CASE_STORAGE,restoreCase} from '../src/investigation-state.ts';
const root=new URL('../',import.meta.url);
const rooms=['osen','tokke','innsyn','hanekleiv','npe'];
const read=file=>readFileSync(new URL(file,root),'utf8');

test('The visit has five exhibits followed by one practical ending, independent of badges',()=>{
  let last=null;const route=[];
  for(let i=0;i<6;i++){last=nextVisitRoom(rooms,last);route.push(last);}
  assert.deepEqual(route,[...rooms,'leader']);
  assert.equal(nextVisitRoom(rooms,'leader'),'leader');
});
test('Missing or stale navigation safely starts at the first exhibit',()=>{
  assert.equal(nextVisitRoom(rooms,null),'osen');
  assert.equal(nextVisitRoom(rooms,'unrecognised'),'osen');
  assert.equal(nextVisitRoom([],null),'leader');
});
test('The disclosure starts closed and retains an explicit controlled region',()=>{
  const ui=read('src/visit-ui.ts');
  assert.match(ui,/id="visit-details" hidden/);
  assert.match(ui,/aria-expanded="false" aria-controls="visit-details"/);
  assert.ok(ui.indexOf('id="visit-toggle"')<ui.indexOf('id="visit-details"'));
  assert.match(ui,/\.inert = open/);
  assert.match(ui,/events\.abort\(\)/);
});
test('The main HUD no longer promotes the optional case as the museum identity',()=>{
  const ui=read('src/main.ts')+read('src/visit-ui.ts')+read('src/investigation.ts');
  assert.doesNotMatch(ui,/Sak 17|SAK 17|SAK \/ 17/);
  assert.doesNotMatch(read('src/investigation.ts'),/case17-hint|case17-entry/);
  assert.match(read('src/visit-ui.ts'),/uavhengig av lederøvelsene/);
});
test('Renaming does not invalidate old saved evidence or choices',()=>{
  assert.equal(CASE_STORAGE,'arkivmuseet-case17-v1');
  const old=restoreCase(JSON.stringify({version:1,started:true,found:['e1','e2'],triage:{t1:'capture'},crisis:[1,0,null,null,null,null]}));
  assert.deepEqual(old.found,['e1','e2']);assert.equal(old.triage.t1,'capture');
  assert.deepEqual(old.crisis,[1,0,null,null,null,null]);
});
test('The new text URL and legacy bookmark contain identical complete material',()=>{
  execFileSync(process.execPath,['scripts/make-investigation-text.mjs'],{cwd:root});
  const text=read('public/etterforskning.html');
  assert.equal(read('public/sak17.html'),text);
  assert.match(text,/<h1>Det manglende grunnlaget<\/h1>/);
  assert.equal((text.match(/<article>/g)||[]).length,26);
  assert.doesNotMatch(text,/<script|Sak 17/);
});
