export const DEMO_TODAY = '2026-08-28';
export const PROFILE = {
  id:'INTERNAL_ASSET_MINIMUM_V1', label:'Internal information-asset minimum',
  limitation:'A demonstrator profile inspired by common public-sector metadata practice. It is not a DCAT-AP-NO validator, legal opinion or compliance certification.'
};
export const USE_CASES = {
  enterprise_search:{id:'enterprise_search',label:'Enterprise search',description:'Index approved information so employees can find authoritative sources.'},
  rag_assistant:{id:'rag_assistant',label:'Retrieval-augmented assistant',description:'Ground generated answers in governed organizational content.'},
  analytical_reporting:{id:'analytical_reporting',label:'Analytical reporting',description:'Use the asset for repeatable metrics, trends and management decisions.'},
  classification_routing:{id:'classification_routing',label:'Classification and routing',description:'Use information to classify, prioritize or route work.'},
  agent_source:{id:'agent_source',label:'Agent tool source',description:'Allow an AI agent to retrieve or act through the source under controls.'}
};
const date = value => value ? new Date(`${value}T00:00:00Z`) : null;
const days = (a,b) => Math.round((date(b)-date(a))/86400000);
const clamp = value => Math.max(0,Math.min(100,Math.round(value)));
const missing = value => !value || (typeof value === 'string' && !value.trim());
const rule = (id,label,severity,failed,why,evidence,fix,field) => ({id,label,severity,failed,why,evidence,fix,field});

export function validateAsset(asset, allAssets=[], relationships=[]) {
  const incoming = relationships.filter(r => r.from===asset.id || r.to===asset.id);
  const rules = [
    rule('META-001','Accountable owner','required',missing(asset.owner),'Decisions and risk acceptance need a named accountable role',asset.owner||'No owner recorded','Assign a durable business owner','owner'),
    rule('META-002','Operational steward','required',missing(asset.steward),'Quality issues need an operational point of responsibility',asset.steward||'No steward recorded','Assign an information steward','steward'),
    rule('META-003','Purpose and scope','required',missing(asset.description)||asset.description.length<80,'Users need to understand intended use and boundaries',`${asset.description?.length||0} descriptive characters`,'Document purpose, scope and exclusions','description'),
    rule('META-004','Sensitivity','required',missing(asset.sensitivity),'Access and AI controls depend on classification',asset.sensitivity||'Not assessed','Complete information-classification review','sensitivity'),
    rule('META-005','Access conditions','required',missing(asset.accessRights),'Availability must be separated from authorization',asset.accessRights||'No conditions recorded','State who may access the asset and how','accessRights'),
    rule('META-006','Provenance','required',missing(asset.provenance),'Trust depends on knowing origin and transformation history',asset.provenance||'No provenance evidence','Record source, collection and transformation evidence','provenance'),
    rule('META-007','Lifecycle rule','required',missing(asset.retention),'Disposal and preservation must be deliberate',asset.retention||'No lifecycle rule','Assign retention or preservation rule','retention'),
    rule('META-008','Review currency','required',!asset.reviewDate||days(DEMO_TODAY,asset.reviewDate)<0,'Stale metadata increases operational and AI risk',asset.reviewDate?`Review date ${asset.reviewDate}`:'No review date','Set and complete a future review','reviewDate'),
    rule('META-009','Stable identifier','required',!asset.identifiersStable,'Lineage and citations need durable identifiers',asset.identifiersStable?'Stable identifier confirmed':'Stability not confirmed','Verify a persistent identifier policy','identifiersStable'),
    rule('META-010','Machine usability','required',!asset.machineReadable,'Search, validation and AI reuse require extractable content',asset.machineReadable?'Machine-readable':'Not machine-readable','Create an accessible machine-readable representation','machineReadable'),
    rule('META-011','Terminology coverage','recommended',(asset.glossaryCoverage||0)<70,'Shared terms reduce interpretation drift',`${asset.glossaryCoverage||0}% mapped to governed terminology`,'Map key concepts to glossary terms','glossaryCoverage'),
    rule('META-012','Relationship evidence','recommended',incoming.length===0,'Impact analysis needs documented dependencies',`${incoming.length} direct relationship(s)`,'Record at least one meaningful, evidenced relationship','relationships')
  ];
  return rules.filter(r=>r.failed).map(({failed,...finding})=>finding);
}

export function calculateQuality(asset, findings=[]) {
  const failed = id => findings.some(f=>f.id===id);
  return [
    ['Completeness',100-findings.filter(f=>f.severity==='required').length*11,'Required metadata present'],
    ['Ownership',failed('META-001')||failed('META-002')?25:100,'Owner and steward evidence'],
    ['Currency',failed('META-008')?25:100,asset.reviewDate||'No review date'],
    ['Provenance',failed('META-006')?20:100,asset.provenance||'No evidence'],
    ['Accessibility',failed('META-005')?35:100,asset.accessRights||'No conditions'],
    ['Machine usability',failed('META-010')?15:100,asset.machineReadable?'Extractable':'Not extractable'],
    ['Terminology',asset.glossaryCoverage||0,`${asset.glossaryCoverage||0}% coverage`],
    ['Identifier stability',failed('META-009')?20:100,asset.identifiersStable?'Confirmed':'Unconfirmed'],
    ['Lifecycle',failed('META-007')?25:100,asset.retention||'No rule'],
    ['Evidence',asset.qualityEvidence?90:25,asset.qualityEvidence||'No quality evidence']
  ].map(([label,score,evidence],index)=>({id:`Q-${index+1}`,label,score:clamp(score),evidence}));
}

const dimension = (id,label,score,evidence,action,role,assumption='Assessment uses only recorded metadata and does not inspect source content.') => ({
  id,label,score:clamp(score),result:score>=80?'Pass':score>=55?'Control required':'Blocker',evidence,action,accountableRole:role,confidence:evidence.includes('No ')||evidence.includes('not ')?'Low':'Medium',assumption
});
export function assessReadiness(asset,useCaseId='rag_assistant') {
  const useCase = USE_CASES[useCaseId]||USE_CASES.rag_assistant;
  const dims = [
    dimension('AR-01','Accountability',asset.owner&&asset.steward?95:20,asset.owner&&asset.steward?`${asset.owner}; ${asset.steward}`:'No complete owner/steward chain','Assign accountable owner and operational steward','Information owner'),
    dimension('AR-02','Purpose fit',asset.description?.length>=80?90:35,asset.description||'No scoped purpose','Document intended use, exclusions and users','Product owner'),
    dimension('AR-03','Source authority',asset.provenance?88:25,asset.provenance||'No provenance evidence','Confirm origin, transformations and authoritative status','Information steward'),
    dimension('AR-04','Currency',asset.reviewDate&&days(DEMO_TODAY,asset.reviewDate)>=0?85:25,asset.reviewDate?`Next review ${asset.reviewDate}`:'No review date','Review metadata and representative content','Information steward'),
    dimension('AR-05','Access control',asset.sensitivity&&asset.accessRights?88:20,asset.accessRights||'No access conditions','Define identity, authorization and least privilege','Security lead'),
    dimension('AR-06','Privacy and lawful use',asset.sensitivity==='Confidential'?(asset.lawfulBasis?70:20):90,asset.lawfulBasis||'No lawful-use statement','Complete privacy and lawful-use screening','Privacy adviser'),
    dimension('AR-07','Machine readability',asset.machineReadable?92:15,asset.machineReadable?'Machine-readable representation recorded':'Not machine-readable','Create accessible extractable content','Application owner'),
    dimension('AR-08','Terminology',asset.glossaryCoverage||0,`${asset.glossaryCoverage||0}% glossary coverage`,'Map high-impact concepts to governed terms','Information architect'),
    dimension('AR-09','Identifier stability',asset.identifiersStable?95:20,asset.identifiersStable?'Stable identifier confirmed':'Stability not confirmed','Establish durable identifiers and citation links','Information architect'),
    dimension('AR-10','Quality evidence',asset.qualityEvidence?85:25,asset.qualityEvidence||'No quality evidence','Define sampling, thresholds and monitoring','Data or content steward'),
    dimension('AR-11','Lifecycle control',asset.retention?85:25,asset.retention||'No lifecycle rule','Set retention, preservation and deletion behavior','Records manager'),
    dimension('AR-12','Permitted AI use',asset.aiAllowed?85:10,asset.aiAllowed?'AI reuse permitted subject to use-case controls':'AI reuse not approved','Record a bounded AI-use decision','Information owner'),
    dimension('AR-13','Human oversight',useCaseId==='enterprise_search'?90:65,useCaseId==='enterprise_search'?'Users select and interpret sources':'Human review required for consequential outputs','Define review, escalation and fallback','Service owner')
  ];
  let score = clamp(dims.reduce((sum,d)=>sum+d.score,0)/dims.length);
  const blockers = dims.filter(d=>d.result==='Blocker');
  let status = blockers.length>=2||score<55?'Not ready':blockers.length||score<80?'Ready with controls':'Ready';
  if (['rag_assistant','agent_source'].includes(useCaseId)&&!asset.aiAllowed) status='Not ready';
  return {useCase,score,status,dimensions:dims,blockers,limitation:'Readiness is decision support, not deployment approval. Security, privacy, legal, records and service owners retain accountability.'};
}

export function priorityScore(item) {
  const risk=item.riskReduction??item.risk??3;
  return clamp(((item.impact*.38)+(item.urgency*.27)+(risk*.35))/5*100-(Math.max(1,item.effort)-1)*7);
}
export function statusClass(status='') {
  const value=status.toLowerCase();
  if(value.includes('not')||value.includes('block')||value.includes('overdue')) return 'danger';
  if(value.includes('control')||value.includes('review')||value.includes('medium')||value.includes('open')) return 'warning';
  if(value.includes('ready')||value.includes('publish')||value.includes('approve')||value.includes('high')||value.includes('pass')) return 'good';
  return 'neutral';
}
export function buildBacklogFromAssessment(asset,assessment) {
  return assessment.dimensions.filter(d=>d.result!=='Pass').map((d,index)=>({
    id:`BL-${Date.now()}-${index}`,title:d.action,assetIds:[asset.id],impact:d.result==='Blocker'?5:3,riskReduction:d.result==='Blocker'?5:3,urgency:d.result==='Blocker'?4:2,effort:2,status:'Open',ownerRole:d.accountableRole,reason:d.evidence
  }));
}
export function portfolioMetrics(assets,relationships=[]) {
  const outcomes=assets.map(a=>assessReadiness(a,a.type==='Report/analytical product'?'analytical_reporting':'enterprise_search').status);
  const findings=assets.flatMap(a=>validateAsset(a,assets,relationships));
  return {assets:assets.length,relationships:relationships.length,published:assets.filter(a=>a.status==='Published').length,ownershipGaps:assets.filter(a=>!a.owner||!a.steward).length,criticalFindings:findings.filter(f=>f.severity==='required').length,ready:outcomes.filter(v=>v==='Ready').length,readyWithControls:outcomes.filter(v=>v==='Ready with controls').length,notReady:outcomes.filter(v=>v==='Not ready').length};
}
export function incrementVersion(version='0.0.0') { const p=version.split('.').map(Number); return `${p[0]||0}.${(p[1]||0)+1}.0`; }
export function applySuggestedRemediation(asset,ruleId) {
  const changes={
    'META-001':{owner:'Head of Shared Services'},'META-002':{steward:'Records Coordinator'},
    'META-003':{description:'Governed collection of operational procedures. Scope is limited to approved current procedures; superseded and unverified material is excluded from automated use.'},
    'META-004':{sensitivity:'Internal'},'META-005':{accessRights:'Employees with documented business need; restricted items require group authorization.'},
    'META-006':{provenance:'Migrated from named shared drives; source inventory and transformation log verified by Records Coordinator.'},
    'META-007':{retention:'Preserve approved procedures and decision history; dispose of duplicates after documented review.'},
    'META-008':{reviewDate:'2026-11-30'},'META-009':{identifiersStable:true},'META-010':{machineReadable:true},'META-011':{glossaryCoverage:75}
  };
  return {...asset,...(changes[ruleId]||{}),version:incrementVersion(asset.version)};
}
export function escapeHtml(value) { return String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
export function createGovernanceBrief(asset,findings,quality,assessment,impactedAssets=[],backlog=[]) {
  return `# Governance brief — ${asset.title}\n\nGenerated: ${DEMO_TODAY}\nAsset: ${asset.id} · version ${asset.version}\nOwner: ${asset.owner||'Unassigned'}\nSteward: ${asset.steward||'Unassigned'}\n\n## Decision context\nUse case: ${assessment.useCase.label}\nReadiness: ${assessment.status} (${assessment.score}/100)\n\n## Open profile findings\n${findings.length?findings.map(f=>`- ${f.id} ${f.label}: ${f.evidence}. Action: ${f.fix}.`).join('\n'):'- None under the active demonstration profile.'}\n\n## Quality evidence\n${quality.map(q=>`- ${q.label}: ${q.score}/100 — ${q.evidence}`).join('\n')}\n\n## Impacted assets\n${impactedAssets.length?impactedAssets.map(a=>`- ${a.id}: ${a.title}`).join('\n'):'- No direct downstream asset recorded.'}\n\n## Related remediation\n${backlog.length?backlog.map(b=>`- ${b.title} (${b.status})`).join('\n'):'- No related action recorded.'}\n\n## Assumptions and limitations\n${assessment.limitation} This demonstration does not inspect source content and is not legal approval, regulatory classification or compliance certification.\n`;
}
