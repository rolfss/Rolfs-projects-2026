const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'markdown', 'csv', 'tsv', 'json', 'xml', 'html', 'htm',
  'log', 'yaml', 'yml', 'js', 'mjs', 'cjs', 'ts', 'css', 'sql', 'py', 'ini'
]);

const MIME_BY_EXTENSION = {
  pdf: 'application/pdf', doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  csv: 'text/csv', txt: 'text/plain', md: 'text/markdown', json: 'application/json',
  xml: 'application/xml', html: 'text/html', htm: 'text/html',
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', svg: 'image/svg+xml', tif: 'image/tiff', tiff: 'image/tiff',
  eml: 'message/rfc822', msg: 'application/vnd.ms-outlook', zip: 'application/zip'
};

const STOPWORDS = new Set(`
  alle andre at av bare begge ble bli blir blitt bør da de deg den denne der deres det dette
din disse du eller en enn er et etter for fordi fra før gjennom hadde han har henne her hun hva
hvem hvis hvor hvordan i ikke inn jeg kan kunne man med meg men mot mye må når noe noen og også
om opp oss over på samme seg selv sin sine skal som til under ut uten var ved vi vil være vårt
and are as at be been but by can could did do does for from had has have he her here how i if in
into is it its may more most must no not of on one or our out over she should so than that the
their them then there they this to under up was we were what when where which who why will with you
`.trim().split(/\s+/));

const TYPE_RULES = [
  ['Møtereferat', /\b(møte(?:referat)?|referat|minutes|meeting notes?)\b/i],
  ['Vedtak', /\b(vedtak|beslutning|decision|resolution)\b/i],
  ['Avtale eller kontrakt', /\b(avtale|kontrakt|agreement|contract)\b/i],
  ['Prosedyre eller rutine', /\b(prosedyre|rutine|retningslinje|procedure|guideline)\b/i],
  ['Rapport', /\b(rapport|report|årsrapport|statusrapport)\b/i],
  ['Søknad', /\b(søknad|application)\b/i],
  ['Brev', /\b(brev|letter)\b/i],
  ['Notat', /\b(notat|memo|memorandum)\b/i],
  ['Plan', /\b(plan|strategi|strategy|roadmap)\b/i],
  ['Presentasjon', /\b(presentasjon|presentation|slides?)\b/i],
  ['Regneark', /\b(regneark|spreadsheet|budsjett|budget)\b/i],
  ['E-post', /\b(e-?post|email|mail)\b/i]
];

const NORWEGIAN_WORDS = new Set('og ikke som er til med fra det den dette på av for skal har ved eller også kan mellom etter'.split(' '));
const ENGLISH_WORDS = new Set('and not that is to with from it the this on of for shall has by or also can between after'.split(' '));

export const PROFILE_VERSION = 'archive-assist/1.0';
export const LIMITS = Object.freeze({ maxFiles: 50, maxFileSize: 100 * 1024 * 1024, maxTotalSize: 300 * 1024 * 1024 });

export function extensionOf(filename = '') {
  const base = filename.split('/').pop() || '';
  const dot = base.lastIndexOf('.');
  return dot > 0 && dot < base.length - 1 ? base.slice(dot + 1).toLowerCase() : '';
}

export function baseNameOf(filename = '') {
  const base = filename.split('/').pop() || '';
  const ext = extensionOf(base);
  return ext ? base.slice(0, -(ext.length + 1)) : base;
}

function validIsoDate(year, month, day) {
  const y = Number(year), m = Number(month), d = Number(day);
  if (!Number.isInteger(y) || y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return '';
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return '';
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function extractDateFromName(filename = '') {
  const name = baseNameOf(filename);
  let match = name.match(/(?:^|[^0-9])(20\d{2}|19\d{2})[-_. ]?(0[1-9]|1[0-2])[-_. ]?([0-2]\d|3[01])(?:[^0-9]|$)/);
  if (match) return validIsoDate(match[1], match[2], match[3]);
  match = name.match(/(?:^|[^0-9])([0-2]\d|3[01])[-_. ](0[1-9]|1[0-2])[-_. ](20\d{2}|19\d{2})(?:[^0-9]|$)/);
  if (match) return validIsoDate(match[3], match[2], match[1]);
  return '';
}

export function dateFromTimestamp(timestamp) {
  const date = new Date(timestamp || Date.now());
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function deriveTitle(filename = '') {
  let title = baseNameOf(filename)
    .replace(/^(?:20\d{2}|19\d{2})[-_. ]?(?:0[1-9]|1[0-2])[-_. ]?(?:[0-2]\d|3[01])[-_. ]*/i, '')
    .replace(/^(?:[0-2]\d|3[01])[-_. ](?:0[1-9]|1[0-2])[-_. ](?:20\d{2}|19\d{2})[-_. ]*/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b(?:final|endelig|draft|utkast|copy|kopi)\b/gi, '')
    .replace(/\bv(?:ersjon)?\s*\d+(?:\.\d+)*\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!title) title = 'Dokument uten tittel';
  return title.charAt(0).toLocaleUpperCase('nb-NO') + title.slice(1);
}

export function mimeTypeFor(filename = '', supplied = '') {
  return supplied || MIME_BY_EXTENSION[extensionOf(filename)] || 'application/octet-stream';
}

export function isTextReadable(filename = '', mime = '') {
  return mime.startsWith('text/') || TEXT_EXTENSIONS.has(extensionOf(filename));
}

export function inferDocumentType(filename = '', mime = '', text = '') {
  const ext = extensionOf(filename);
  const haystack = `${baseNameOf(filename).replace(/[_-]+/g, ' ')} ${text.slice(0, 3000)}`;
  for (const [label, rule] of TYPE_RULES) if (rule.test(haystack)) return label;
  if (['ppt', 'pptx', 'odp'].includes(ext)) return 'Presentasjon';
  if (['xls', 'xlsx', 'ods', 'csv', 'tsv'].includes(ext)) return 'Regneark';
  if (['eml', 'msg'].includes(ext)) return 'E-post';
  if (mime.startsWith('image/')) return 'Bilde';
  if (mime.startsWith('audio/')) return 'Lydopptak';
  if (mime.startsWith('video/')) return 'Video';
  if (ext === 'pdf') return 'PDF-dokument';
  return 'Dokument';
}

function words(text = '') {
  return (text.toLocaleLowerCase('nb-NO').match(/[\p{L}\p{N}]+/gu) || []);
}

export function inferLanguage(text = '', filename = '') {
  const sample = words(`${filename} ${text.slice(0, 20000)}`);
  let nb = 0, en = 0;
  for (const word of sample) {
    if (NORWEGIAN_WORDS.has(word)) nb += 1;
    if (ENGLISH_WORDS.has(word)) en += 1;
  }
  if (nb >= 3 && nb > en * 1.25) return 'nb';
  if (en >= 3 && en > nb * 1.25) return 'en';
  return 'und';
}

export function extractKeywords(text = '', title = '', max = 6) {
  const counts = new Map();
  const titleWords = new Set(words(title));
  for (const word of words(`${title} ${text.slice(0, 50000)}`)) {
    if (word.length < 4 || STOPWORDS.has(word) || /^\d+$/.test(word)) continue;
    const bonus = titleWords.has(word) ? 2 : 1;
    counts.set(word, (counts.get(word) || 0) + bonus);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'nb'))
    .slice(0, max)
    .map(([word]) => word);
}

function cleanText(text = '') {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^\s*#{1,6}\s+/gm, '')
    .replace(/[\t\r]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function suggestDescription(text = '', title = '', documentType = 'Dokument') {
  const cleaned = cleanText(text);
  const candidates = cleaned.split(/(?<=[.!?])\s+/).map(value => value.trim());
  const sentence = candidates.find(value => value.length >= 45 && value.length <= 360);
  if (sentence) return sentence.length > 240 ? `${sentence.slice(0, 237).trim()}…` : sentence;
  return `${documentType}: ${title}.`;
}

export function isValidNorwegianNationalId(value = '') {
  const digits = String(value).replace(/\D/g, '');
  if (!/^\d{11}$/.test(digits)) return false;
  const n = [...digits].map(Number);
  const weights1 = [3, 7, 6, 1, 8, 9, 4, 5, 2];
  const weights2 = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let k1 = 11 - (weights1.reduce((sum, weight, index) => sum + weight * n[index], 0) % 11);
  if (k1 === 11) k1 = 0;
  if (k1 === 10 || k1 !== n[9]) return false;
  let k2 = 11 - (weights2.reduce((sum, weight, index) => sum + weight * n[index], 0) % 11);
  if (k2 === 11) k2 = 0;
  return k2 !== 10 && k2 === n[10];
}

export function detectSensitiveData(text = '', filename = '') {
  const sample = `${filename}\n${text.slice(0, 150000)}`;
  const signals = [];
  if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(sample)) signals.push('E-postadresse');
  if (/\b(?:\+47[ .-]?)?(?:\d[ .-]?){8}\b/.test(sample)) signals.push('Mulig telefonnummer');
  const elevenDigitCandidates = sample.match(/(?<!\d)(?:\d[ .-]?){11}(?!\d)/g) || [];
  if (elevenDigitCandidates.some(isValidNorwegianNationalId)) signals.push('Mulig fødselsnummer');
  if (/\b(fødselsnummer|personnummer|helseopplysning|diagnose|sykmelding|taushetsbelagt)\b/i.test(sample)) signals.push('Sensitivt nøkkelord');
  return [...new Set(signals)];
}

export function normalizeSha256(value = '') {
  return String(value).toLowerCase().replace(/[^a-f0-9]/g, '').slice(0, 64);
}

export function createMetadata(file, text = '', sha256 = '', defaults = {}, now = new Date()) {
  const mimeType = mimeTypeFor(file.name, file.type);
  const title = deriveTitle(file.name);
  const documentType = inferDocumentType(file.name, mimeType, text);
  const signals = detectSensitiveData(text, file.name);
  const documentDate = extractDateFromName(file.name) || dateFromTimestamp(file.lastModified);
  const generatedAt = now.toISOString();
  const metadata = {
    schema: PROFILE_VERSION,
    identifier: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `aa-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    originalFileName: file.name,
    proposedFileName: '',
    title,
    description: suggestDescription(text, title, documentType),
    creator: defaults.creator || '',
    organizationalUnit: defaults.organizationalUnit || '',
    documentDate,
    registeredDate: generatedAt.slice(0, 10),
    documentType,
    subject: defaults.subject || '',
    keywords: extractKeywords(text, title),
    classificationCode: defaults.classificationCode || '',
    caseReference: defaults.caseReference || '',
    accessLevel: defaults.accessLevel || 'Ikke vurdert',
    accessBasis: defaults.accessBasis || '',
    personalDataAssessment: signals.length ? 'Mulige personopplysninger – må vurderes' : 'Ingen tydelige signaler funnet',
    retentionDecision: defaults.retentionDecision || 'Ikke vurdert',
    retentionYears: defaults.retentionYears || '',
    disposalYear: '',
    language: inferLanguage(text, file.name),
    format: extensionOf(file.name).toUpperCase() || 'Ukjent',
    mimeType,
    fileSize: Number(file.size) || 0,
    sha256: normalizeSha256(sha256),
    source: defaults.source || 'Lastet inn lokalt i Archive Assist',
    relation: defaults.relation || '',
    notes: '',
    generatedAt,
    suggestionBasis: [
      'filnavn',
      extractDateFromName(file.name) ? 'dato i filnavn' : 'filens sist endret-dato',
      isTextReadable(file.name, mimeType) && text ? 'tekstinnhold' : 'filtype og tekniske egenskaper'
    ]
  };
  metadata.disposalYear = calculateDisposalYear(metadata.documentDate, metadata.retentionDecision, metadata.retentionYears);
  metadata.proposedFileName = proposeFilename(metadata, extensionOf(file.name));
  return { metadata, signals };
}

export function calculateDisposalYear(documentDate = '', decision = '', years = '') {
  if (decision !== 'Kasseres etter angitt tid') return '';
  const year = Number(String(documentDate).slice(0, 4));
  const duration = Number(years);
  return Number.isInteger(year) && Number.isFinite(duration) && duration > 0 ? String(year + duration) : '';
}

export function applyCommonDefaults(metadata, defaults = {}, overwrite = false) {
  const next = { ...metadata };
  const fields = ['creator', 'organizationalUnit', 'subject', 'classificationCode', 'caseReference', 'accessLevel', 'accessBasis', 'retentionDecision', 'retentionYears', 'source', 'relation'];
  for (const field of fields) {
    const value = defaults[field];
    if (value !== undefined && value !== '' && (overwrite || !next[field] || next[field] === 'Ikke vurdert')) next[field] = String(value);
  }
  next.disposalYear = calculateDisposalYear(next.documentDate, next.retentionDecision, next.retentionYears);
  next.proposedFileName = proposeFilename(next, extensionOf(next.originalFileName));
  return next;
}

export function validateMetadata(metadata = {}) {
  const findings = [];
  const required = [
    ['title', 'Tittel'], ['creator', 'Dokumentansvarlig eller forfatter'],
    ['organizationalUnit', 'Organisasjonsenhet'], ['documentDate', 'Dokumentdato'],
    ['documentType', 'Dokumenttype'], ['subject', 'Emne eller sak'],
    ['accessLevel', 'Tilgangsnivå'], ['retentionDecision', 'Bevarings- og kassasjonsbeslutning'],
    ['sha256', 'Kontrollsum']
  ];
  for (const [field, label] of required) {
    const value = metadata[field];
    if (!value || value === 'Ikke vurdert') findings.push({ severity: 'required', field, message: `${label} mangler.` });
  }
  if (metadata.accessLevel === 'Unntatt offentlighet' && !metadata.accessBasis) {
    findings.push({ severity: 'required', field: 'accessBasis', message: 'Oppgi hjemmel når tilgangsnivået er «Unntatt offentlighet».' });
  }
  if (metadata.retentionDecision === 'Kasseres etter angitt tid' && !(Number(metadata.retentionYears) > 0)) {
    findings.push({ severity: 'required', field: 'retentionYears', message: 'Oppgi antall år før kassasjon.' });
  }
  if ((metadata.title || '').length > 180) findings.push({ severity: 'warning', field: 'title', message: 'Tittelen er uvanlig lang.' });
  if (!(metadata.description || '').trim()) findings.push({ severity: 'warning', field: 'description', message: 'Beskrivelse mangler.' });
  if (!Array.isArray(metadata.keywords) || metadata.keywords.length === 0) findings.push({ severity: 'warning', field: 'keywords', message: 'Ingen nøkkelord er registrert.' });
  if ((metadata.personalDataAssessment || '').startsWith('Mulige')) findings.push({ severity: 'warning', field: 'personalDataAssessment', message: 'Mulige personopplysninger må vurderes manuelt.' });
  return findings;
}

export function metadataScore(metadata = {}) {
  const weighted = [
    ['title', 12], ['description', 8], ['creator', 10], ['organizationalUnit', 10],
    ['documentDate', 8], ['documentType', 8], ['subject', 10], ['keywords', 6],
    ['classificationCode', 5], ['accessLevel', 8], ['retentionDecision', 8], ['sha256', 7]
  ];
  let score = 0;
  for (const [field, weight] of weighted) {
    const value = metadata[field];
    const present = Array.isArray(value) ? value.length > 0 : Boolean(value && value !== 'Ikke vurdert');
    if (present) score += weight;
  }
  if (metadata.accessLevel === 'Unntatt offentlighet' && !metadata.accessBasis) score -= 8;
  if (metadata.retentionDecision === 'Kasseres etter angitt tid' && !(Number(metadata.retentionYears) > 0)) score -= 8;
  return Math.max(0, Math.min(100, score));
}

export function asciiSlug(value = '') {
  return value
    .toLocaleLowerCase('nb-NO')
    .replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'dokument';
}

export function proposeFilename(metadata = {}, extension = '') {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(metadata.documentDate || '') ? metadata.documentDate : 'udatert';
  const subject = asciiSlug(metadata.title || 'dokument');
  const ext = String(extension || extensionOf(metadata.originalFileName)).toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${date}_${subject}${ext ? `.${ext}` : ''}`;
}

export function formatBytes(bytes = 0) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  const units = ['KB', 'MB', 'GB'];
  let size = value / 1024;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) { size /= 1024; index += 1; }
  return `${size >= 10 ? size.toFixed(1) : size.toFixed(2)} ${units[index]}`;
}

export function csvCell(value) {
  let text = Array.isArray(value) ? value.join('; ') : String(value ?? '');
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function manifestCsv(records = []) {
  const columns = [
    ['identifier', 'Identifikator'], ['originalFileName', 'Opprinnelig filnavn'],
    ['proposedFileName', 'Foreslått filnavn'], ['title', 'Tittel'], ['description', 'Beskrivelse'],
    ['creator', 'Dokumentansvarlig'], ['organizationalUnit', 'Organisasjonsenhet'],
    ['documentDate', 'Dokumentdato'], ['documentType', 'Dokumenttype'], ['subject', 'Emne/sak'],
    ['keywords', 'Nøkkelord'], ['classificationCode', 'Klassifikasjonskode'], ['caseReference', 'Saksreferanse'],
    ['accessLevel', 'Tilgangsnivå'], ['accessBasis', 'Tilgangshjemmel'],
    ['personalDataAssessment', 'Personopplysningsvurdering'], ['retentionDecision', 'Bevaring/kassasjon'],
    ['retentionYears', 'Kassasjon etter år'], ['disposalYear', 'Kassasjonsår'], ['language', 'Språk'],
    ['format', 'Format'], ['mimeType', 'MIME-type'], ['fileSize', 'Filstørrelse'], ['sha256', 'SHA-256'],
    ['source', 'Kilde/proveniens'], ['relation', 'Relasjon'], ['notes', 'Merknader'], ['generatedAt', 'Generert']
  ];
  const lines = [columns.map(([, label]) => csvCell(label)).join(',')];
  for (const record of records) {
    const metadata = record.metadata || record;
    lines.push(columns.map(([field]) => csvCell(metadata[field])).join(','));
  }
  return `\uFEFF${lines.join('\r\n')}`;
}

export function manifestJson(records = []) {
  return JSON.stringify({
    schema: PROFILE_VERSION,
    exportedAt: new Date().toISOString(),
    fileCount: records.length,
    files: records.map(record => ({ ...(record.metadata || record) }))
  }, null, 2);
}

export function duplicateHashes(records = []) {
  const grouped = new Map();
  for (const record of records) {
    const hash = normalizeSha256((record.metadata || record).sha256);
    if (!hash) continue;
    if (!grouped.has(hash)) grouped.set(hash, []);
    grouped.get(hash).push(record);
  }
  return [...grouped.entries()].filter(([, items]) => items.length > 1);
}
