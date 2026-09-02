export const DEMO_TODAY = '2026-08-28';
export const PROFILE = {
  id:'INTERNAL_ASSET_MINIMUM_V1', label:'Internt minimum for informasjonsressurser',
  limitation:'En demoprofil inspirert av vanlig metadatapraksis i offentlig sektor. Den er ikke en DCAT-AP-NO-validator, juridisk vurdering eller samsvarssertifisering.'
};
export const USE_CASES = {
  enterprise_search:{id:'enterprise_search',label:'Virksomhetssøk',description:'Indekser godkjent informasjon slik at ansatte finner autoritative kilder.'},
  rag_assistant:{id:'rag_assistant',label:'Kunnskapsassistent med RAG',description:'Forankre genererte svar i styrt og kjent innhold fra virksomheten.'},
  analytical_reporting:{id:'analytical_reporting',label:'Analytisk rapportering',description:'Bruk ressursen til gjentakbare målinger, trender og beslutningsstøtte.'},
  classification_routing:{id:'classification_routing',label:'Klassifisering og ruting',description:'Bruk informasjon til å klassifisere, prioritere eller rute arbeid.'},
  agent_source:{id:'agent_source',label:'Datakilde for KI-agent',description:'La en KI-agent hente informasjon eller utføre handlinger mot kilden under definerte kontroller.'}
};
const date = value => value ? new Date(`${value}T00:00:00Z`) : null;
const days = (a,b) => Math.round((date(b)-date(a))/86400000);
const clamp = value => Math.max(0,Math.min(100,Math.round(value)));
const missing = value => !value || (typeof value === 'string' && !value.trim());
const rule = (id,label,severity,failed,why,evidence,fix,field) => ({id,label,severity,failed,why,evidence,fix,field});
const displayStatus = value => ({
  'Ready':'Klar','Ready with controls':'Klar med tiltak','Not ready':'Ikke klar','Pass':'Bestått','Control required':'Tiltak kreves','Blocker':'Blokkerer',
  'Draft':'Utkast','Review':'Til vurdering','Approved':'Godkjent','Published':'Publisert','Open':'Åpen','In progress':'Pågår'
}[value] || value);

export function validateAsset(asset, allAssets=[], relationships=[]) {
  const incoming = relationships.filter(r => r.from===asset.id || r.to===asset.id);
  const rules = [
    rule('META-001','Ansvarlig eier','required',missing(asset.owner),'Beslutninger og risikoaksept trenger en tydelig ansvarlig rolle',asset.owner||'Ingen eier registrert','Utpek en varig virksomhetseier','owner'),
    rule('META-002','Operativ forvalter','required',missing(asset.steward),'Kvalitetsproblemer må ha et tydelig operativt ansvarspunkt',asset.steward||'Ingen forvalter registrert','Utpek en informasjonsforvalter','steward'),
    rule('META-003','Formål og avgrensning','required',missing(asset.description)||asset.description.length<80,'Brukere må forstå hva ressursen er ment for og hvor grensene går',`${asset.description?.length||0} beskrivende tegn`,'Beskriv formål, omfang og hva som faller utenfor','description'),
    rule('META-004','Sensitivitet','required',missing(asset.sensitivity),'Tilgang og KI-kontroller avhenger av klassifisering',asset.sensitivity||'Ikke vurdert','Fullfør klassifisering av informasjonen','sensitivity'),
    rule('META-005','Tilgangsbetingelser','required',missing(asset.accessRights),'Tilgjengelighet må skilles fra autorisasjon',asset.accessRights||'Ingen tilgangsbetingelser registrert','Beskriv hvem som kan bruke ressursen og hvordan','accessRights'),
    rule('META-006','Proveniens','required',missing(asset.provenance),'Tillit krever at opprinnelse og endringer kan spores',asset.provenance||'Ingen dokumentasjon av proveniens','Dokumenter kilde, innsamling og vesentlige transformasjoner','provenance'),
    rule('META-007','Livsløpsregel','required',missing(asset.retention),'Bevaring og sletting bør være bevisste valg',asset.retention||'Ingen livsløpsregel','Sett regel for bevaring eller kassasjon','retention'),
    rule('META-008','Aktuell revisjon','required',!asset.reviewDate||days(DEMO_TODAY,asset.reviewDate)<0,'Utdatert metadata øker operativ risiko og KI-risiko',asset.reviewDate?`Revisjonsdato ${asset.reviewDate}`:'Ingen revisjonsdato','Sett og gjennomfør en ny revisjon','reviewDate'),
    rule('META-009','Stabil identifikator','required',!asset.identifiersStable,'Relasjoner og henvisninger trenger varige identifikatorer',asset.identifiersStable?'Stabil identifikator bekreftet':'Stabilitet er ikke bekreftet','Bekreft en ordning for varige identifikatorer','identifiersStable'),
    rule('META-010','Maskinell brukbarhet','required',!asset.machineReadable,'Søk, validering og KI-gjenbruk krever innhold som kan leses maskinelt',asset.machineReadable?'Maskinlesbar representasjon er registrert':'Ikke maskinlesbar','Lag en tilgjengelig og maskinlesbar representasjon','machineReadable'),
    rule('META-011','Begrepsdekning','recommended',(asset.glossaryCoverage||0)<70,'Felles begreper reduserer ulik tolkning',`${asset.glossaryCoverage||0}% koblet til styrte begreper`,'Koble sentrale begreper til ordlisten','glossaryCoverage'),
    rule('META-012','Dokumenterte relasjoner','recommended',incoming.length===0,'Konsekvensanalyse trenger kjente avhengigheter',`${incoming.length} direkte relasjon(er)`,'Registrer minst én meningsfull relasjon med grunnlag','relationships')
  ];
  return rules.filter(r=>r.failed).map(({failed,...finding})=>finding);
}

export function calculateQuality(asset, findings=[]) {
  const failed = id => findings.some(f=>f.id===id);
  return [
    ['Fullstendighet',100-findings.filter(f=>f.severity==='required').length*11,'Påkrevde metadata er registrert'],
    ['Eierskap',failed('META-001')||failed('META-002')?25:100,'Dokumentasjon av eier og forvalter'],
    ['Aktualitet',failed('META-008')?25:100,asset.reviewDate||'Ingen revisjonsdato'],
    ['Proveniens',failed('META-006')?20:100,asset.provenance||'Ingen dokumentasjon'],
    ['Tilgang',failed('META-005')?35:100,asset.accessRights||'Ingen tilgangsbetingelser'],
    ['Maskinell brukbarhet',failed('META-010')?15:100,asset.machineReadable?'Innholdet kan hentes ut':'Innholdet kan ikke hentes ut maskinelt'],
    ['Terminologi',asset.glossaryCoverage||0,`${asset.glossaryCoverage||0}% dekning`],
    ['Stabile identifikatorer',failed('META-009')?20:100,asset.identifiersStable?'Bekreftet':'Ikke bekreftet'],
    ['Livsløp',failed('META-007')?25:100,asset.retention||'Ingen regel'],
    ['Kvalitetsgrunnlag',asset.qualityEvidence?90:25,asset.qualityEvidence||'Ingen kvalitetsdokumentasjon']
  ].map(([label,score,evidence],index)=>({id:`Q-${index+1}`,label,score:clamp(score),evidence}));
}

const dimension = (id,label,score,evidence,action,role,assumption='Vurderingen bruker bare registrerte metadata og leser ikke selve kildeinnholdet.') => ({
  id,label,score:clamp(score),result:score>=80?'Pass':score>=55?'Control required':'Blocker',evidence,action,accountableRole:role,confidence:evidence.includes('Ingen ')||evidence.includes('ikke ')||evidence.includes('Ikke ')?'Low':'Medium',assumption
});
export function assessReadiness(asset,useCaseId='rag_assistant') {
  const useCase = USE_CASES[useCaseId]||USE_CASES.rag_assistant;
  const dims = [
    dimension('AR-01','Ansvar',asset.owner&&asset.steward?95:20,asset.owner&&asset.steward?`${asset.owner}; ${asset.steward}`:'Ingen komplett kjede for eier og forvalter','Utpek ansvarlig eier og operativ forvalter','Informasjonseier'),
    dimension('AR-02','Formål',asset.description?.length>=80?90:35,asset.description||'Ingen avgrenset formålsbeskrivelse','Beskriv ønsket bruk, avgrensninger og brukere','Produkteier'),
    dimension('AR-03','Kildens autoritet',asset.provenance?88:25,asset.provenance||'Ingen dokumentasjon av proveniens','Bekreft opprinnelse, transformasjoner og autoritativ status','Informasjonsforvalter'),
    dimension('AR-04','Aktualitet',asset.reviewDate&&days(DEMO_TODAY,asset.reviewDate)>=0?85:25,asset.reviewDate?`Neste revisjon ${asset.reviewDate}`:'Ingen revisjonsdato','Gjennomgå metadata og et representativt utvalg av innhold','Informasjonsforvalter'),
    dimension('AR-05','Tilgangskontroll',asset.sensitivity&&asset.accessRights?88:20,asset.accessRights||'Ingen tilgangsbetingelser','Definer identitet, autorisasjon og minste privilegium','Sikkerhetsansvarlig'),
    dimension('AR-06','Personvern og lovlig bruk',asset.sensitivity==='Confidential'?(asset.lawfulBasis?70:20):90,asset.lawfulBasis||'Ingen vurdering av lovlig bruk','Gjennomfør personvern- og lovlighetsvurdering','Personvernrådgiver'),
    dimension('AR-07','Maskinlesbarhet',asset.machineReadable?92:15,asset.machineReadable?'Maskinlesbar representasjon er registrert':'Ikke maskinlesbar','Lag innhold som kan hentes ut maskinelt','Applikasjonseier'),
    dimension('AR-08','Terminologi',asset.glossaryCoverage||0,`${asset.glossaryCoverage||0}% begrepsdekning`,'Koble sentrale begreper til styrt terminologi','Informasjonsarkitekt'),
    dimension('AR-09','Stabile identifikatorer',asset.identifiersStable?95:20,asset.identifiersStable?'Stabil identifikator er bekreftet':'Stabilitet er ikke bekreftet','Etabler varige identifikatorer og henvisningslenker','Informasjonsarkitekt'),
    dimension('AR-10','Kvalitetsgrunnlag',asset.qualityEvidence?85:25,asset.qualityEvidence||'Ingen kvalitetsdokumentasjon','Definer stikkprøver, terskler og oppfølging','Data- eller innholdsforvalter'),
    dimension('AR-11','Livsløpskontroll',asset.retention?85:25,asset.retention||'Ingen livsløpsregel','Sett regler for bevaring, sletting og historikk','Dokumentasjonsforvalter'),
    dimension('AR-12','Tillatt KI-bruk',asset.aiAllowed?85:10,asset.aiAllowed?'KI-gjenbruk er tillatt innenfor definerte kontroller':'KI-gjenbruk er ikke godkjent','Registrer en avgrenset beslutning om KI-bruk','Informasjonseier'),
    dimension('AR-13','Menneskelig kontroll',useCaseId==='enterprise_search'?90:65,useCaseId==='enterprise_search'?'Brukeren velger og tolker kildene':'Menneskelig kontroll kreves for resultater med konsekvenser','Definer kontroll, eskalering og reserveprosess','Tjenesteeier')
  ];
  let score = clamp(dims.reduce((sum,d)=>sum+d.score,0)/dims.length);
  const blockers = dims.filter(d=>d.result==='Blocker');
  let status = blockers.length>=2||score<55?'Not ready':blockers.length||score<80?'Ready with controls':'Ready';
  if (['rag_assistant','agent_source'].includes(useCaseId)&&!asset.aiAllowed) status='Not ready';
  return {useCase,score,status,dimensions:dims,blockers,limitation:'Vurderingen er beslutningsstøtte, ikke en produksjonsgodkjenning. Ansvar for sikkerhet, personvern, juss, dokumentasjon og tjenesten ligger fortsatt hos de ansvarlige rollene.'};
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
    'META-001':{owner:'Leder for fellestjenester'},'META-002':{steward:'Dokumentasjonskoordinator'},
    'META-003':{description:'Styrt samling av operative prosedyrer. Omfanget er begrenset til godkjente, gjeldende prosedyrer; utgått og ubekreftet materiale skal ikke brukes automatisk.'},
    'META-004':{sensitivity:'Internal'},'META-005':{accessRights:'Ansatte med dokumentert tjenstlig behov; begrenset materiale krever gruppetilgang.'},
    'META-006':{provenance:'Flyttet fra navngitte fellesområder; kildeoversikt og endringslogg er kontrollert av dokumentasjonskoordinator.'},
    'META-007':{retention:'Godkjente prosedyrer og beslutningshistorikk bevares; duplikater kasseres etter dokumentert gjennomgang.'},
    'META-008':{reviewDate:'2026-11-30'},'META-009':{identifiersStable:true},'META-010':{machineReadable:true},'META-011':{glossaryCoverage:75}
  };
  return {...asset,...(changes[ruleId]||{}),version:incrementVersion(asset.version)};
}
export function escapeHtml(value) { return String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
export function createGovernanceBrief(asset,findings,quality,assessment,impactedAssets=[],backlog=[]) {
  return `# Styringsnotat — ${asset.title}\n\nDato: ${DEMO_TODAY}\nRessurs: ${asset.id} · versjon ${asset.version}\nEier: ${asset.owner||'Ikke tildelt'}\nForvalter: ${asset.steward||'Ikke tildelt'}\n\n## Beslutningsgrunnlag\nBrukstilfelle: ${assessment.useCase.label}\nKI-beredskap: ${displayStatus(assessment.status)} (${assessment.score}/100)\n\n## Åpne profilfunn\n${findings.length?findings.map(f=>`- ${f.id} ${f.label}: ${f.evidence}. Tiltak: ${f.fix}.`).join('\n'):'- Ingen funn under den aktive demoprofilen.'}\n\n## Kvalitetsgrunnlag\n${quality.map(q=>`- ${q.label}: ${q.score}/100 — ${q.evidence}`).join('\n')}\n\n## Berørte ressurser\n${impactedAssets.length?impactedAssets.map(a=>`- ${a.id}: ${a.title}`).join('\n'):'- Ingen direkte nedstrømsressurs er registrert.'}\n\n## Relaterte tiltak\n${backlog.length?backlog.map(b=>`- ${b.title} (${displayStatus(b.status)})`).join('\n'):'- Ingen relaterte tiltak er registrert.'}\n\n## Antakelser og avgrensninger\n${assessment.limitation} Demoen leser ikke selve kildeinnholdet og er ikke juridisk godkjenning, regulatorisk klassifisering eller samsvarssertifisering.\n`;
}
