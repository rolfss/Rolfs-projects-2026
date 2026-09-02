import { assets as seedAssets, relationships, initialBacklog, auditSeed } from './data.mjs';
import { applySuggestedRemediation, assessReadiness, buildBacklogFromAssessment, calculateQuality, createGovernanceBrief, priorityScore, validateAsset } from './engine.mjs';
import { audit, backlog, catalog, lineage, overview, readiness } from './views.mjs';

const KEY='metaready-demo-v2';
const permissions={viewer:[],steward:['register','remediate'],information_architect:['register','remediate'],approver:['workflow'],admin:['register','remediate','workflow']};
const defaults=()=>({assets:structuredClone(seedAssets),backlog:structuredClone(initialBacklog),audit:structuredClone(auditSeed),role:'steward',activeView:'overview',selectedAssetId:'CW-DOC-002',readinessAssetId:'CW-DOC-002',lineageAssetId:'CW-DOC-001',useCaseId:'rag_assistant',detailOpen:false,catalogFilters:{query:'',type:'',status:'',ownerGap:false}});
let state=load();
const main=document.querySelector('#main-content');
const role=document.querySelector('#role-select');
const dialog=document.querySelector('#asset-dialog');
const form=document.querySelector('#asset-form');
role.value=state.role;

function load(){try{return {...defaults(),...JSON.parse(localStorage.getItem(KEY))};}catch{return defaults();}}
function save(){localStorage.setItem(KEY,JSON.stringify(state));}
const can=p=>permissions[state.role]?.includes(p);
const roleName=r=>({viewer:'Leser',steward:'Informasjonsforvalter',information_architect:'Informasjonsarkitekt',approver:'Godkjenner',admin:'Administrator'}[r]||r);
const statusName=s=>({Draft:'Utkast',Review:'Til vurdering',Approved:'Godkjent',Published:'Publisert',Open:'Åpen','In progress':'Pågår',Done:'Ferdig'}[s]||s);
function addAudit(action,subject,detail){state.audit.unshift({id:`AUD-${Date.now()}`,at:new Date().toISOString(),actor:roleName(state.role),action,subject,detail});}
function toast(message){const region=document.querySelector('#toast-region');const el=document.createElement('div');el.className='toast';el.textContent=message;region.append(el);setTimeout(()=>el.remove(),3600);}
function require(permission){if(can(permission))return true;toast(`Rollen «${roleName(state.role)}» har ikke tilgang til denne handlingen.`);return false;}

function render(){
  const ctx={state,assets:state.assets,relationships,can};
  const views={overview,catalog,readiness,lineage,backlog,audit};
  main.innerHTML=(views[state.activeView]||overview)(ctx);
  document.querySelectorAll('[data-view]').forEach(el=>el.classList.toggle('is-active',el.dataset.view===state.activeView));
  main.focus({preventScroll:true});
}
function go(view){state.activeView=view;state.detailOpen=false;save();render();}
function inspect(id){state.selectedAssetId=id;state.activeView='catalog';state.detailOpen=true;save();render();}
function updateFilters(keepFocus=false){state.catalogFilters={query:document.querySelector('#catalog-query')?.value||'',type:document.querySelector('#catalog-type')?.value||'',status:document.querySelector('#catalog-status')?.value||'',ownerGap:document.querySelector('#catalog-owner-gap')?.checked||false};save();main.innerHTML=catalog({state,assets:state.assets,relationships,can});if(keepFocus){const q=document.querySelector('#catalog-query');q?.focus();q?.setSelectionRange(q.value.length,q.value.length);}}
function impacted(id){const ids=new Set(relationships.filter(r=>r.from===id).map(r=>r.to));return state.assets.filter(a=>ids.has(a.id));}
function brief(id){const asset=state.assets.find(a=>a.id===id)||state.assets[0];const findings=validateAsset(asset,state.assets,relationships);const quality=calculateQuality(asset,findings);const assessment=assessReadiness(asset,state.useCaseId);const related=state.backlog.filter(b=>b.assetIds.includes(asset.id));download(`${asset.id.toLowerCase()}-styringsnotat.md`,createGovernanceBrief(asset,findings,quality,assessment,impacted(asset.id),related),'text/markdown;charset=utf-8');addAudit('Eksporterte styringsnotat',asset.title,`Notat for ${assessment.useCase.label} ble laget lokalt.`);save();toast('Styringsnotatet er eksportert.');}
function download(name,content,type){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=Object.assign(document.createElement('a'),{href:url,download:name});a.click();setTimeout(()=>URL.revokeObjectURL(url),500);}
function csvCell(value){let s=String(value??'');if(/^[=+\-@]/.test(s))s=`'${s}`;return `"${s.replaceAll('"','""')}"`;}
function exportBacklog(){const rows=[['Prioritet','Tiltak','Ressurser','Ansvarlig rolle','Status','Begrunnelse'],...state.backlog.map(x=>[priorityScore(x),x.title,x.assetIds.join('; '),x.ownerRole,statusName(x.status),x.reason])];download('metaready-tiltakslogg.csv',rows.map(r=>r.map(csvCell).join(',')).join('\n'),'text/csv;charset=utf-8');toast('Tiltaksloggen er eksportert.');}
function remediate(id,ruleId){if(!require('remediate'))return;const index=state.assets.findIndex(a=>a.id===id);const before=state.assets[index];state.assets[index]=applySuggestedRemediation(before,ruleId);addAudit('Brukte foreslått utbedring',before.title,`${ruleId} ble oppdatert; versjon ${before.version} → ${state.assets[index].version}.`);save();render();toast(`${ruleId} er utbedret i demoen.`);}
function workflow(id,next){if(!require('workflow'))return;const asset=state.assets.find(a=>a.id===id);const before=asset.status;asset.status=next;asset.version=asset.version.replace(/\d+$/,String(Number(asset.version.split('.').at(-1)||0)+1));addAudit(`Endret arbeidsflyt: ${statusName(before)} → ${statusName(next)}`,asset.title,`Status ble endret av ${roleName(state.role)}.`);save();render();toast(`Status endret til ${statusName(next)}.`);}
function addAssessmentActions(id){if(!require('remediate'))return;const asset=state.assets.find(a=>a.id===id);const assessment=assessReadiness(asset,state.useCaseId);const existing=new Set(state.backlog.map(b=>`${b.assetIds[0]}:${b.title}`));const additions=buildBacklogFromAssessment(asset,assessment).filter(b=>!existing.has(`${asset.id}:${b.title}`));state.backlog.push(...additions);addAudit('Opprettet tiltak fra AI-vurdering',asset.title,`${additions.length} nye tiltak for ${assessment.useCase.label}.`);state.activeView='backlog';save();render();toast(`${additions.length} nye tiltak opprettet.`);}
function register(fd){if(!require('register'))return;const id=`CW-${String(fd.get('type')).startsWith('Data service')?'API':'NEW'}-${String(state.assets.length+1).padStart(3,'0')}`;const asset={id,title:fd.get('title'),type:fd.get('type'),unit:'Ny registrering',description:fd.get('description'),owner:fd.get('owner'),steward:fd.get('steward'),status:'Draft',sensitivity:fd.get('sensitivity'),provenance:fd.get('provenance'),accessRights:fd.get('accessRights'),retention:fd.get('retention'),updateFrequency:fd.get('updateFrequency'),reviewDate:fd.get('reviewDate'),version:'0.1.0',glossaryCoverage:0,qualityEvidence:'',lawfulBasis:'',contact:'',aiAllowed:false,machineReadable:false,identifiersStable:true,documentationValue:'Ikke vurdert'};state.assets.unshift(asset);state.selectedAssetId=id;state.activeView='catalog';state.detailOpen=true;addAudit('Registrerte informasjonsressurs',asset.title,`${asset.id} ble opprettet som utkast og automatisk validert.`);save();dialog.close();form.reset();render();toast('Ressursen er registrert og validert.');}

let searchTimer;
document.addEventListener('click',event=>{
  const el=event.target.closest('[data-view],[data-action]');if(!el)return;
  if(el.dataset.view){go(el.dataset.view);return;}
  const action=el.dataset.action;
  if(action==='open-register'){if(require('register')){dialog.showModal();form.elements.title.focus();}}
  if(action==='close-dialog')dialog.close();
  if(action==='inspect')inspect(el.dataset.id);
  if(action==='select'){state.selectedAssetId=el.dataset.id;save();updateFilters();}
  if(action==='detail'){state.selectedAssetId=el.dataset.id;state.detailOpen=true;save();render();}
  if(action==='close-detail'){state.detailOpen=false;save();render();}
  if(action==='brief')brief(el.dataset.id);
  if(action==='remediate')remediate(el.dataset.id,el.dataset.rule);
  if(action==='workflow')workflow(el.dataset.id,el.dataset.next);
  if(action==='assessment-backlog')addAssessmentActions(el.dataset.id);
  if(action==='lineage-select'){state.lineageAssetId=el.dataset.id;save();render();}
  if(action==='record-impact'){const asset=state.assets.find(a=>a.id===el.dataset.id);addAudit('Registrerte konsekvensbeslutning',asset.title,'Berørte eiere skal konsulteres før en vesentlig endring publiseres.');save();toast('Beslutningen er registrert i styringssporet.');}
  if(action==='export-backlog')exportBacklog();
  if(action==='reset-demo'&&confirm('Nullstille lokale endringer og gå tilbake til de syntetiske eksempeldataene?')){state=defaults();localStorage.removeItem(KEY);role.value=state.role;render();toast('Demoen er nullstilt.');}
});
document.addEventListener('change',event=>{
  const el=event.target;
  if(el.id==='role-select'){state.role=el.value;save();render();toast(`Demorolle: ${roleName(state.role)}.`);}
  if(['catalog-type','catalog-status','catalog-owner-gap'].includes(el.id))updateFilters();
  if(el.id==='readiness-asset'){state.readinessAssetId=el.value;save();render();}
  if(el.id==='use-case'){state.useCaseId=el.value;save();render();}
  if(el.id==='lineage-asset'){state.lineageAssetId=el.value;save();render();}
  if(el.dataset.action==='backlog-status'){if(!require('remediate')){render();return;}const item=state.backlog.find(x=>x.id===el.dataset.id);const before=item.status;item.status=el.value;addAudit(`Endret tiltak: ${statusName(before)} → ${statusName(item.status)}`,item.title,`Tiltaksstatus ble oppdatert av ${roleName(state.role)}.`);save();toast('Tiltaksstatus er oppdatert.');}
});
document.addEventListener('input',event=>{if(event.target.id==='catalog-query'){clearTimeout(searchTimer);searchTimer=setTimeout(()=>updateFilters(true),160);}});
document.addEventListener('keydown',event=>{const row=event.target.closest('tr[data-action="select"]');if(row&&(event.key==='Enter'||event.key===' ')){event.preventDefault();row.click();}});
form.addEventListener('submit',event=>{event.preventDefault();register(new FormData(form));});
render();
