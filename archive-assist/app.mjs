import {
  LIMITS, TITLE_PROMPT_VERSION, applyAiAnalysis, applyCommonDefaults, calculateDisposalYear,
  createMetadata, duplicateHashes, extensionOf, formatBytes, manifestCsv, manifestJson,
  metadataScore, proposeFilename, suggestDocumentTitle, validateMetadata
} from './engine.mjs';
import { analyzeDocumentWithLocalAi, localAiAvailability } from './ai.mjs';
import { extractTextFromFile } from './extract.mjs';
import { createZip, safeZipPath } from './zip.mjs';

const state = {
  records: [], selectedId: '', busy: false,
  aiAvailability: 'checking', aiActiveIds: new Set(), aiProgress: new Map()
};
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const elements = {
  fileInput: $('#file-input'), dropzone: $('#dropzone'), sampleButton: $('#sample-button'),
  clearButton: $('#clear-button'), applyDefaultsButton: $('#apply-defaults'),
  workspace: $('#workspace'), emptyState: $('#empty-state'), fileList: $('#file-list'),
  fileCount: $('#file-count'), averageScore: $('#average-score'), warningCount: $('#warning-count'),
  duplicateCount: $('#duplicate-count'), editor: $('#metadata-editor'), editorEmpty: $('#editor-empty'),
  editorForm: $('#editor-form'), editorHeading: $('#editor-heading'), editorFilename: $('#editor-filename'),
  editorScore: $('#editor-score'), findings: $('#findings'), signalList: $('#signal-list'),
  extractionList: $('#extraction-list'), jsonButton: $('#download-json'), csvButton: $('#download-csv'),
  zipButton: $('#download-zip'), status: $('#status'), exportNote: $('#export-note'),
  aiBanner: $('#ai-banner'), aiHeading: $('#ai-heading'), aiCopy: $('#ai-copy'),
  runAllAiButton: $('#run-all-ai'), titleSuggestion: $('#title-suggestion'),
  titleReason: $('#title-reason'), titleMethod: $('#title-method'), titleConfidence: $('#title-confidence'),
  titleReview: $('#title-review'), useTitleButton: $('#use-title-suggestion'),
  approveTitleButton: $('#approve-title'), runFileAiButton: $('#run-file-ai'), aiFileStatus: $('#ai-file-status')
};

function setStatus(message, kind = 'info') {
  elements.status.textContent = message;
  elements.status.dataset.kind = kind;
  elements.status.hidden = !message;
}

function setBusy(busy, message = '') {
  state.busy = busy;
  document.body.classList.toggle('is-busy', busy);
  $$('button, input[type="file"]').forEach(control => {
    if (!control.dataset.keepEnabled) control.disabled = busy;
  });
  if (message) setStatus(message, 'info');
}

async function sha256Hex(file) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function commonDefaults() {
  return Object.fromEntries(new FormData($('#defaults-form')).entries());
}

async function refreshAiAvailability() {
  state.aiAvailability = await localAiAvailability();
  renderAiBanner();
  renderTitleSuggestion(selectedRecord());
  return state.aiAvailability;
}

async function addFiles(fileList) {
  const incoming = [...fileList];
  if (!incoming.length) return;
  const totalCount = state.records.length + incoming.length;
  if (totalCount > LIMITS.maxFiles) {
    setStatus(`Maksimalt ${LIMITS.maxFiles} filer kan behandles samtidig.`, 'error');
    return;
  }
  const tooLarge = incoming.find(file => file.size > LIMITS.maxFileSize);
  if (tooLarge) {
    setStatus(`${tooLarge.name} er større enn grensen på ${formatBytes(LIMITS.maxFileSize)}.`, 'error');
    return;
  }
  const existingBytes = state.records.reduce((sum, record) => sum + record.file.size, 0);
  const incomingBytes = incoming.reduce((sum, file) => sum + file.size, 0);
  if (existingBytes + incomingBytes > LIMITS.maxTotalSize) {
    setStatus(`Samlet filstørrelse kan ikke overstige ${formatBytes(LIMITS.maxTotalSize)}.`, 'error');
    return;
  }

  const addedRecords = [];
  setBusy(true, `Leser innhold og analyserer ${incoming.length} ${incoming.length === 1 ? 'fil' : 'filer'} lokalt …`);
  try {
    const defaults = commonDefaults();
    for (const file of incoming) {
      const [extraction, sha256] = await Promise.all([extractTextFromFile(file), sha256Hex(file)]);
      const { metadata, signals } = createMetadata(file, extraction.text, sha256, defaults, new Date(), extraction);
      const record = { id: metadata.identifier, file, text: extraction.text, metadata, signals, extraction };
      state.records.push(record);
      addedRecords.push(record);
    }
    state.selectedId ||= state.records[0]?.id || '';
    const withContent = addedRecords.filter(record => record.text).length;
    setStatus(`${incoming.length} ${incoming.length === 1 ? 'fil er' : 'filer er'} analysert. ${withContent} fikk innholdsbasert tittelforslag. Ingenting er lastet opp.`, 'success');
  } catch (error) {
    console.error(error);
    setStatus('Filene kunne ikke analyseres. Prøv færre, mindre eller andre filer.', 'error');
  } finally {
    setBusy(false);
    render();
  }

  const availability = await refreshAiAvailability();
  if (availability === 'available') await refineRecordsWithAi(addedRecords, { automatic: true });
}

function uniquePackageNames() {
  const used = new Map();
  const result = new Map();
  for (const record of state.records) {
    const proposed = safeZipPath(record.metadata.proposedFileName || record.file.name);
    const ext = extensionOf(proposed);
    const base = ext ? proposed.slice(0, -(ext.length + 1)) : proposed;
    const count = (used.get(proposed.toLowerCase()) || 0) + 1;
    used.set(proposed.toLowerCase(), count);
    result.set(record.id, count === 1 ? proposed : `${base}-${count}${ext ? `.${ext}` : ''}`);
  }
  return result;
}

function renderSummary() {
  const scores = state.records.map(record => metadataScore(record.metadata));
  const findings = state.records.flatMap(record => validateMetadata(record.metadata));
  elements.fileCount.textContent = String(state.records.length);
  elements.averageScore.textContent = scores.length ? `${Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)} %` : '0 %';
  elements.warningCount.textContent = String(findings.length);
  elements.duplicateCount.textContent = String(duplicateHashes(state.records).length);
  const titleReviews = state.records.filter(record => record.metadata.titleReviewStatus === 'Ikke gjennomgått').length;
  elements.exportNote.textContent = findings.length
    ? `${findings.length} punkt${findings.length === 1 ? '' : 'er'} bør gjennomgås før overføring. ${titleReviews ? `${titleReviews} tittelforslag mangler menneskelig kontroll.` : ''}`.trim()
    : 'Alle obligatoriske felt i demonstrasjonsprofilen er fylt ut og titlene er kontrollert.';
}

function reviewLabel(status = '') {
  if (status === 'Godkjent') return 'godkjent';
  if (status === 'Redigert av bruker') return 'menneskeredigert';
  return 'må kontrolleres';
}

function fileCard(record) {
  const findings = validateMetadata(record.metadata);
  const score = metadataScore(record.metadata);
  const required = findings.filter(item => item.severity === 'required').length;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `file-card${record.id === state.selectedId ? ' is-selected' : ''}`;
  button.dataset.id = record.id;
  button.innerHTML = `
    <span class="file-icon" aria-hidden="true">${(extensionOf(record.file.name) || 'FIL').slice(0, 4).toUpperCase()}</span>
    <span class="file-card-main">
      <strong>${escapeHtml(record.metadata.title)}</strong>
      <small title="${escapeHtml(record.file.name)}">${escapeHtml(record.file.name)}</small>
      <span class="file-card-review">${escapeHtml(reviewLabel(record.metadata.titleReviewStatus))}</span>
      <span class="meter"><i style="width:${score}%"></i></span>
    </span>
    <span class="file-card-status"><b>${score}%</b><small>${required ? `${required} mangler` : 'utfylt'}</small></span>`;
  return button;
}

function renderFileList() {
  elements.fileList.replaceChildren(...state.records.map(fileCard));
}

function selectedRecord() {
  return state.records.find(record => record.id === state.selectedId) || null;
}

function setField(name, value) {
  const input = elements.editorForm.elements.namedItem(name);
  if (!input) return;
  input.value = Array.isArray(value) ? value.join(', ') : (value ?? '');
}

function renderEditorChrome(record) {
  if (!record) return;
  const metadata = record.metadata;
  elements.editorHeading.textContent = metadata.title;
  elements.editorFilename.textContent = metadata.proposedFileName;
  elements.editorScore.textContent = `${metadataScore(metadata)} %`;
  elements.editorScore.dataset.score = String(metadataScore(metadata));
  renderTitleSuggestion(record);
  renderFindings(record);
}

function renderEditor() {
  const record = selectedRecord();
  elements.editor.hidden = !record;
  elements.editorEmpty.hidden = Boolean(record);
  if (!record) return;
  for (const [name, value] of Object.entries(record.metadata)) setField(name, value);
  setField('keywords', record.metadata.keywords);
  renderEditorChrome(record);
}

function titleReviewClass(status = '') {
  if (status === 'Godkjent') return 'is-approved';
  if (status === 'Redigert av bruker') return 'is-edited';
  return 'is-pending';
}

function renderTitleSuggestion(record) {
  if (!record || !elements.titleSuggestion) return;
  const metadata = record.metadata;
  elements.titleSuggestion.textContent = metadata.titleSuggestion || metadata.title || 'Ingen forslag';
  elements.titleReason.textContent = metadata.titleSuggestionReason || 'Forslaget bygger på tilgjengelig innhold og metadata.';
  elements.titleMethod.textContent = metadata.titleSuggestionMethod || 'Ukjent metode';
  elements.titleConfidence.textContent = `${Number(metadata.titleSuggestionConfidence || 0)} % sikkerhet`;
  elements.titleReview.textContent = metadata.titleReviewStatus || 'Ikke gjennomgått';
  elements.titleReview.className = `suggestion-chip ${titleReviewClass(metadata.titleReviewStatus)}`;
  elements.useTitleButton.disabled = state.busy || state.aiActiveIds.has(record.id) || !metadata.titleSuggestion;
  elements.approveTitleButton.disabled = state.busy || state.aiActiveIds.has(record.id) || metadata.titleReviewStatus === 'Godkjent';

  const running = state.aiActiveIds.has(record.id);
  const progress = state.aiProgress.get(record.id);
  elements.runFileAiButton.disabled = state.busy || running || !record.text || state.aiAvailability === 'unavailable' || state.aiAvailability === 'checking';
  elements.runFileAiButton.hidden = state.aiAvailability === 'unavailable';
  elements.runFileAiButton.textContent = running
    ? (Number.isFinite(progress) ? `Klargjør lokal AI ${Math.round(progress * 100)} %` : 'Lokal AI analyserer …')
    : (state.aiAvailability === 'downloadable' ? 'Aktiver og forbedre med lokal AI' : 'Forbedre med lokal AI');
  elements.aiFileStatus.textContent = running
    ? 'Dokumentinnholdet behandles lokalt på enheten.'
    : `${metadata.aiAnalysisStatus || 'Ikke kjørt'} · ${metadata.contentExtractionMethod || 'Ingen innholdsuttrekking'} · ${metadata.contentCharacters || 0} tegn analysert.`;
}

function renderFindings(record) {
  const findings = validateMetadata(record.metadata);
  elements.findings.replaceChildren();
  if (!findings.length) {
    const item = document.createElement('li');
    item.className = 'finding success';
    item.textContent = 'Ingen mangler i demonstrasjonsprofilen.';
    elements.findings.append(item);
  } else {
    for (const finding of findings) {
      const item = document.createElement('li');
      item.className = `finding ${finding.severity}`;
      item.textContent = finding.message;
      elements.findings.append(item);
    }
  }

  elements.signalList.replaceChildren();
  const signals = record.signals.length ? record.signals : ['Ingen tydelige signaler i filnavn eller lesbart tekstinnhold.'];
  for (const signal of signals) {
    const item = document.createElement('li');
    item.textContent = signal;
    elements.signalList.append(item);
  }

  elements.extractionList.replaceChildren();
  const extractionItems = [
    `${record.metadata.contentExtractionMethod}: ${record.metadata.contentCharacters || 0} tegn.`,
    ...(record.metadata.contentExtractionWarnings || [])
  ];
  for (const message of extractionItems) {
    const item = document.createElement('li');
    item.textContent = message;
    elements.extractionList.append(item);
  }
}

function renderAiBanner() {
  if (!elements.aiBanner) return;
  const running = state.aiActiveIds.size > 0;
  const contentRecords = state.records.filter(record => record.text);
  const messages = {
    checking: ['Kontrollerer lokal AI', 'Innholdsbaserte tittelforslag virker allerede. Nettleseren kontrolleres for en lokal språkmodell.'],
    available: ['Lokal AI er klar', 'Nettleserens lokale språkmodell kan forbedre saksdokumenttittel og øvrige forslag uten opplasting.'],
    downloadable: ['Lokal AI kan aktiveres', 'Modellen må lastes ned av nettleseren én gang. Dokumentene forlater fortsatt ikke enheten.'],
    downloading: ['Lokal AI lastes ned', 'Nettleseren klargjør modellen lokalt.'],
    unavailable: ['Innholdsbaserte forslag er aktive', 'Archive Assist leser innhold og lager tittelforslag lokalt. Generativ nettleser-AI er ikke tilgjengelig på denne enheten.']
  };
  const [heading, copy] = messages[state.aiAvailability] || messages.unavailable;
  elements.aiHeading.textContent = heading;
  elements.aiCopy.textContent = copy;
  elements.runAllAiButton.hidden = state.aiAvailability === 'unavailable' || state.aiAvailability === 'checking';
  elements.runAllAiButton.disabled = state.busy || running || !contentRecords.length;
  elements.runAllAiButton.textContent = running
    ? `Lokal AI arbeider med ${state.aiActiveIds.size} fil${state.aiActiveIds.size === 1 ? '' : 'er'} …`
    : (state.aiAvailability === 'downloadable' ? 'Aktiver lokal AI og analyser alle' : 'Forbedre alle med lokal AI');
}

function render() {
  const hasFiles = state.records.length > 0;
  elements.workspace.hidden = !hasFiles;
  elements.emptyState.hidden = hasFiles;
  elements.clearButton.hidden = !hasFiles;
  [elements.jsonButton, elements.csvButton, elements.zipButton].forEach(button => { button.disabled = !hasFiles || state.busy; });
  renderSummary();
  renderFileList();
  renderAiBanner();
  renderEditor();
}

function rebuildLocalTitleSuggestion(record, { replaceCurrent = true } = {}) {
  const metadata = record.metadata;
  const previousSuggestion = metadata.titleSuggestion;
  const suggestion = suggestDocumentTitle({
    filename: record.file.name,
    text: record.text,
    documentType: metadata.documentType,
    subject: metadata.subject
  });
  const canReplace = replaceCurrent && metadata.titleReviewStatus === 'Ikke gjennomgått' && (!metadata.title || metadata.title === previousSuggestion);
  metadata.titleSuggestion = suggestion.title;
  metadata.titleSuggestionMethod = suggestion.method;
  metadata.titleSuggestionConfidence = suggestion.confidence;
  metadata.titleSuggestionReason = suggestion.reason;
  metadata.titleSuggestionGeneratedAt = new Date().toISOString();
  metadata.titlePromptVersion = TITLE_PROMPT_VERSION;
  if (canReplace) metadata.title = suggestion.title;
  metadata.proposedFileName = proposeFilename(metadata, extensionOf(record.file.name));
}

function saveEditor(event, fullRender = false) {
  const record = selectedRecord();
  if (!record) return;
  const prior = record.metadata;
  const data = Object.fromEntries(new FormData(elements.editorForm).entries());
  const metadata = { ...prior };
  for (const [key, value] of Object.entries(data)) metadata[key] = String(value).trim();
  metadata.keywords = String(data.keywords || '').split(',').map(value => value.trim()).filter(Boolean);
  metadata.retentionYears = String(data.retentionYears || '').trim();
  if (event?.target?.name === 'title' && metadata.title !== prior.title) metadata.titleReviewStatus = 'Redigert av bruker';
  metadata.disposalYear = calculateDisposalYear(metadata.documentDate, metadata.retentionDecision, metadata.retentionYears);
  metadata.proposedFileName = proposeFilename(metadata, extensionOf(record.file.name));
  record.metadata = metadata;

  if (['subject', 'documentType'].includes(event?.target?.name) && metadata.titleReviewStatus === 'Ikke gjennomgått') {
    rebuildLocalTitleSuggestion(record);
    setField('title', record.metadata.title);
  }

  if (fullRender) render();
  else {
    renderSummary();
    renderFileList();
    renderEditorChrome(record);
  }
}

function removeRecord(id) {
  const index = state.records.findIndex(record => record.id === id);
  if (index < 0) return;
  state.records.splice(index, 1);
  if (state.selectedId === id) state.selectedId = state.records[index]?.id || state.records[index - 1]?.id || '';
  render();
}

function applyDefaultsToAll() {
  const defaults = commonDefaults();
  const overwrite = $('#overwrite-defaults').checked;
  state.records.forEach(record => {
    record.metadata = applyCommonDefaults(record.metadata, defaults, overwrite);
    if (record.metadata.titleReviewStatus === 'Ikke gjennomgått') rebuildLocalTitleSuggestion(record);
  });
  setStatus(`Felles metadata er brukt på ${state.records.length} ${state.records.length === 1 ? 'fil' : 'filer'}, og åpne tittelforslag er oppdatert.`, 'success');
  render();
}

async function refineRecordWithAi(record, { automatic = false } = {}) {
  if (!record?.text || state.aiActiveIds.has(record.id)) return false;
  state.aiActiveIds.add(record.id);
  state.aiProgress.delete(record.id);
  record.metadata.aiAnalysisStatus = 'Analyserer lokalt';
  renderAiBanner();
  renderTitleSuggestion(record);
  try {
    const result = await analyzeDocumentWithLocalAi({
      fileName: record.file.name,
      text: record.text,
      metadata: record.metadata,
      onDownloadProgress: progress => {
        state.aiAvailability = progress < 1 ? 'downloading' : 'available';
        state.aiProgress.set(record.id, progress);
        renderAiBanner();
        if (record.id === state.selectedId) renderTitleSuggestion(record);
      }
    });
    record.metadata = applyAiAnalysis(record.metadata, result);
    state.aiAvailability = 'available';
    return true;
  } catch (error) {
    console.error(error);
    record.metadata.aiAnalysisStatus = `Ikke fullført: ${error.message}`;
    if (!automatic) setStatus(error.message || 'Lokal AI kunne ikke analysere dokumentet.', 'error');
    if (error.code === 'AI_UNAVAILABLE') state.aiAvailability = 'unavailable';
    return false;
  } finally {
    state.aiActiveIds.delete(record.id);
    state.aiProgress.delete(record.id);
    render();
  }
}

async function refineRecordsWithAi(records = state.records, { automatic = false } = {}) {
  const candidates = records.filter(record => record.text && !state.aiActiveIds.has(record.id));
  if (!candidates.length) {
    if (!automatic) setStatus('Ingen av filene har lesbart innhold som lokal AI kan analysere.', 'error');
    return;
  }
  let completed = 0;
  for (const record of candidates) {
    if (await refineRecordWithAi(record, { automatic })) completed += 1;
  }
  if (completed) {
    setStatus(`${completed} ${completed === 1 ? 'tittelforslag er' : 'tittelforslag er'} forbedret med lokal AI. Kontroller og rediger før eksport.`, 'success');
  }
}

function useAndApproveSuggestion() {
  const record = selectedRecord();
  if (!record?.metadata.titleSuggestion) return;
  record.metadata.title = record.metadata.titleSuggestion;
  record.metadata.titleReviewStatus = 'Godkjent';
  record.metadata.proposedFileName = proposeFilename(record.metadata, extensionOf(record.file.name));
  setStatus('Saksdokumenttittelen er brukt og markert som godkjent.', 'success');
  render();
}

function approveCurrentTitle() {
  const record = selectedRecord();
  if (!record?.metadata.title) return;
  record.metadata.titleReviewStatus = 'Godkjent';
  setStatus('Gjeldende saksdokumenttittel er markert som godkjent.', 'success');
  render();
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function datedName(extension) {
  const date = new Date().toISOString().slice(0, 10);
  return `archive-assist-${date}.${extension}`;
}

async function exportZip() {
  if (!state.records.length) return;
  setBusy(true, 'Bygger arkivpakken lokalt …');
  try {
    const names = uniquePackageNames();
    const entries = [
      { name: 'README.txt', data: packageReadme() },
      { name: 'manifest.json', data: manifestJson(state.records) },
      { name: 'manifest.csv', data: manifestCsv(state.records) }
    ];
    for (const record of state.records) {
      const packageName = names.get(record.id);
      const metadataName = packageName.replace(/\.[^.]+$/, '');
      entries.push({ name: `dokumenter/${packageName}`, data: record.file, date: new Date(record.file.lastModified) });
      entries.push({ name: `metadata/${metadataName}.metadata.json`, data: JSON.stringify(record.metadata, null, 2) });
    }
    const blob = await createZip(entries);
    download(blob, datedName('zip'));
    setStatus('Arkivpakken er laget. Titler, kontrollstatus og forslagsgrunnlag følger metadataene.', 'success');
  } catch (error) {
    console.error(error);
    setStatus('Arkivpakken kunne ikke lages.', 'error');
  } finally {
    setBusy(false);
    render();
  }
}

function packageReadme() {
  return `ARCHIVE ASSIST – METADATAPAKKE\n\nOpprettet: ${new Date().toLocaleString('nb-NO')}\nAntall dokumenter: ${state.records.length}\nTittelprompt: ${TITLE_PROMPT_VERSION}\n\nINNHOLD\n- dokumenter/: kopier av valgte filer med normaliserte filnavn\n- metadata/: én JSON-sidecar per dokument\n- manifest.json: samlet maskinlesbart manifest\n- manifest.csv: tabell for kontroll og videre import\n\nTITTELKONTROLL\nSaksdokumenttitler foreslås fra dokumentinnhold og tilgjengelige metadata. Der nettleseren støtter lokal generativ AI, kan forslagene forbedres på enheten. Forslag er aldri et automatisk arkivvedtak; feltet titleReviewStatus viser om en saksbehandler eller arkivar har godkjent eller redigert tittelen.\n\nVIKTIG\nArchive Assist er en demonstrasjon og erstatter ikke journalføring, arkivfaglig vurdering, tilgangskontroll, bevarings- og kassasjonsvedtak eller kontroll mot et konkret sak-/arkivsystem. Binærfilene endres ikke; metadata bindes til dokumentene gjennom sidecar-filer og manifest.\n`;
}

function loadSamples() {
  const now = Date.now();
  const samples = [
    new File([
      'Møtereferat – anskaffelse av nytt sak- og arkivsystem.\n\nAvdeling: Digital forvaltning\nForfatter: Kari Nordmann\nDato: 28.08.2026\n\nMøtet gjennomgikk krav til dokumentfangst, tilgangsstyring, metadata og avlevering. Beslutning: Arbeidsgruppen lager et første forslag til metadataprofil innen 15. september.'
    ], '2026-08-28_motereferat_anskaffelse.txt', { type: 'text/plain', lastModified: now - 86400000 * 5 }),
    new File([
      '# Prosedyre for dokumentfangst\n\nFormålet er å sikre at arkivverdig dokumentasjon blir identifisert, registrert og knyttet til riktig sak. Dokumentansvarlig kontrollerer saksdokumenttittel, dato, tilgang og bevaringsstatus før registrering.'
    ], 'prosedyre_dokumentfangst_v1.md', { type: 'text/markdown', lastModified: now - 86400000 * 18 }),
    new File([
      'Emne: Budsjett for digitalisering i 2027\nområde,budsjett,år\nDigitalisering,1250000,2027\nOpplæring,240000,2027\nForvaltning,780000,2027\n'
    ], 'budsjett_digitalisering_2027.csv', { type: 'text/csv', lastModified: now - 86400000 * 2 })
  ];
  addFiles(samples);
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

elements.fileInput.addEventListener('change', event => { addFiles(event.target.files); event.target.value = ''; });
elements.dropzone.addEventListener('dragover', event => { event.preventDefault(); elements.dropzone.classList.add('is-over'); });
elements.dropzone.addEventListener('dragleave', () => elements.dropzone.classList.remove('is-over'));
elements.dropzone.addEventListener('drop', event => {
  event.preventDefault();
  elements.dropzone.classList.remove('is-over');
  addFiles(event.dataTransfer.files);
});
elements.dropzone.addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); elements.fileInput.click(); }
});
elements.sampleButton.addEventListener('click', loadSamples);
elements.clearButton.addEventListener('click', () => {
  state.records = []; state.selectedId = ''; setStatus('Arbeidsflaten er tømt.', 'info'); render();
});
elements.applyDefaultsButton.addEventListener('click', applyDefaultsToAll);
elements.fileList.addEventListener('click', event => {
  const card = event.target.closest('.file-card');
  if (!card) return;
  state.selectedId = card.dataset.id;
  render();
});
elements.editorForm.addEventListener('input', event => saveEditor(event, false));
elements.editorForm.addEventListener('change', event => saveEditor(event, true));
$('#remove-file').addEventListener('click', () => { const record = selectedRecord(); if (record) removeRecord(record.id); });
$('#reset-suggestion').addEventListener('click', () => {
  const record = selectedRecord();
  if (!record) return;
  record.metadata.titleReviewStatus = 'Ikke gjennomgått';
  rebuildLocalTitleSuggestion(record, { replaceCurrent: true });
  record.metadata.aiAnalysisStatus = 'Ikke kjørt';
  setStatus('Et nytt lokalt tittelforslag er laget fra innhold og metadata.', 'success');
  render();
});
elements.useTitleButton.addEventListener('click', useAndApproveSuggestion);
elements.approveTitleButton.addEventListener('click', approveCurrentTitle);
elements.runFileAiButton.addEventListener('click', async () => {
  const record = selectedRecord();
  if (record) await refineRecordsWithAi([record]);
});
elements.runAllAiButton.addEventListener('click', () => refineRecordsWithAi(state.records));
elements.jsonButton.addEventListener('click', () => download(new Blob([manifestJson(state.records)], { type: 'application/json' }), datedName('json')));
elements.csvButton.addEventListener('click', () => download(new Blob([manifestCsv(state.records)], { type: 'text/csv;charset=utf-8' }), datedName('csv')));
elements.zipButton.addEventListener('click', exportZip);

render();
refreshAiAvailability();
