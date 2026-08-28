const catalogRows = [
  ['CW-DOC-001','HR policy library','Document collection','People & Culture'],
  ['CW-DOC-002','Legacy procedure archive','Document collection','Shared Services'],
  ['CW-DOC-003','Procurement guidance','Document collection','Commercial'],
  ['CW-DOC-004','Information-security handbook','Document collection','Security'],
  ['CW-DATA-001','Employee master data','Dataset','People & Culture'],
  ['CW-DATA-002','Supplier register','Dataset','Commercial'],
  ['CW-DATA-003','Service request history','Dataset','Digital Operations'],
  ['CW-DATA-004','Office location directory','Dataset','Property'],
  ['CW-API-001','Employee directory API','Data service/API','Digital Operations'],
  ['CW-API-002','Case-status API','Data service/API','Digital Operations'],
  ['CW-API-003','Supplier lookup service','Data service/API','Commercial'],
  ['CW-MODEL-001','Employee information model','Information model','Enterprise Architecture'],
  ['CW-MODEL-002','Case and document model','Information model','Information Governance'],
  ['CW-MODEL-003','Supplier information model','Information model','Enterprise Architecture'],
  ['CW-TERM-001','Active employee','Business term','People & Culture'],
  ['CW-TERM-002','Authoritative source','Business term','Information Governance'],
  ['CW-TERM-003','Business-critical service','Business term','Digital Operations'],
  ['CW-CODE-001','Employment status','Code list','People & Culture'],
  ['CW-CODE-002','Security classification','Code list','Security'],
  ['CW-CODE-003','Service category','Code list','Digital Operations'],
  ['CW-REPORT-001','Workforce capacity report','Report/analytical product','People Analytics'],
  ['CW-REPORT-002','Supplier-risk dashboard','Report/analytical product','Commercial'],
  ['CW-REPORT-003','Service reliability scorecard','Report/analytical product','Digital Operations'],
  ['CW-REPORT-004','Information-quality dashboard','Report/analytical product','Information Governance']
];

const owners = {
  'People & Culture':'Director of People','Shared Services':'Head of Shared Services',Commercial:'Commercial Director',Security:'CISO',
  'Digital Operations':'Director of Digital Operations',Property:'Head of Property','Enterprise Architecture':'Chief Architect',
  'Information Governance':'Head of Information Governance','People Analytics':'Head of People Analytics'
};
const stewards = {
  'People & Culture':'HR Information Steward','Shared Services':'Records Coordinator',Commercial:'Commercial Data Steward',Security:'Security Governance Lead',
  'Digital Operations':'Service Information Manager',Property:'Property Data Steward','Enterprise Architecture':'Domain Architect',
  'Information Governance':'Senior Information Adviser','People Analytics':'Analytics Product Owner'
};
const descriptions = {
  'Document collection':'Governed collection of approved documents used to support consistent operational decisions and employee self-service across CivicWorks.',
  Dataset:'Structured information used in operational workflows, reporting and controlled data exchange across CivicWorks services.',
  'Data service/API':'Managed interface that exposes authoritative information to approved consuming systems and operational services.',
  'Information model':'Shared conceptual and logical model defining entities, attributes, relationships and interpretation across systems.',
  'Business term':'Governed definition used to align language, decisions, reporting and implementation across organizational units.',
  'Code list':'Controlled values used to classify, validate and exchange information consistently across services.',
  'Report/analytical product':'Curated analytical product used for management decisions, trend monitoring and operational improvement.'
};

export const assets = catalogRows.map(([id,title,type,unit], index) => ({
  id,title,type,unit,
  description: descriptions[type],
  owner: owners[unit], steward: stewards[unit],
  status: index % 7 === 1 ? 'Review' : index % 5 === 0 ? 'Approved' : 'Published',
  sensitivity: type === 'Dataset' || title.includes('employee') ? 'Confidential' : type === 'Document collection' ? 'Internal' : 'Public',
  provenance: `Registered from the ${unit} source inventory; verification evidence recorded in governance review GR-${String(index + 11).padStart(3,'0')}.`,
  accessRights: type === 'Data service/API' ? 'Approved service accounts; least-privilege access; quarterly review.' : 'Access follows sensitivity and documented business need.',
  retention: type === 'Business term' || type === 'Information model' ? 'Retain while current; preserve superseded versions for decision traceability.' : 'Retention rule assigned; annual disposition review.',
  updateFrequency: index % 4 === 0 ? 'Daily' : index % 3 === 0 ? 'Monthly' : 'On change',
  reviewDate: `2026-${String(9 + (index % 3)).padStart(2,'0')}-${String(10 + (index % 17)).padStart(2,'0')}`,
  version: `1.${index % 4}.0`, glossaryCoverage: 72 + (index % 6) * 5,
  qualityEvidence: `Sample-based review completed 2026-08-${String(10 + index % 16).padStart(2,'0')}.`,
  lawfulBasis: title.toLowerCase().includes('employee') ? 'Employment administration and statutory obligations.' : 'Not applicable or documented in source process.',
  contact: `${stewards[unit]} · steward@civicworks.example`,
  aiAllowed: index % 6 !== 1,
  machineReadable: !type.includes('Document') || index % 4 !== 1,
  identifiersStable: index % 8 !== 1,
  documentationValue: ['Operational','Administrative','Analytical'][index % 3]
}));

Object.assign(assets.find(a => a.id === 'CW-DOC-002'), {
  description:'Mixed archive migrated from shared drives. Scope, status and authoritative versions have not been fully established.',
  owner:'', steward:'', sensitivity:'', provenance:'', accessRights:'', retention:'', reviewDate:'2025-02-12',
  glossaryCoverage:18, qualityEvidence:'', lawfulBasis:'', contact:'', aiAllowed:false, machineReadable:false, identifiersStable:false, version:'0.8.0'
});
Object.assign(assets.find(a => a.id === 'CW-MODEL-002'), { glossaryCoverage:96, aiAllowed:true, identifiersStable:true });

const edges = [
  ['CW-DOC-001','CW-TERM-001','uses term'],['CW-DOC-001','CW-CODE-001','uses code list'],['CW-DATA-001','CW-MODEL-001','conforms to'],
  ['CW-DATA-001','CW-CODE-001','classified by'],['CW-API-001','CW-DATA-001','exposes'],['CW-REPORT-001','CW-DATA-001','derived from'],
  ['CW-REPORT-001','CW-TERM-001','uses term'],['CW-DATA-003','CW-MODEL-002','conforms to'],['CW-API-002','CW-DATA-003','exposes'],
  ['CW-REPORT-003','CW-DATA-003','derived from'],['CW-DATA-003','CW-CODE-003','classified by'],['CW-TERM-003','CW-CODE-003','qualified by'],
  ['CW-DATA-002','CW-MODEL-003','conforms to'],['CW-API-003','CW-DATA-002','exposes'],['CW-REPORT-002','CW-DATA-002','derived from'],
  ['CW-DOC-004','CW-CODE-002','uses code list'],['CW-MODEL-002','CW-TERM-002','defines'],['CW-DOC-002','CW-MODEL-002','partly mapped to'],
  ['CW-REPORT-004','CW-DATA-003','measures'],['CW-REPORT-004','CW-MODEL-002','assesses against']
];
export const relationships = edges.map((edge,index) => ({
  id:`REL-${String(index+1).padStart(3,'0')}`, from:edge[0], to:edge[1], type:edge[2],
  evidence:index === 17 ? 'Migration workshop notes; mapping incomplete.' : `Approved design or stewardship evidence EV-${String(index+41).padStart(3,'0')}.`,
  confidence:index === 17 ? 'Low' : index % 5 === 0 ? 'Medium' : 'High'
}));

export const initialBacklog = [
  {id:'BL-001',title:'Assign accountable owner to legacy procedure archive',assetIds:['CW-DOC-002'],impact:5,risk:5,urgency:5,effort:2,status:'Open',ownerRole:'Head of Shared Services',reason:'No accountable owner is recorded.'},
  {id:'BL-002',title:'Complete sensitivity and access review',assetIds:['CW-DOC-002'],impact:5,risk:5,urgency:4,effort:3,status:'Open',ownerRole:'Security Governance Lead',reason:'AI and search use is blocked until access conditions are known.'},
  {id:'BL-003',title:'Verify terminology coverage in service categories',assetIds:['CW-CODE-003'],impact:3,risk:3,urgency:2,effort:2,status:'In progress',ownerRole:'Service Information Manager',reason:'Coverage is below the target for analytical reuse.'}
];
export const auditSeed = [
  {id:'AUD-003',at:'2026-08-27T13:18:00Z',actor:'Senior Information Adviser',action:'Approved metadata profile',subject:'INTERNAL_ASSET_MINIMUM_V1',detail:'Twelve minimum controls approved for this demonstration.'},
  {id:'AUD-002',at:'2026-08-26T09:42:00Z',actor:'Domain Architect',action:'Confirmed relationship',subject:'Employee directory API',detail:'API-to-master-data lineage supported by approved interface design.'},
  {id:'AUD-001',at:'2026-08-25T14:05:00Z',actor:'Records Coordinator',action:'Flagged governance gap',subject:'Legacy procedure archive',detail:'Ownership, access, retention and provenance require remediation.'}
];
