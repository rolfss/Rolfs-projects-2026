function fileName(record) {
  return record?.file?.name || record?.metadata?.originalFileName || 'Ukjent fil';
}

function titleStatus(metadata = {}) {
  return metadata.titleReviewStatus || 'Ikke gjennomgått';
}

export function summarizeControl(records = [], {
  validate = () => [],
  score = () => 0,
  duplicateGroups = () => [],
} = {}) {
  const findingsByRecord = records.map((record) => ({ record, findings: validate(record.metadata) || [] }));
  const allFindings = findingsByRecord.flatMap(({ findings }) => findings);
  const required = allFindings.filter((finding) => finding.severity === 'required').length;
  const pendingTitles = records.filter((record) => titleStatus(record.metadata) === 'Ikke gjennomgått').length;
  const duplicates = duplicateGroups(records)?.length || 0;
  const scores = records.map((record) => Number(score(record.metadata)) || 0);
  const averageScore = scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : 0;

  let status = 'Tom arbeidsflate';
  let ready = false;
  if (records.length) {
    ready = required === 0 && pendingTitles === 0;
    status = ready
      ? (duplicates ? 'Klar med duplikatmerknad' : 'Klar for kontrollert eksport')
      : 'Må gjennomgås';
  }

  return {
    records: records.length,
    findings: allFindings.length,
    required,
    pendingTitles,
    duplicates,
    averageScore,
    ready,
    status,
    findingsByRecord,
  };
}

export function buildControlReport(records = [], options = {}) {
  const summary = summarizeControl(records, options);
  const generatedAt = options.generatedAt instanceof Date ? options.generatedAt : new Date(options.generatedAt || Date.now());
  const lines = [
    '# Archive Assist – kontrollrapport',
    '',
    `**Opprettet:** ${generatedAt.toLocaleString('nb-NO')}`,
    `**Kontrollstatus:** ${summary.status}`,
    `**Dokumenter:** ${summary.records}`,
    `**Gjennomsnittlig metadatautfylling:** ${summary.averageScore} %`,
    `**Obligatoriske mangler:** ${summary.required}`,
    `**Titler som ikke er gjennomgått:** ${summary.pendingTitles}`,
    `**Mulige duplikatgrupper:** ${summary.duplicates}`,
    '',
    '## Dokumentkontroll',
  ];

  if (!records.length) lines.push('- Ingen dokumenter i arbeidsflaten.');

  for (const { record, findings } of summary.findingsByRecord) {
    const metadata = record.metadata || {};
    const recordScore = Number(options.score?.(metadata)) || 0;
    lines.push(
      '',
      `### ${metadata.title || fileName(record)}`,
      `- Originalfil: ${fileName(record)}`,
      `- Foreslått filnavn: ${metadata.proposedFileName || 'Ikke foreslått'}`,
      `- Tittelkontroll: ${titleStatus(metadata)}`,
      `- Metadatautfylling: ${recordScore} %`,
      `- Tittelforslag: ${metadata.titleSuggestion || 'Ikke tilgjengelig'}`,
      `- Metode: ${metadata.titleSuggestionMethod || 'Ikke angitt'}`,
      `- SHA-256: ${metadata.sha256 || 'Ikke beregnet'}`,
    );
    if (!findings.length) lines.push('- Kontrollpunkter: Ingen mangler i demonstrasjonsprofilen.');
    else {
      lines.push('- Kontrollpunkter:');
      for (const finding of findings) lines.push(`  - [${finding.severity || 'info'}] ${finding.message}`);
    }
  }

  lines.push(
    '',
    '## Før videre overføring',
    '- Kontroller tilgang, journalføringsbehov, arkivverdi og bevaring/kassasjon mot virksomhetens regler.',
    '- Kontroller at saksdokumenttittelen er meningsbærende og ikke røper opplysninger som skal skjermes.',
    '- Avklar mulige duplikater før registrering eller import.',
    '',
    'Rapporten er generert lokalt. Archive Assist er beslutningsstøtte og erstatter ikke arkivfaglig godkjenning.',
  );

  return lines.join('\n');
}
