import test from 'node:test';
import assert from 'node:assert/strict';
import { assets, initialBacklog, auditSeed } from '../data.mjs';
import { normalizeFilters } from '../catalog-model.mjs';
import { createDemoStore, restoreDemoState } from '../state-store.mjs';

const defaults=()=>({assets:structuredClone(assets),backlog:structuredClone(initialBacklog),audit:structuredClone(auditSeed),role:'steward',activeView:'overview',useCaseId:'rag_assistant',selectedAssetId:'CW-DOC-002',readinessAssetId:'CW-DOC-002',lineageAssetId:'CW-DOC-001',detailOpen:false,catalogFilters:normalizeFilters()});
function memory(raw=null){return {raw,getItem(){return this.raw;},setItem(key,value){this.raw=value;},removeItem(){this.raw=null;}};}

test('gyldige lokale endringer overlever innlasting', () => {
  const saved=defaults();saved.assets[0].owner='Ny demoeier';saved.catalogFilters={ownerGap:true,query:'arkiv'};
  const restored=restoreDemoState(defaults(),saved);
  assert.equal(restored.assets[0].owner,'Ny demoeier');
  assert.equal(restored.catalogFilters.attention,'owners');
  assert.equal(restored.catalogFilters.sort,'priority');
  assert.equal(restored.catalogFilters.query,'arkiv');
});

test('ødelagt form, duplikate ID-er og ugyldig revisjonsspor avvises', () => {
  for(const invalid of [null,[],{}, {...defaults(),assets:[null]}, {...defaults(),assets:[assets[0],assets[0]]},
    {...defaults(),audit:[{...auditSeed[0],at:'ikke en dato'}]},
    {...defaults(),assets:[{...assets[0],version:10}]},
    {...defaults(),backlog:[{...initialBacklog[0],assetIds:'ikke en liste'}]}]) {
    assert.equal(restoreDemoState(defaults(),invalid),null);
  }
});

test('ukjente visninger og roller gir trygge standardverdier', () => {
  const restored=restoreDemoState(defaults(),{...defaults(),role:'root',activeView:'ukjent',selectedAssetId:'borte'});
  assert.equal(restored.role,'steward');
  assert.equal(restored.activeView,'overview');
  assert.equal(restored.selectedAssetId,assets[0].id);
});

test('tom lagring er en normal førstegangsstart', () => {
  const store=createDemoStore('demo',defaults,()=>memory());
  assert.equal(store.read().problem,null);
  assert.equal(store.read().state.assets.length,assets.length);
});

test('uleselig JSON bevares til brukeren uttrykkelig nullstiller', () => {
  const storage=memory('{ødelagt');
  const store=createDemoStore('demo',defaults,()=>storage);
  assert.equal(store.read().problem,'invalid');
  assert.equal(store.write(defaults()),'invalid');
  assert.equal(storage.raw,'{ødelagt');
  assert.equal(store.clear(),null);
  assert.equal(store.write(defaults()),null);
  assert.equal(store.read().problem,null);
});

test('gyldig JSON med ugyldig struktur blir heller ikke overskrevet', () => {
  const storage=memory('{"assets":null}');
  const store=createDemoStore('demo',defaults,()=>storage);
  assert.equal(store.read().problem,'invalid');
  assert.equal(store.write(defaults()),'invalid');
  assert.equal(storage.raw,'{"assets":null}');
});

test('blokkert lagring stanser verken innlasting, skriving eller nullstilling', () => {
  const store=createDemoStore('demo',defaults,()=>{throw new Error('SecurityError');});
  assert.equal(store.read().problem,'unavailable');
  assert.equal(store.write(defaults()),'unavailable');
  assert.equal(store.clear(),'unavailable');
});

test('full kvote gir varsel, men en senere vellykket lagring fjerner det', () => {
  const storage=memory();
  storage.setItem=()=>{throw new Error('QuotaExceededError');};
  const store=createDemoStore('demo',defaults,()=>storage);
  assert.equal(store.read().problem,null);
  assert.equal(store.write(defaults()),'unavailable');
  storage.setItem=function(key,value){this.raw=value;};
  assert.equal(store.write(defaults()),null);
  assert.equal(store.read().state.assets.length,assets.length);
});
