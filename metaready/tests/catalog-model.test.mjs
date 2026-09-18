import test from 'node:test';
import assert from 'node:assert/strict';
import { assets, relationships } from '../data.mjs';
import { applySuggestedRemediation, DEMO_TODAY, validateAsset } from '../engine.mjs';
import { buildCatalog, DEFAULT_FILTERS, normalizeFilters, TYPE_LABELS } from '../catalog-model.mjs';
import { catalog } from '../views.mjs';

const run = (filters = {}, selected = '') => buildCatalog(assets, relationships, filters, selected);

test('gamle eierskapsfiltre migreres uten å miste søk, type eller status', () => {
  assert.deepEqual(normalizeFilters({query:'arkiv',type:'Dataset',status:'Draft',ownerGap:true}),
    {...DEFAULT_FILTERS,query:'arkiv',type:'Dataset',status:'Draft',attention:'owners'});
  assert.deepEqual(normalizeFilters(null), DEFAULT_FILTERS);
  assert.deepEqual(normalizeFilters({query:12,type:'ukjent',status:'x',attention:'x',sort:'x'}), DEFAULT_FILTERS);
});

test('søk finner eier, forvalter og norske typenavn', () => {
  for (const key of ['owner','steward']) {
    const asset=assets.find(a=>a[key]);
    assert.ok(run({query:asset[key]}).rows.some(row=>row.asset.id===asset.id));
  }
  for (const [type,label] of Object.entries(TYPE_LABELS)) {
    assert.ok(run({query:label}).rows.some(row=>row.asset.type===type));
  }
});

test('søkeord kombineres på tvers av felt og tåler store bokstaver og ekstra mellomrom', () => {
  const asset=assets.find(a=>a.owner);
  const result=run({query:`  ${asset.id.toUpperCase()}    ${asset.owner.toUpperCase()}   `});
  assert.deepEqual(result.rows.map(row=>row.asset.id),[asset.id]);
});

test('flest krav kommer først uten at kildearrayet muteres', () => {
  const before=structuredClone(assets);
  const result=run();
  assert.equal(result.rows[0].asset.id,'CW-DOC-002');
  for(let i=1;i<result.rows.length;i++)assert.ok(result.rows[i-1].required>=result.rows[i].required);
  assert.deepEqual(assets,before);
});

test('alfabetisk sortering bruker norsk rekkefølge', () => {
  const result=run({sort:'title'});
  const expected=assets.map(a=>a.title).sort((a,b)=>a.localeCompare(b,'nb-NO'));
  assert.deepEqual(result.rows.map(row=>row.asset.title),expected);
});

test('oppfølgingsantall avgrenses av søk, type og status', () => {
  const result=run({query:'CW-DOC',type:'Document collection',status:'Draft'});
  const matching=assets.filter(a=>a.id.includes('CW-DOC')&&a.type==='Document collection'&&a.status==='Draft');
  assert.equal(result.counts.all,matching.length);
  assert.equal(result.rows.length,matching.length);
  for(const attention of ['required','owners','review']) {
    const filtered=run({...result.filters,attention});
    assert.equal(filtered.rows.length,result.counts[attention]);
  }
});

test('ansvarsfilter bruker reglene, også når et eierfelt bare inneholder mellomrom', () => {
  const sample=[{...assets[0],owner:'   '}];
  assert.equal(buildCatalog(sample,[],{attention:'owners'}).rows.length,1);
});

test('revisjonsfilter følger samme faste dato som diagnosen', () => {
  const result=run({attention:'review'});
  assert.ok(result.rows.length>0);
  assert.ok(result.rows.every(row=>row.findings.some(f=>f.id==='META-008')));
  assert.equal(buildCatalog([{...assets[0],reviewDate:DEMO_TODAY}],[],{attention:'review'}).rows.length,0);
});

test('utbedring oppdaterer oppfølgingskø og antall', () => {
  const changed=assets.map(a=>a.id==='CW-DOC-002'?applySuggestedRemediation(a,'META-008'):a);
  const before=run({attention:'review'});
  const after=buildCatalog(changed,relationships,{attention:'review'});
  assert.equal(after.counts.review,before.counts.review-1);
});

test('en filtrert bort ressurs vises aldri som valgt', () => {
  const result=run({query:'CW-DOC-001'},'CW-DOC-002');
  assert.equal(result.selected.asset.id,'CW-DOC-001');
  assert.equal(run({query:'finnes-ikke'},'CW-DOC-002').selected,null);
  assert.equal(buildCatalog([],[],{}).selected,null);
});

test('gyldig valgt ressurs bevares selv om rekkefølgen endres', () => {
  assert.equal(run({sort:'title'},'CW-DOC-002').selected.asset.id,'CW-DOC-002');
});

test('kravantallet i hver rad er identisk med diagnosen', () => {
  for(const row of run().rows) {
    assert.equal(row.required,validateAsset(row.asset,assets,relationships).filter(x=>x.severity==='required').length);
  }
});

test('tom katalog viser en tilbakestillingshandling, ikke en gammel diagnose', () => {
  const html=catalog({state:{catalogFilters:{query:'finnes-ikke'},selectedAssetId:'CW-DOC-002',detailOpen:true},assets,relationships,can:()=>true});
  assert.match(html,/Ingen ressurser passer/);
  assert.match(html,/data-action="catalog-reset"/);
  assert.doesNotMatch(html,/id="catalog-inspector"|Forklarbar diagnose/);
});

test('katalogvisningen escaper søk og ressursnavn', () => {
  const title='<img src=x onerror=alert(1)>';
  const html=catalog({state:{catalogFilters:{},selectedAssetId:assets[0].id},assets:[{...assets[0],title}],relationships:[],can:()=>true});
  assert.ok(html.includes('&lt;img'));
  assert.ok(!html.includes('<img'));
  const query='"><svg onload=alert(1)>';
  const empty=catalog({state:{catalogFilters:{query}},assets,relationships,can:()=>true});
  assert.ok(!empty.includes('<svg'));
});
