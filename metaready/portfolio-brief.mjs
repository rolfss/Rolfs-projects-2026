import { calculateQuality, priorityScore, validateAsset } from './engine.mjs';

function countBy(items, key) {
  const counts = new Map();
  for (const item of items) {
    const value = item?.[key] || 'Ikke angitt';
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), 'nb'));
}

function qualityScore(dimensions = []) {
  if (!dimensions.length) return 0;
  return Math.round(dimensions.reduce((sum, dimension) => sum + Number(dimension.score || 0), 0) / dimensions.length);
}

export function portfolioSnapshot(state, relationships = []) {
  const assets = state?.assets || [];
  const backlog = state?.backlog || [];
  const rows = assets.map((asset) => {
    const findings = validateAsset(asset, assets, relationships);
    const quality = calculateQuality(asset, findings);
    return {
      asset,
      findings,
      quality,
      qualityScore: qualityScore(quality),
      required: findings.filter((finding) => finding.severity === 'required').length,
    };
  });

  const ownershipGaps = assets.filter((asset) => !String(asset.owner || '').trim()).length;
  const stewardshipGaps = assets.filter((asset) => !String(asset.steward || '').trim()).length;
  const attention = rows
    .filter((row) => row.required > 0 || row.qualityScore < 70)
    .sort((a, b) => b.required - a.required || a.qualityScore - b.qualityScore);
  const prioritizedBacklog = [...backlog]
    .sort((a, b) => priorityScore(b) - priorityScore(a))
    .slice(0, 7);

  return {
    assets: assets.length,
    relationships: relationships.length,
    ownershipGaps,
    stewardshipGaps,
    statuses: countBy(assets, 'status'),
    types: countBy(assets, 'type'),
    attention,
    prioritizedBacklog,
  };
}

export function buildPortfolioBrief(state, relationships = [], { generatedAt = new Date() } = {}) {
  const snapshot = portfolioSnapshot(state, relationships);
  const lines = [
    '# MetaReady – ledelsesbrief for informasjonsporteføljen',
    '',
    `**Opprettet:** ${generatedAt.toLocaleString('nb-NO')}`,
    `**Informasjonsressurser:** ${snapshot.assets}`,
    `**Registrerte relasjoner:** ${snapshot.relationships}`,
    `**Mangler ansvarlig eier:** ${snapshot.ownershipGaps}`,
    `**Mangler operativ forvalter:** ${snapshot.stewardshipGaps}`,
    '',
    '## Porteføljestatus',
  ];

  for (const [status, count] of snapshot.statuses) lines.push(`- ${status}: ${count}`);

  lines.push('', '## Ressurser som bør få oppmerksomhet');
  if (!snapshot.attention.length) lines.push('- Ingen tydelige sperrer i demonstrasjonsprofilen.');
  for (const row of snapshot.attention.slice(0, 8)) {
    lines.push(`- **${row.asset.title}** (${row.asset.id}) — kvalitet ${row.qualityScore} %, ${row.required} obligatoriske mangler.`);
  }

  lines.push('', '## Prioriterte tiltak');
  if (!snapshot.prioritizedBacklog.length) lines.push('- Ingen åpne tiltak.');
  for (const item of snapshot.prioritizedBacklog) {
    lines.push(`- **P${priorityScore(item)} · ${item.title}** — ${item.status}; ${item.ownerRole}.`);
    if (item.reason) lines.push(`  - ${item.reason}`);
  }

  lines.push(
    '',
    '## Anbefalt styringsrekkefølge',
    '1. Tydeliggjør eierskap og operativt forvaltningsansvar.',
    '2. Lukk obligatoriske metadata- og proveniensmangler.',
    '3. Prioriter tiltak etter konsekvens, risiko og avhengigheter.',
    '4. Vurder AI-bruk først når kvalitet, tilgang, livsløp og sporbarhet kan dokumenteres.',
    '',
    'Briefen er generert lokalt fra den syntetiske MetaReady-demoen. Den er beslutningsstøtte, ikke en samsvars- eller risikogodkjenning.',
  );

  return lines.join('\n');
}
