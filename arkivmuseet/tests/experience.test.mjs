import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {roomStories,newProgress,investigated,roomComplete,restoreRooms,finalQuiz} from '../src/room-stories.ts';
import {roomScene} from '../src/room-scene.ts';
const missions=JSON.parse(readFileSync(new URL('../cases/missions.json',import.meta.url)));
const cases=JSON.parse(readFileSync(new URL('../cases/cases.json',import.meta.url)));
function full(s,m){return {...newProgress(),phase:5,investigation:[...s.solution],choice:m.options.findIndex(o=>o.protected),turn:2,answers:s.quiz.map(q=>q.answer),quizIndex:1};}
test('Five authored narratives connect problem, investigation, moral and two explained questions',()=>{
 assert.deepEqual(roomStories.map(s=>s.id),cases.map(c=>c.id));
 for(const s of roomStories){for(const k of ['opening','problem','investigation','discovery','moral','transfer','bridge'])assert.ok(s[k].length>20,`${s.id}: ${k}`);assert.equal(s.quiz.length,2);assert.equal(s.prompts.length,s.solution.length);assert.equal(new Set(s.solution).size,s.solution.length);assert.ok(s.solution.every(id=>s.tools.some(t=>t.id===id)));for(const q of [...s.quiz,...finalQuiz]){assert.equal(q.options.length,3);assert.equal(q.feedback.length,q.options.length);assert.ok(q.feedback.every(t=>t.length>20));assert.ok(q.answer>=0&&q.answer<q.options.length);}}
});
test('A badge requires the full investigation, protective decision, all consequences and both correct answers',()=>{
 for(const s of roomStories){const m=missions.find(m=>m.id===s.id),p=full(s,m);assert.ok(roomComplete(s,p,m.options));for(let n=0;n<s.solution.length;n++)assert.equal(roomComplete(s,{...p,investigation:s.solution.slice(0,n)},m.options),false);for(const choice of m.options.keys())assert.equal(roomComplete(s,{...p,choice},m.options),m.options[choice].protected);for(let turn=0;turn<2;turn++)assert.equal(roomComplete(s,{...p,turn},m.options),false);for(let i=0;i<2;i++){const a=[...p.answers];a[i]=(a[i]+1)%3;assert.equal(roomComplete(s,{...p,answers:a},m.options),false);}}
});
test('Saved progress is restored at every legitimate phase, including an incorrect quiz answer',()=>{
 for(const s of roomStories){const m=missions.find(m=>m.id===s.id);for(let phase=0;phase<=5;phase++){const p=phase<2?newProgress():full(s,m);p.phase=phase;if(phase===1)p.investigation=s.solution.slice(0,1);if(phase===2){p.choice=null;p.turn=0;p.answers=[null,null];p.quizIndex=0;}if(phase===3||phase===4){p.answers=[(s.quiz[0].answer+1)%3,null];p.quizIndex=0;}assert.deepEqual(restoreRooms(JSON.stringify({version:2,rooms:{[s.id]:p}}),missions)[s.id],p);}}
});
test('Malformed storage cannot skip puzzles, choose missing options or earn badges',()=>{
 for(const value of ['{','null','[]','{"version":1}'])assert.deepEqual(restoreRooms(value,missions),{});
 for(const s of roomStories){const p={...newProgress(),phase:999,investigation:['unknown',...s.solution],choice:999,turn:999,answers:s.quiz.map(q=>q.answer),quizIndex:99};const actual=restoreRooms(JSON.stringify({version:2,rooms:{[s.id]:p}}),missions)[s.id];assert.deepEqual(actual.investigation,[]);assert.equal(actual.phase,1);assert.equal(actual.choice,null);assert.deepEqual(actual.answers,[null,null]);assert.equal(investigated(s,actual),false);}
});
test('Every room has different, state-dependent inline and 3D illustrations without external requests',()=>{
 const seen=new Set();for(const s of roomStories){const m=missions.find(m=>m.id===s.id),p=full(s,m),start=roomScene(s,newProgress()),end=roomScene(s,p,true),bad=roomScene(s,{...p,phase:3},false);assert.notEqual(start,end);assert.notEqual(end,bad);assert.match(end,/viewBox="0 0 640 352"/);assert.match(end,/role="img"/);assert.doesNotMatch(end,/<script|https:\/\/(?!www.w3.org)/);seen.add(start);}assert.equal(seen.size,5);
});
test('New narratives retain the key limits of the historical evidence',()=>{
 const get=id=>roomStories.find(s=>s.id===id);assert.match(get('tokke').opening,/uklart/);assert.match(get('tokke').quiz[0].options[0],/endelig tap er ikke fastslått/);assert.match(get('innsyn').investigation,/ikke en påstand om journalplikt/);assert.match(get('hanekleiv').opening,/ett av flere/);assert.match(get('npe').opening,/generelt godt/);assert.match(get('osen').opening,/tydet kontrollsøket/);
});
