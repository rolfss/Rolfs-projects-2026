import { validateAsset } from './engine.mjs';

export const TYPE_LABELS = Object.freeze({
  Dataset: 'Datasett', 'Data service/API': 'Datatjeneste / API',
  'Document collection': 'Dokumentsamling', 'Information model': 'Informasjonsmodell',
  'Business term': 'Virksomhetsbegrep', 'Code list': 'Kodeverk',
  'Report/analytical product': 'Rapport / analyseprodukt'
});
export const DEFAULT_FILTERS = Object.freeze({query: '', type: '', status: '', attention: 'all', sort: 'priority'});
const statuses = {Draft: 'Utkast', Review: 'Til vurdering', Approved: 'Godkjent', Published: 'Publisert'};
const text = value => String(value ?? '').normalize('NFC').toLocaleLowerCase('nb-NO').trim();

/** Bevarer gamle søk, men migrerer v2-filteret ownerGap og avviser ukjente valg. */
export function normalizeFilters(value = {}) {
  const f = value && typeof value === 'object' ? value : {};
  return {
    query: typeof f.query === 'string' ? f.query : '',
    type: Object.hasOwn(TYPE_LABELS, f.type) ? f.type : '',
    status: Object.hasOwn(statuses, f.status) ? f.status : '',
    attention: ['all', 'required', 'owners', 'review'].includes(f.attention)
      ? f.attention : f.ownerGap === true ? 'owners' : 'all',
    sort: ['priority', 'title'].includes(f.sort) ? f.sort : 'priority'
  };
}

/** Samme regelmotor brukes til diagnose, filtre, antall og prioritering. */
export function buildCatalog(assets, relationships, filters = {}, selectedId = '') {
  const f = normalizeFilters(filters);
  const terms = text(f.query).split(/\s+/).filter(Boolean);
  const matches = {
    all: () => true,
    required: row => row.required > 0,
    owners: row => row.findings.some(x => ['META-001', 'META-002'].includes(x.id)),
    review: row => row.findings.some(x => x.id === 'META-008')
  };
  const candidates = assets.filter(asset => {
    if (f.type && asset.type !== f.type) return false;
    if (f.status && asset.status !== f.status) return false;
    const searchable = text([asset.title, asset.id, asset.type, TYPE_LABELS[asset.type],
      asset.unit, asset.owner, asset.steward, asset.description, statuses[asset.status]].join(' '));
    return terms.every(term => searchable.includes(term));
  }).map(asset => {
    const findings = validateAsset(asset, assets, relationships);
    return {asset, findings, required: findings.filter(x => x.severity === 'required').length};
  });
  const counts = Object.fromEntries(Object.entries(matches).map(([key, predicate]) =>
    [key, candidates.filter(predicate).length]));
  const rows = candidates.filter(matches[f.attention]).sort((a, b) => {
    if (f.sort === 'priority') {
      const difference = b.required - a.required || b.findings.length - a.findings.length;
      if (difference) return difference;
    }
    return a.asset.title.localeCompare(b.asset.title, 'nb-NO') || a.asset.id.localeCompare(b.asset.id);
  });
  const selected = rows.find(row => row.asset.id === selectedId) || rows[0] || null;
  return {filters: f, rows, counts, selected};
}
