const catalogRows = [
  ['CW-DOC-001','HR-policybibliotek','Document collection','Mennesker og kultur'],
  ['CW-DOC-002','Eldre prosedyrearkiv','Document collection','Fellestjenester'],
  ['CW-DOC-003','Innkjøpsveiledning','Document collection','Innkjøp'],
  ['CW-DOC-004','Håndbok for informasjonssikkerhet','Document collection','Sikkerhet'],
  ['CW-DATA-001','Ansattregister','Dataset','Mennesker og kultur'],
  ['CW-DATA-002','Leverandørregister','Dataset','Innkjøp'],
  ['CW-DATA-003','Historikk for tjenestehenvendelser','Dataset','Digital drift'],
  ['CW-DATA-004','Oversikt over kontorsteder','Dataset','Eiendom'],
  ['CW-API-001','API for ansattkatalog','Data service/API','Digital drift'],
  ['CW-API-002','API for saksstatus','Data service/API','Digital drift'],
  ['CW-API-003','Oppslagstjeneste for leverandører','Data service/API','Innkjøp'],
  ['CW-MODEL-001','Informasjonsmodell for ansatte','Information model','Virksomhetsarkitektur'],
  ['CW-MODEL-002','Saks- og dokumentmodell','Information model','Informasjonsstyring'],
  ['CW-MODEL-003','Informasjonsmodell for leverandører','Information model','Virksomhetsarkitektur'],
  ['CW-TERM-001','Aktiv ansatt','Business term','Mennesker og kultur'],
  ['CW-TERM-002','Autoritativ kilde','Business term','Informasjonsstyring'],
  ['CW-TERM-003','Virksomhetskritisk tjeneste','Business term','Digital drift'],
  ['CW-CODE-001','Ansettelsesstatus','Code list','Mennesker og kultur'],
  ['CW-CODE-002','Sikkerhetsklassifisering','Code list','Sikkerhet'],
  ['CW-CODE-003','Tjenestekategori','Code list','Digital drift'],
  ['CW-REPORT-001','Rapport om bemanningskapasitet','Report/analytical product','HR-analyse'],
  ['CW-REPORT-002','Oversikt over leverandørrisiko','Report/analytical product','Innkjøp'],
  ['CW-REPORT-003','Målekort for tjenestestabilitet','Report/analytical product','Digital drift'],
  ['CW-REPORT-004','Oversikt over informasjonskvalitet','Report/analytical product','Informasjonsstyring']
];

const owners = {
  'Mennesker og kultur':'HR-direktør','Fellestjenester':'Leder for fellestjenester',Innkjøp:'Innkjøpsdirektør',Sikkerhet:'Sikkerhetssjef',
  'Digital drift':'Direktør for digital drift',Eiendom:'Eiendomssjef','Virksomhetsarkitektur':'Sjefarkitekt',
  'Informasjonsstyring':'Leder for informasjonsstyring','HR-analyse':'Leder for HR-analyse'
};
const stewards = {
  'Mennesker og kultur':'HR-informasjonsforvalter','Fellestjenester':'Dokumentasjonskoordinator',Innkjøp:'Dataforvalter for innkjøp',Sikkerhet:'Fagansvarlig sikkerhetsstyring',
  'Digital drift':'Tjenesteinformasjonsforvalter',Eiendom:'Dataforvalter for eiendom','Virksomhetsarkitektur':'Domenearkitekt',
  'Informasjonsstyring':'Seniorrådgiver informasjonsstyring','HR-analyse':'Produkteier HR-analyse'
};
const descriptions = {
  'Document collection':'Styrt samling av godkjente dokumenter som brukes i løpende arbeid og som støtte for ansatte i CivicWorks.',
  Dataset:'Strukturert informasjon som brukes i arbeidsprosesser, rapportering og kontrollert datautveksling mellom tjenester i CivicWorks.',
  'Data service/API':'Forvaltet grensesnitt som gjør autoritativ informasjon tilgjengelig for godkjente systemer og tjenester.',
  'Information model':'Felles begrepsmessig og logisk modell for enheter, egenskaper, relasjoner og tolkning på tvers av systemer.',
  'Business term':'Forvaltet definisjon som brukes for å samordne språk, beslutninger, rapportering og implementering mellom enheter.',
  'Code list':'Kontrollerte verdier som brukes til klassifisering, validering og konsistent informasjonsutveksling.',
  'Report/analytical product':'Bearbeidet analyseprodukt som brukes til ledelsesinformasjon, trendoppfølging og forbedringsarbeid.'
};

export const assets = catalogRows.map(([id,title,type,unit], index) => ({
  id,title,type,unit,
  description: descriptions[type],
  owner: owners[unit], steward: stewards[unit],
  status: index % 7 === 1 ? 'Review' : index % 5 === 0 ? 'Approved' : 'Published',
  sensitivity: type === 'Dataset' || title.toLowerCase().includes('ansatt') ? 'Confidential' : type === 'Document collection' ? 'Internal' : 'Public',
  provenance: `Registrert fra kildeoversikten til ${unit}; kontrollgrunnlag er dokumentert i styringsgjennomgang GR-${String(index + 11).padStart(3,'0')}.`,
  accessRights: type === 'Data service/API' ? 'Godkjente tjenestekontoer, minste privilegium og kvartalsvis tilgangsgjennomgang.' : 'Tilgang følger sensitivitet og dokumentert tjenstlig behov.',
  retention: type === 'Business term' || type === 'Information model' ? 'Behold så lenge ressursen er gjeldende; tidligere versjoner bevares for å kunne følge beslutningshistorikken.' : 'Bevaringsregel er satt; kassasjon vurderes årlig.',
  updateFrequency: index % 4 === 0 ? 'Daglig' : index % 3 === 0 ? 'Månedlig' : 'Ved endring',
  reviewDate: `2026-${String(9 + (index % 3)).padStart(2,'0')}-${String(10 + (index % 17)).padStart(2,'0')}`,
  version: `1.${index % 4}.0`, glossaryCoverage: 72 + (index % 6) * 5,
  qualityEvidence: `Stikkprøvekontroll gjennomført 2026-08-${String(10 + index % 16).padStart(2,'0')}.`,
  lawfulBasis: title.toLowerCase().includes('ansatt') ? 'Personaladministrasjon og lovpålagte plikter.' : 'Ikke relevant, eller dokumentert i kildeprosessen.',
  contact: `${stewards[unit]} · steward@civicworks.example`,
  aiAllowed: index % 6 !== 1,
  machineReadable: !type.includes('Document') || index % 4 !== 1,
  identifiersStable: index % 8 !== 1,
  documentationValue: ['Operativ','Administrativ','Analytisk'][index % 3]
}));

Object.assign(assets.find(a => a.id === 'CW-DOC-002'), {
  description:'Blandet arkiv flyttet inn fra fellesområder. Omfang, status og autoritative versjoner er ikke fullt avklart.',
  owner:'', steward:'', sensitivity:'', provenance:'', accessRights:'', retention:'', reviewDate:'2025-02-12',
  glossaryCoverage:18, qualityEvidence:'', lawfulBasis:'', contact:'', aiAllowed:false, machineReadable:false, identifiersStable:false, version:'0.8.0'
});
Object.assign(assets.find(a => a.id === 'CW-MODEL-002'), { glossaryCoverage:96, aiAllowed:true, identifiersStable:true });

const edges = [
  ['CW-DOC-001','CW-TERM-001','bruker begrep'],['CW-DOC-001','CW-CODE-001','bruker kodeliste'],['CW-DATA-001','CW-MODEL-001','følger modell'],
  ['CW-DATA-001','CW-CODE-001','klassifiseres med'],['CW-API-001','CW-DATA-001','eksponerer'],['CW-REPORT-001','CW-DATA-001','bygger på'],
  ['CW-REPORT-001','CW-TERM-001','bruker begrep'],['CW-DATA-003','CW-MODEL-002','følger modell'],['CW-API-002','CW-DATA-003','eksponerer'],
  ['CW-REPORT-003','CW-DATA-003','bygger på'],['CW-DATA-003','CW-CODE-003','klassifiseres med'],['CW-TERM-003','CW-CODE-003','presiseres av'],
  ['CW-DATA-002','CW-MODEL-003','følger modell'],['CW-API-003','CW-DATA-002','eksponerer'],['CW-REPORT-002','CW-DATA-002','bygger på'],
  ['CW-DOC-004','CW-CODE-002','bruker kodeliste'],['CW-MODEL-002','CW-TERM-002','definerer'],['CW-DOC-002','CW-MODEL-002','delvis kartlagt mot'],
  ['CW-REPORT-004','CW-DATA-003','måler'],['CW-REPORT-004','CW-MODEL-002','vurderer mot']
];
export const relationships = edges.map((edge,index) => ({
  id:`REL-${String(index+1).padStart(3,'0')}`, from:edge[0], to:edge[1], type:edge[2],
  evidence:index === 17 ? 'Notater fra migreringsverksted; kartleggingen er ikke ferdig.' : `Godkjent design- eller forvaltningsgrunnlag EV-${String(index+41).padStart(3,'0')}.`,
  confidence:index === 17 ? 'Lav' : index % 5 === 0 ? 'Middels' : 'Høy'
}));

export const initialBacklog = [
  {id:'BL-001',title:'Utpek ansvarlig eier for det eldre prosedyrearkivet',assetIds:['CW-DOC-002'],impact:5,risk:5,urgency:5,effort:2,status:'Open',ownerRole:'Leder for fellestjenester',reason:'Ingen ansvarlig eier er registrert.'},
  {id:'BL-002',title:'Fullfør vurdering av sensitivitet og tilgang',assetIds:['CW-DOC-002'],impact:5,risk:5,urgency:4,effort:3,status:'Open',ownerRole:'Fagansvarlig sikkerhetsstyring',reason:'Bruk i KI og søk bør ikke åpnes før tilgangsbetingelsene er avklart.'},
  {id:'BL-003',title:'Kontroller begrepsdekning for tjenestekategorier',assetIds:['CW-CODE-003'],impact:3,risk:3,urgency:2,effort:2,status:'In progress',ownerRole:'Tjenesteinformasjonsforvalter',reason:'Dekningen er lavere enn målet for analytisk gjenbruk.'}
];
export const auditSeed = [
  {id:'AUD-003',at:'2026-08-27T13:18:00Z',actor:'Seniorrådgiver informasjonsstyring',action:'Godkjente metadataprofil',subject:'INTERNAL_ASSET_MINIMUM_V1',detail:'Tolv minimumskontroller ble godkjent for denne demoen.'},
  {id:'AUD-002',at:'2026-08-26T09:42:00Z',actor:'Domenearkitekt',action:'Bekreftet relasjon',subject:'API for ansattkatalog',detail:'Relasjonen mellom API og masterdata støttes av godkjent grensesnittdesign.'},
  {id:'AUD-001',at:'2026-08-25T14:05:00Z',actor:'Dokumentasjonskoordinator',action:'Markerte styringshull',subject:'Eldre prosedyrearkiv',detail:'Eierskap, tilgang, bevaring og proveniens må ryddes opp i.'}
];
