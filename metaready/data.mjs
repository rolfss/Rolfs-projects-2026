const catalogRows = [
  ['CW-DOC-001','Personalpolitikk og retningslinjer','Document collection','Mennesker og kultur'],
  ['CW-DOC-002','Eldre prosedyrearkiv','Document collection','Fellestjenester'],
  ['CW-DOC-003','Veiledning for anskaffelser','Document collection','Innkjøp'],
  ['CW-DOC-004','Håndbok for informasjonssikkerhet','Document collection','Sikkerhet'],
  ['CW-DATA-001','Grunndata for ansatte','Dataset','Mennesker og kultur'],
  ['CW-DATA-002','Leverandørregister','Dataset','Innkjøp'],
  ['CW-DATA-003','Historikk for tjenestehenvendelser','Dataset','Digital drift'],
  ['CW-DATA-004','Kontor- og lokasjonsregister','Dataset','Eiendom'],
  ['CW-API-001','Ansattkatalog-API','Data service/API','Digital drift'],
  ['CW-API-002','Sakstatus-API','Data service/API','Digital drift'],
  ['CW-API-003','Leverandøroppslag','Data service/API','Innkjøp'],
  ['CW-MODEL-001','Informasjonsmodell for ansatte','Information model','Virksomhetsarkitektur'],
  ['CW-MODEL-002','Modell for sak og dokument','Information model','Informasjonsforvaltning'],
  ['CW-MODEL-003','Informasjonsmodell for leverandører','Information model','Virksomhetsarkitektur'],
  ['CW-TERM-001','Aktiv ansatt','Business term','Mennesker og kultur'],
  ['CW-TERM-002','Autoritativ kilde','Business term','Informasjonsforvaltning'],
  ['CW-TERM-003','Virksomhetskritisk tjeneste','Business term','Digital drift'],
  ['CW-CODE-001','Ansettelsesstatus','Code list','Mennesker og kultur'],
  ['CW-CODE-002','Sikkerhetsklassifisering','Code list','Sikkerhet'],
  ['CW-CODE-003','Tjenestekategori','Code list','Digital drift'],
  ['CW-REPORT-001','Kapasitetsrapport for bemanning','Report/analytical product','HR-analyse'],
  ['CW-REPORT-002','Dashbord for leverandørrisiko','Report/analytical product','Innkjøp'],
  ['CW-REPORT-003','Målekort for tjenestestabilitet','Report/analytical product','Digital drift'],
  ['CW-REPORT-004','Dashbord for informasjonskvalitet','Report/analytical product','Informasjonsforvaltning']
];

const owners = {
  'Mennesker og kultur':'HR-direktør','Fellestjenester':'Leder for fellestjenester',Innkjøp:'Innkjøpsdirektør',Sikkerhet:'CISO',
  'Digital drift':'Direktør for digital drift',Eiendom:'Eiendomssjef',Virksomhetsarkitektur:'Sjefarkitekt',
  Informasjonsforvaltning:'Leder for informasjonsforvaltning','HR-analyse':'Leder for HR-analyse'
};
const stewards = {
  'Mennesker og kultur':'HR-informasjonsforvalter',Fellestjenester:'Dokumentasjonskoordinator',Innkjøp:'Dataforvalter for innkjøp',Sikkerhet:'Fagansvarlig sikkerhetsstyring',
  'Digital drift':'Tjenesteinformasjonsforvalter',Eiendom:'Dataforvalter for eiendom',Virksomhetsarkitektur:'Domenearkitekt',
  Informasjonsforvaltning:'Seniorrådgiver informasjonsforvaltning','HR-analyse':'Produkteier for analyse'
};
const descriptions = {
  'Document collection':'Styrt samling av godkjente dokumenter som brukes i løpende arbeid og selvbetjening på tvers av CivicWorks.',
  Dataset:'Strukturert informasjon brukt i arbeidsprosesser, rapportering og kontrollert datautveksling mellom tjenester i CivicWorks.',
  'Data service/API':'Forvaltet grensesnitt som gjør autoritativ informasjon tilgjengelig for godkjente systemer og tjenester.',
  'Information model':'Felles konseptuell og logisk modell for enheter, egenskaper, relasjoner og tolkning på tvers av systemer.',
  'Business term':'Forvaltet definisjon som skal gi lik språkbruk i beslutninger, rapportering og systemutvikling.',
  'Code list':'Kontrollerte verdier for klassifisering, validering og konsistent informasjonsutveksling.',
  'Report/analytical product':'Bearbeidet analyseprodukt brukt til styring, trendoppfølging og forbedring av drift.'
};

export const assets = catalogRows.map(([id,title,type,unit], index) => ({
  id,title,type,unit,
  description: descriptions[type],
  owner: owners[unit], steward: stewards[unit],
  status: index % 7 === 1 ? 'Review' : index % 5 === 0 ? 'Approved' : 'Published',
  sensitivity: type === 'Dataset' || title.toLowerCase().includes('ansatt') ? 'Confidential' : type === 'Document collection' ? 'Internal' : 'Public',
  provenance: `Registrert fra kildeoversikten til ${unit}; kontrollbevis er dokumentert i styringsgjennomgang GR-${String(index + 11).padStart(3,'0')}.`,
  accessRights: type === 'Data service/API' ? 'Godkjente tjenestekontoer, minste privilegium og kvartalsvis tilgangsgjennomgang.' : 'Tilgang følger sensitivitet og dokumentert tjenstlig behov.',
  retention: type === 'Business term' || type === 'Information model' ? 'Bevares så lenge ressursen er gjeldende; utgåtte versjoner beholdes for beslutningsspor.' : 'Livsløpsregel er tildelt; kassasjon og bevaring vurderes årlig.',
  updateFrequency: index % 4 === 0 ? 'Daglig' : index % 3 === 0 ? 'Månedlig' : 'Ved endring',
  reviewDate: `2026-${String(9 + (index % 3)).padStart(2,'0')}-${String(10 + (index % 17)).padStart(2,'0')}`,
  version: `1.${index % 4}.0`, glossaryCoverage: 72 + (index % 6) * 5,
  qualityEvidence: `Stikkprøvebasert kontroll gjennomført 2026-08-${String(10 + index % 16).padStart(2,'0')}.`,
  lawfulBasis: id === 'CW-DATA-001' ? 'Personaladministrasjon og lovpålagte plikter.' : 'Ikke relevant eller dokumentert i kildeprosessen.',
  contact: `${stewards[unit]} · forvalter@civicworks.example`,
  aiAllowed: index % 6 !== 1,
  machineReadable: !type.includes('Document') || index % 4 !== 1,
  identifiersStable: index % 8 !== 1,
  documentationValue: ['Operativ','Administrativ','Analytisk'][index % 3]
}));

Object.assign(assets.find(a => a.id === 'CW-DOC-002'), {
  description:'Blandet arkiv som er flyttet fra felles filområder. Omfang, status og autoritative versjoner er ikke fullt avklart.',
  owner:'', steward:'', sensitivity:'', provenance:'', accessRights:'', retention:'', reviewDate:'2025-02-12',
  glossaryCoverage:18, qualityEvidence:'', lawfulBasis:'', contact:'', aiAllowed:false, machineReadable:false, identifiersStable:false, version:'0.8.0'
});
Object.assign(assets.find(a => a.id === 'CW-MODEL-002'), { glossaryCoverage:96, aiAllowed:true, identifiersStable:true });

const edges = [
  ['CW-DOC-001','CW-TERM-001','bruker begrep'],['CW-DOC-001','CW-CODE-001','bruker kodeverk'],['CW-DATA-001','CW-MODEL-001','følger modell'],
  ['CW-DATA-001','CW-CODE-001','klassifiseres med'],['CW-API-001','CW-DATA-001','eksponerer'],['CW-REPORT-001','CW-DATA-001','bygger på'],
  ['CW-REPORT-001','CW-TERM-001','bruker begrep'],['CW-DATA-003','CW-MODEL-002','følger modell'],['CW-API-002','CW-DATA-003','eksponerer'],
  ['CW-REPORT-003','CW-DATA-003','bygger på'],['CW-DATA-003','CW-CODE-003','klassifiseres med'],['CW-TERM-003','CW-CODE-003','presiseres av'],
  ['CW-DATA-002','CW-MODEL-003','følger modell'],['CW-API-003','CW-DATA-002','eksponerer'],['CW-REPORT-002','CW-DATA-002','bygger på'],
  ['CW-DOC-004','CW-CODE-002','bruker kodeverk'],['CW-MODEL-002','CW-TERM-002','definerer'],['CW-DOC-002','CW-MODEL-002','delvis kartlagt mot'],
  ['CW-REPORT-004','CW-DATA-003','måler'],['CW-REPORT-004','CW-MODEL-002','vurderer mot']
];
export const relationships = edges.map((edge,index) => ({
  id:`REL-${String(index+1).padStart(3,'0')}`, from:edge[0], to:edge[1], type:edge[2],
  evidence:index === 17 ? 'Notater fra migreringsverksted; kartleggingen er ikke ferdig.' : `Godkjent design- eller forvaltningsbevis EV-${String(index+41).padStart(3,'0')}.`,
  confidence:index === 17 ? 'Low' : index % 5 === 0 ? 'Medium' : 'High'
}));

export const initialBacklog = [
  {id:'BL-001',title:'Gi eldre prosedyrearkiv en ansvarlig eier',assetIds:['CW-DOC-002'],impact:5,risk:5,urgency:5,effort:2,status:'Open',ownerRole:'Leder for fellestjenester',reason:'Det er ikke registrert en ansvarlig eier.'},
  {id:'BL-002',title:'Fullfør vurdering av sensitivitet og tilgang',assetIds:['CW-DOC-002'],impact:5,risk:5,urgency:4,effort:3,status:'Open',ownerRole:'Fagansvarlig sikkerhetsstyring',reason:'Søk og AI-bruk bør vente til tilgangsbetingelsene er avklart.'},
  {id:'BL-003',title:'Kontroller terminologidekning i tjenestekategoriene',assetIds:['CW-CODE-003'],impact:3,risk:3,urgency:2,effort:2,status:'In progress',ownerRole:'Tjenesteinformasjonsforvalter',reason:'Dekningen er lavere enn ønsket for analytisk gjenbruk.'}
];
export const auditSeed = [
  {id:'AUD-003',at:'2026-08-27T13:18:00Z',actor:'Seniorrådgiver informasjonsforvaltning',action:'Godkjente metadataprofil',subject:'INTERNAL_ASSET_MINIMUM_V1',detail:'Tolv minimumskontroller er godkjent for denne demoen.'},
  {id:'AUD-002',at:'2026-08-26T09:42:00Z',actor:'Domenearkitekt',action:'Bekreftet relasjon',subject:'Ansattkatalog-API',detail:'Koblingen mellom API og grunndata støttes av godkjent grensesnittdesign.'},
  {id:'AUD-001',at:'2026-08-25T14:05:00Z',actor:'Dokumentasjonskoordinator',action:'Registrerte styringshull',subject:'Eldre prosedyrearkiv',detail:'Eierskap, tilgang, livsløp og proveniens må ryddes opp i.'}
];
