import test from 'node:test';
import assert from 'node:assert/strict';
import {CONTRACT,ready,safeLink,trimHistory,validateResponse} from '../../site/second-rolf/client.mjs';
import {readFileSync} from 'node:fs';
test('UI refuses previous hardcoded local flag',()=>assert.equal(ready({mode:'hermes-local',configured:true,localOnly:true}),false));
test('UI requires actual service readiness and disabled tools',()=>{
 const state={contract:CONTRACT,ready:true,localOnly:true,toolsEnabled:false,mode:'local-rag',siteKey:'site'};
 assert.equal(ready(state),true);assert.equal(ready({...state,toolsEnabled:true}),false);assert.equal(ready({...state,ready:false}),false);
});
test('UI links cannot execute script or contain embedded credentials',()=>{
 assert.equal(safeLink('javascript:alert(1)'),null);assert.equal(safeLink('https://key:secret@example.org'),null);
 assert.equal(safeLink(null),null);assert.equal(safeLink('https://example.org/'),'https://example.org/');
});
test('history remains bounded and contains complete turns',()=>{
 const h=Array.from({length:20},(_,i)=>({role:i%2?'assistant':'user',content:'x'.repeat(4000)}));
 const trimmed=trimHistory(h);assert.ok(trimmed.length<=8);assert.equal(trimmed.length%2,0);
 assert.ok(trimmed.reduce((n,m)=>n+m.content.length,0)<=10000);
});
test('UI rejects legacy model response and dangerous citation',()=>{
 assert.throws(()=>validateResponse({answer:'made up',localOnly:true}));
 const valid={contract:CONTRACT,localOnly:true,mode:'local-rag',answer:'text',citations:[]};
 assert.equal(validateResponse(valid).answer,'text');
 assert.throws(()=>validateResponse({...valid,citations:[{title:'x',quote:'text',url:'javascript:bad'}]}));
});
test('frontend does not persist chat or execute generated HTML',()=>{
 const code=readFileSync(new URL('../../site/second-rolf/app.js',import.meta.url),'utf8');
 assert.doesNotMatch(code,/localStorage|sessionStorage|innerHTML|eval\(/);assert.match(code,/active\?\.abort/);
});
