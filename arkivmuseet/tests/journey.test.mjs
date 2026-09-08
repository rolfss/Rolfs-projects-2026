import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {emptyAttempt,emptyJourney,evidenceCorrect,canComplete,restoreJourney,planText} from '../src/journey-state.ts';
const missions=JSON.parse(readFileSync(new URL('../cases/missions.json',import.meta.url)));
const cases=JSON.parse(readFileSync(new URL('../cases/cases.json',import.meta.url)));

test('Every real case has one playable mission with distinct, complete branches',()=>{
  assert.deepEqual(missions.map(m=>m.id),cases.map(c=>c.id));
  for(const m of missions){assert.equal(m.clues.length,4);assert.equal(m.clues.filter(c=>c.relevant).length,2);assert.equal(new Set(m.clues.map(c=>c.id)).size,4);assert.equal(m.options.length,3);assert.equal(m.options.filter(o=>o.protected).length,1);for(const o of m.options){assert.equal(o.timeline.length,3);assert.ok(o.timeline.every(e=>e.when&&e.title&&e.text));}assert.ok(m.action&&m.proof);}
});
test('Every subset of evidence is evaluated exactly; selecting everything never wins',()=>{
  for(const m of missions)for(let mask=0;mask<16;mask++){
    const selected=m.clues.filter((_,i)=>mask&(1<<i)).map(c=>c.id);
    const expected=m.clues.every(c=>selected.includes(c.id)===c.relevant);
    assert.equal(evidenceCorrect(m,selected),expected,`${m.id} subset ${mask}`);
  }
  assert.equal(evidenceCorrect(missions[0],['status','status']),false);
});
test('All 15 branches require checked evidence and the full protective consequence chain',()=>{
  for(const m of missions)for(let choice=0;choice<3;choice++)for(let turn=0;turn<3;turn++){
    const a={...emptyAttempt(),selected:m.clues.filter(c=>c.relevant).map(c=>c.id),checked:true,choice,turn};
    assert.equal(canComplete(m,a),m.options[choice].protected&&turn===2);
    assert.equal(canComplete(m,{...a,checked:false}),false);
  }
});
test('Progress survives reload without awarding duplicate or unearned badges',()=>{
  const state=emptyJourney();for(const m of missions)state.attempts[m.id]={selected:m.clues.filter(c=>c.relevant).map(c=>c.id),checked:true,choice:m.options.findIndex(o=>o.protected),turn:2,completed:true};
  assert.deepEqual(restoreJourney(JSON.stringify(state),missions),state);
  state.attempts.osen.turn=0;assert.equal(restoreJourney(JSON.stringify(state),missions).attempts.osen.completed,false);
  assert.deepEqual(restoreJourney('invalid',missions),emptyJourney());
  assert.deepEqual(restoreJourney('{"version":42}',missions),emptyJourney());
});
test('Malformed stored input is bounded and cannot select nonexistent options',()=>{
  const data={version:1,attempts:{osen:{selected:['status','type','type','unknown'],checked:true,choice:999,turn:99,completed:true}},plan:{osen:{selected:true,owner:'x'.repeat(200),due:'garbage'}}};
  const s=restoreJourney(JSON.stringify(data),missions);assert.deepEqual(s.attempts.osen.selected,['status','type']);assert.equal(s.attempts.osen.choice,null);assert.equal(s.attempts.osen.completed,false);assert.equal(s.plan.osen.owner.length,100);assert.equal(s.plan.osen.due,'');
});
test('Leader order exports only selected actions and preserves responsibility and follow-up',()=>{
  const state=emptyJourney();state.plan.tokke={selected:true,owner:'Systemeier',due:'2026-10-01'};state.plan.osen={selected:false,owner:'',due:''};
  const text=planText(missions,state);assert.ok(text.includes(missions[1].action));assert.ok(text.includes(missions[1].proof));assert.ok(text.includes('Systemeier'));assert.ok(text.includes('2026-10-01'));assert.ok(!text.includes(missions[0].action));
});
test('Real images are bundled, attributed and distinguished from the simulated case',()=>{
  const illustrated=cases.filter(c=>c.image);assert.equal(illustrated.length,4);
  for(const c of illustrated){const i=c.image;assert.ok(existsSync(new URL('../public/'+i.src,import.meta.url)));for(const key of ['sourceUrl','licenseUrl'])assert.ok(i[key].startsWith('https://'));assert.ok(i.alt&&i.credit&&i.caption&&i.width>0&&i.height>0);}
  assert.match(cases.find(c=>c.id==='hanekleiv').image.caption,/2010/);
  assert.match(cases.find(c=>c.id==='tokke').image.caption,/Stedsbilde/);
});
