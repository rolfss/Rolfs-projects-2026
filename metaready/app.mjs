import { assets as seedAssets, relationships, initialBacklog, auditSeed } from './data.mjs';
import { applySuggestedRemediation, assessReadiness, buildBacklogFromAssessment, calculateQuality, createGovernanceBrief, priorityScore, validateAsset } from './engine.mjs';
import { audit, backlog, catalog, lineage, overview, readiness } from './views.mjs';
import { buildPortfolioBrief } from './portfolio-brief.mjs';
import { buildCatalog, normalizeFilters } from './catalog-model.mjs';
import { createDemoStore } from './state-store.mjs';

const KEY='metaready-demo-v2';
const permissions={viewer:[],steward:['register','remediate'],information_architect:['register','remediate'],approver:['workflow'],admin:['register','remediate','workflow']};
const defaults=()=>({assets:structuredClone(seedAssets),backlog:structuredClone(initialBacklog),audit:structuredClone(auditSeed),role:'steward',activeView:'overview',selectedAssetId:'CW-DOC-002',readinessAssetId:'CW-DOC-002',lineageAssetId:'CW-DOC-001',useCaseId:'rag_assistant',detailOpen:false,catalogFilters:normalizeFilters()});
const store=createDemoStore(KEY,defaults);
const loaded=store.read();
let state=loaded.state;
const main=document.querySelector('#main-content');
const role=document.querySelector('#role-select');
const dialog=document.querySelector('#asset-dialog');
const form=document.querySelector('#asset-form');
const guide=document.querySelector('#demo-guide');
role.value=state.role;
showStorageProblem(loaded.problem);

function showStorageProblem(problem){
  const warning=document.querySelector('#storage-warning');
  warning.hidden=!problem;
  warning.textContent=problem==='invalid'
    ?'Lagrede demodata kunne ikke leses og blir ikke overskrevet. Du kan fortsette i denne fanen, eller bruke «Nullstill demo» for å starte ny lagring.'
    :'Nettleseren kan ikke lagre endringene. Du kan fortsette i denne fanen, men nye endringer kan gå tapt når den lukkes.';
}
function save(){showStorageProblem(store.write(state));}
const can=p=>permissions[state.role]?.includes(p);
const roleName=r=>({viewer:'Leser',steward:'Informasjonsforvalter',information_architect:'Informasjonsarkitekt',approver:'Godkjenner',admin:'Administrator'}[r]||r);
const statusName=s=>({Draft:'Utkast',Review:'Til vurdering',Approved:'Godkjent',Published:'Publisert',Open:'Åpen','In progress':'Pågår',Done:'Ferdig'}[s]||s);
function addAudit(action,subject,detail){state.audit.unshift({id:`AUD-${Date.now()}`,at:new Date().toISOString(),actor:roleName(state.role),action,subject,detail});}
function toast(message){const region=document.querySelector('#toast-region');const el=document.createElement('div');el.className='toast';el.textContent=message;region.append(el);setTimeout(()=>el.remove(),3600);}
function require(permission){if(can(permission))return true;toast(`Rollen «${roleName(state.role)}» har ikke tilgang til denne handlingen.`);return false;}

function render(){
  const ctx={state,assets:state.assets,relationships,can};
  const views={overview,catalog,readiness,lineage,backlog,audit};
  clearTimeout(searchTimer);
  if(state.activeView==='catalog')syncCatalogSelection();
  main.innerHTML=(views[state.activeView]||overview)(ctx);
  document.querySelectorAll('#primary-nav [data-view]').forEach(el=>{const active=el.dataset.view===state.activeView;el.classList.toggle('is-active',active);if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
  main.focus({preventScroll:true});
}
function go(view){state.activeView=view;state.detailOpen=false;save();render();}
function inspect(id){state.catalogFilters=normalizeFilters();state.selectedAssetId=id;state.activeView='catalog';state.detailOpen=true;save();render();}
function syncCatalogSelection(){
  const selected=buildCatalog(state.assets,relationships,state.catalogFilters,state.selectedAssetId).selected;
  state.selectedAssetId=selected?.asset.id||'';
  if(!selected)state.detailOpen=false;
}
function updateFilters(){
  if(state.activeView!=='catalog')return;
  clearTimeout(searchTimer);
  const focused=document.activeElement;
  const focusId=focused?.id;
  const rowId=focused?.matches('button[data-action="select"]')?focused.dataset.id:null;
  const attention=focused?.dataset?.attention;
  const scroller=main.querySelector('.catalog-list .table-wrap');
  const scroll=rowId&&scroller?[scroller.scrollLeft,scroller.scrollTop]:null;
  const selection=focusId==='catalog-query'?[focused.selectionStart,focused.selectionEnd]:null;
  state.catalogFilters=normalizeFilters({...state.catalogFilters,
    query:document.querySelector('#catalog-query')?.value??state.catalogFilters.query,
    type:document.querySelector('#catalog-type')?.value??state.catalogFilters.type,
    status:document.querySelector('#catalog-status')?.value??state.catalogFilters.status,
    sort:document.querySelector('#catalog-sort')?.value??state.catalogFilters.sort});
  syncCatalogSelection();save();
  main.innerHTML=catalog({state,assets:state.assets,relationships,can});
  const target=focusId?document.getElementById(focusId):rowId?
    [...main.querySelectorAll('button[data-action="select"]')].find(x=>x.dataset.id===rowId):
    [...main.querySelectorAll('[data-attention]')].find(x=>x.dataset.attention===attention);
  target?.focus({preventScroll:true});
  if(scroll){const list=main.querySelector('.catalog-list .table-wrap');if(list){list.scrollLeft=scroll[0];list.scrollTop=scroll[1];}}
  document.querySelector('#catalog-announcement').textContent=document.querySelector('#catalog-results')?.textContent||'';
  if(selection&&target)target.setSelectionRange(...selection);
}
function resetCatalogFilters(){state.catalogFilters=normalizeFilters();state.detailOpen=false;save();render();document.querySelector('#catalog-query')?.focus();}

function impacted(id){const ids=new Set(relationships.filter(r=>r.from===id).map(r=>r.to));return state.assets.filter(a=>ids.has(a.id));}
function brief(id){const asset=state.assets.find(a=>a.id===id)||state.assets[0];const findings=validateAsset(asset,state.assets,relationships);const quality=calculateQuality(asset,findings);const assessment=assessReadiness(asset,state.useCaseId);const related=state.backlog.filter(b=>b.assetIds.includes(asset.id));download(`${asset.id.toLowerCase()}-styringsnotat.md`,createGovernanceBrief(asset,findings,quality,assessment,impacted(asset.id),related),'text/markdown;charset=utf-8');addAudit('Eksporterte styringsnotat',asset.title,`Notat for ${assessment.useCase.label} ble laget lokalt.`);save();toast('Styringsnotatet er eksportert.');}
function download(name,content,type){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=Object.assign(document.createElement('a'),{href:url,download:name});a.click();setTimeout(()=>URL.revokeObjectURL(url),500);}
function csvCell(value){let s=String(value??'');if(/^[=+\-@]/.test(s))s=`'${s}`;return `"${s.replaceAll('"','""')}"`;}
function exportBacklog(){const rows=[['Prioritet','Tiltak','Ressurser','Ansvarlig rolle','Status','Begrunnelse'],...state.backlog.map(x=>[priorityScore(x),x.title,x.assetIds.join('; '),x.ownerRole,statusName(x.status),x.reason])];download('metaready-tiltakslogg.csv',rows.map(r=>r.map(csvCell).join(',')).join('\n'),'text/csv;charset=utf-8');toast('Tiltaksloggen er eksportert.');}
function exportPortfolioBrief(){download('metaready-ledelsesbrief.md',buildPortfolioBrief(state,relationships),'text/markdown;charset=utf-8');addAudit('Eksporterte ledelsesbrief','Informasjonsporteføljen','Porteføljestatus, styringsgap og prioriterte tiltak ble sammenstilt lokalt.');save();toast('Ledelsesbriefen er eksportert.');}
const demoSteps={
  1:{activeView:'overview',message:'1/6: Start med porteføljebildet og styringsgapene.'},
  2:{activeView:'catalog',selectedAssetId:'CW-DOC-002',detailOpen:true,message:'2/6: Åpne Eldre prosedyrearkiv og se manglene med bevis.'},
  3:{activeView:'readiness',readinessAssetId:'CW-DOC-002',useCaseId:'rag_assistant',message:'3/6: Vurder samme ressurs som kilde for en RAG-assistent.'},
  4:{activeView:'lineage',lineageAssetId:'CW-DOC-001',message:'4/6: Følg relasjoner og se hva en endring kan påvirke.'},
  5:{activeView:'backlog',message:'5/6: Se hvordan funn blir prioritert som konkrete tiltak.'},
  6:{activeView:'audit',message:'6/6: Avslutt i styringssporet og se hva som er dokumentert.'}
};
let currentDemoStep=1;
function runDemoStep(step){
  currentDemoStep=Math.max(1,Math.min(6,Number(step)||1));
  const {message,...changes}=demoSteps[currentDemoStep];
  Object.assign(state,{detailOpen:false},changes);
  if(currentDemoStep===2)state.catalogFilters=normalizeFilters();
  save();render();guide.hidden=false;
  guide.querySelectorAll('[data-step]').forEach(button=>{const active=Number(button.dataset.step)===currentDemoStep;button.classList.toggle('is-current',active);if(active)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');});
  document.querySelector('#demo-guide-status').textContent=message;
  const previous=guide.querySelector('[data-action="demo-previous"]');
  const next=guide.querySelector('[data-action="demo-next"]');
  previous.disabled=currentDemoStep===1;
  next.textContent=currentDemoStep===6?'Avslutt demo':'Neste →';
  next.focus({preventScroll:true});
}
function closeGuide(){guide.hidden=true;document.querySelector('[data-action="guided-demo"]')?.focus({preventScroll:true});}
function remediate(id,ruleId){if(!require('remediate'))return;const index=state.assets.findIndex(a=>a.id===id);const before=state.assets[index];state.assets[index]=applySuggestedRemediation(before,ruleId);addAudit('Brukte foreslått utbedring',before.title,`${ruleId} ble oppdatert; versjon ${before.version} → ${state.assets[index].version}.`);save();render();toast(`${ruleId} er utbedret i demoen.`);}
function workflow(id,next){if(!require('workflow'))return;const asset=state.assets.find(a=>a.id===id);const before=asset.status;asset.status=next;asset.version=asset.version.replace(/\d+$/,String(Number(asset.version.split('.').at(-1)||0)+1));addAudit(`Endret arbeidsflyt: ${statusName(before)} → ${statusName(next)}`,asset.title,`Status ble endret av ${roleName(state.role)}.`);save();render();toast(`Status endret til ${statusName(next)}.`);}
function addAssessmentActions(id){if(!require('remediate'))return;const asset=state.assets.find(a=>a.id===id);const assessment=assessReadiness(asset,state.useCaseId);const existing=new Set(state.backlog.map(b=>`${b.assetIds[0]}:${b.title}`));const additions=buildBacklogFromAssessment(asset,assessment).filter(b=>!existing.has(`${asset.id}:${b.title}`));state.backlog.push(...additions);addAudit('Opprettet tiltak fra AI-vurdering',asset.title,`${additions.length} nye tiltak for ${assessment.useCase.label}.`);state.activeView='backlog';save();render();toast(`${additions.length} nye tiltak opprettet.`);}
function register(fd){if(!require('register'))return;const id=`CW-${String(fd.get('type')).startsWith('Data service')?'API':'NEW'}-${String(state.assets.length+1).padStart(3,'0')}`;const asset={id,title:fd.get('title'),type:fd.get('type'),unit:'Ny registrering',description:fd.get('description'),owner:fd.get('owner'),steward:fd.get('steward'),status:'Draft',sensitivity:fd.get('sensitivity'),provenance:fd.get('provenance'),accessRights:fd.get('accessRights'),retention:fd.get('retention'),updateFrequency:fd.get('updateFrequency'),reviewDate:fd.get('reviewDate'),version:'0.1.0',glossaryCoverage:0,qualityEvidence:'',lawfulBasis:'',contact:'',aiAllowed:false,machineReadable:false,identifiersStable:true,documentationValue:'Ikke vurdert'};state.assets.unshift(asset);state.catalogFilters=normalizeFilters();state.selectedAssetId=id;state.activeView='catalog';state.detailOpen=true;addAudit('Registrerte informasjonsressurs',asset.title,`${asset.id} ble opprettet som utkast og automatisk validert.`);save();dialog.close();form.reset();render();toast('Ressursen er registrert og validert.');}

let searchTimer;
document.addEventListener('click',event=>{
  const el=event.target.closest('[data-view],[data-action]');if(!el)return;
  if(el.dataset.view){go(el.dataset.view);return;}
  const action=el.dataset.action;
  if(action==='open-register'){if(require('register')){dialog.showModal();form.elements.title.focus();}}
  if(action==='close-dialog')dialog.close();
  if(action==='inspect')inspect(el.dataset.id);
  if(action==='select'){const button=[...main.querySelectorAll('button[data-action="select"]')].find(x=>x.dataset.id===el.dataset.id);button?.focus({preventScroll:true});state.selectedAssetId=el.dataset.id;updateFilters();}
  if(action==='detail'){state.selectedAssetId=el.dataset.id;state.detailOpen=true;save();render();const detail=main.querySelector('.detail');detail?.setAttribute('tabindex','-1');detail?.focus();}
  if(action==='close-detail'){state.detailOpen=false;save();render();}
  if(action==='catalog-attention'){state.catalogFilters.attention=el.dataset.attention;updateFilters();}
  if(action==='catalog-reset')resetCatalogFilters();
  if(action==='assess-selected'){state.readinessAssetId=el.dataset.id;go('readiness');}
  if(action==='brief')brief(el.dataset.id);
  if(action==='remediate')remediate(el.dataset.id,el.dataset.rule);
  if(action==='workflow')workflow(el.dataset.id,el.dataset.next);
  if(action==='assessment-backlog')addAssessmentActions(el.dataset.id);
  if(action==='lineage-select'){state.lineageAssetId=el.dataset.id;save();render();}
  if(action==='record-impact'){const asset=state.assets.find(a=>a.id===el.dataset.id);addAudit('Registrerte konsekvensbeslutning',asset.title,'Berørte eiere skal konsulteres før en vesentlig endring publiseres.');save();toast('Beslutningen er registrert i styringssporet.');}
  if(action==='export-backlog')exportBacklog();
  if(action==='portfolio-brief')exportPortfolioBrief();
  if(action==='guided-demo'){guide.hidden=false;runDemoStep(1);}
  if(action==='close-guide')closeGuide();
  if(action==='demo-previous')runDemoStep(currentDemoStep-1);
  if(action==='demo-next'){if(currentDemoStep===6)closeGuide();else runDemoStep(currentDemoStep+1);}
  if(action==='demo-step')runDemoStep(el.dataset.step);
  if(action==='reset-demo'&&confirm('Nullstille lokale endringer og gå tilbake til de syntetiske eksempeldataene?')){state=defaults();showStorageProblem(store.clear());role.value=state.role;guide.hidden=true;render();toast('Demoen er nullstilt.');}
});
document.addEventListener('change',event=>{
  const el=event.target;
  if(el.id==='role-select'){state.role=el.value;save();render();toast(`Demorolle: ${roleName(state.role)}.`);}
  if(['catalog-type','catalog-status','catalog-sort'].includes(el.id))updateFilters();
  if(el.id==='readiness-asset'){state.readinessAssetId=el.value;save();render();}
  if(el.id==='use-case'){state.useCaseId=el.value;save();render();}
  if(el.id==='lineage-asset'){state.lineageAssetId=el.value;save();render();}
  if(el.dataset.action==='backlog-status'){if(!require('remediate')){render();return;}const item=state.backlog.find(x=>x.id===el.dataset.id);const before=item.status;item.status=el.value;addAudit(`Endret tiltak: ${statusName(before)} → ${statusName(item.status)}`,item.title,`Tiltaksstatus ble oppdatert av ${roleName(state.role)}.`);save();toast('Tiltaksstatus er oppdatert.');}
});
document.addEventListener('input',event=>{if(event.target.id==='catalog-query'){state.catalogFilters.query=event.target.value;clearTimeout(searchTimer);searchTimer=setTimeout(()=>updateFilters(),160);}});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!guide.hidden&&!dialog.open){event.preventDefault();closeGuide();}});
form.addEventListener('submit',event=>{event.preventDefault();register(new FormData(form));});
render();
