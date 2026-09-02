import {
  LIMITS, applyCommonDefaults, calculateDisposalYear, createMetadata, duplicateHashes,
  extensionOf, formatBytes, isTextReadable, manifestCsv, manifestJson, metadataScore,
  proposeFilename, validateMetadata
} from './engine.mjs';
import { createZip, safeZipPath } from './zip.mjs';

const state = { records: [], selectedId: '', busy: false };
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
  jsonButton: $('#download-json'), csvButton: $('#download-csv'), zipButton: $('#download-zip'),
  status: $('#status'), exportNote: $('#export-note')
};

function setStatus(message, kind = 'info') {
  elements.status.textContent = message;
  elements.status.dataset.kind = kind;
  elements.status.hidden = !message;
}

function setBusy(busy, message = '') {
  state.busy = busy;
  document.body.classList.toggle('is-busy', busy);
  $$('button, input[type="file"]').forEach(control => { if (!control.dataset.keepEnabled) control.disabled = busy; });
  if (message) setStatus(message, 'info');
}

async function sha256Hex(file) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function readTextPreview(file) {
  if (!isTextReadable(file.name, file.type)) return '';
  return file.slice(0, 200000).text();
}

function commonDefaults() {
  return Object.fromEntries(new FormData($('#defaults-form')).entries());
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

  setBusy(true, `Analyserer ${incoming.length} ${incoming.length === 1 ? 'fil' : 'filer'} lokalt …`);
  try {
    const defaults = commonDefaults();
    for (const file of incoming) {
      const [text, sha256] = await Promise.all([readTextPreview(file), sha256Hex(file)]);
      const { metadata, signals } = createMetadata(file, text, sha256, defaults);
      state.records.push({ id: metadata.identifier, file, text, metadata, signals });
    }
    state.selectedId ||= state.records[0]?.id || '';
    setStatus(`${incoming.length} ${incoming.length === 1 ? 'fil er' : 'filer er'} analysert. Ingenting er lastet opp.`, 'success');
  } catch (error) {
    console.error(error);
    setStatus('Filene kunne ikke analyseres. Prøv færre eller mindre filer.', 'error');
  } finally {
    setBusy(false);
    render();
  }
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
  elements.exportNote.textContent = findings.length
    ? `${findings.length} punkt${findings.length === 1 ? '' : 'er'} bør gjennomgås før overføring til et arkivsystem.`
    : 'Alle obligatoriske felt i demonstrasjonsprofilen er fylt ut.';
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
      <span class="meter"><i style="width:${score}%"></i></span>
    </span>
    <span class="file-card-status"><b>${score}%</b><small>${required ? `${required} mangler` : 'klar'}</small></span>`;
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

function renderEditor() {
  const record = selectedRecord();
  elements.editor.hidden = !record;
  elements.editorEmpty.hidden = Boolean(record);
  if (!record) return;
  const metadata = record.metadata;
  elements.editorHeading.textContent = metadata.title;
  elements.editorFilename.textContent = metadata.proposedFileName;
  elements.editorScore.textContent = `${metadataScore(metadata)} %`;
  elements.editorScore.dataset.score = String(metadataScore(metadata));
  for (const [name, value] of Object.entries(metadata)) setField(name, value);
  setField('keywords', metadata.keywords);
  renderFindings(record);
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
}

function render() {
  const hasFiles = state.records.length > 0;
  elements.workspace.hidden = !hasFiles;
  elements.emptyState.hidden = hasFiles;
  elements.clearButton.hidden = !hasFiles;
  [elements.jsonButton, elements.csvButton, elements.zipButton].forEach(button => { button.disabled = !hasFiles || state.busy; });
  renderSummary();
  renderFileList();
  renderEditor();
}

function saveEditor() {
  const record = selectedRecord();
  if (!record) return;
  const data = Object.fromEntries(new FormData(elements.editorForm).entries());
  const metadata = { ...record.metadata };
  for (const [key, value] of Object.entries(data)) metadata[key] = String(value).trim();
  metadata.keywords = String(data.keywords || '').split(',').map(value => value.trim()).filter(Boolean);
  metadata.retentionYears = String(data.retentionYears || '').trim();
  metadata.disposalYear = calculateDisposalYear(metadata.documentDate, metadata.retentionDecision, metadata.retentionYears);
  metadata.proposedFileName = proposeFilename(metadata, extensionOf(record.file.name));
  record.metadata = metadata;
  render();
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
  state.records.forEach(record => { record.metadata = applyCommonDefaults(record.metadata, defaults, overwrite); });
  setStatus(`Felles metadata er brukt på ${state.records.length} ${state.records.length === 1 ? 'fil' : 'filer'}.`, 'success');
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
    setStatus('Arkivpakken er laget. Filene ble behandlet og pakket i nettleseren.', 'success');
  } catch (error) {
    console.error(error);
    setStatus('Arkivpakken kunne ikke lages.', 'error');
  } finally {
    setBusy(false);
    render();
  }
}

function packageReadme() {
  return `ARCHIVE ASSIST – METADATAPAKKE\n\nOpprettet: ${new Date().toLocaleString('nb-NO')}\nAntall dokumenter: ${state.records.length}\n\nINNHOLD\n- dokumenter/: kopier av valgte filer med normaliserte filnavn\n- metadata/: én JSON-sidecar per dokument\n- manifest.json: samlet maskinlesbart manifest\n- manifest.csv: tabell for kontroll og videre import\n\nVIKTIG\nArchive Assist er en demonstrasjon og erstatter ikke journalføring, arkivfaglig vurdering, tilgangskontroll, bevarings- og kassasjonsvedtak eller kontroll mot et konkret sak-/arkivsystem. Binærfilene endres ikke; metadata bindes til dokumentene gjennom sidecar-filer og manifest.\n`;
}

function loadSamples() {
  const now = Date.now();
  const samples = [
    new File([
      'Møtereferat – anskaffelse av nytt sak- og arkivsystem. Møtet gjennomgikk krav til dokumentfangst, tilgangsstyring, metadata og avlevering. Beslutning: arbeidsgruppen lager et første forslag til metadataprofil innen 15. september.'
    ], '2026-08-28_motereferat_anskaffelse.txt', { type: 'text/plain', lastModified: now - 86400000 * 5 }),
    new File([
      '# Prosedyre for dokumentfangst\n\nFormålet er å sikre at arkivverdig dokumentasjon blir identifisert, registrert og knyttet til riktig sak. Dokumentansvarlig kontrollerer tittel, dato, tilgang og bevaringsstatus før publisering.'
    ], 'prosedyre_dokumentfangst_v1.md', { type: 'text/markdown', lastModified: now - 86400000 * 18 }),
    new File([
      'område,budsjett,år\nDigitalisering,1250000,2027\nOpplæring,240000,2027\nForvaltning,780000,2027\n'
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
elements.editorForm.addEventListener('input', saveEditor);
elements.editorForm.addEventListener('change', saveEditor);
$('#remove-file').addEventListener('click', () => { const record = selectedRecord(); if (record) removeRecord(record.id); });
$('#reset-suggestion').addEventListener('click', () => {
  const record = selectedRecord();
  if (!record) return;
  const { metadata, signals } = createMetadata(record.file, record.text, record.metadata.sha256, commonDefaults());
  record.metadata = metadata; record.signals = signals; render();
});
elements.jsonButton.addEventListener('click', () => download(new Blob([manifestJson(state.records)], { type: 'application/json' }), datedName('json')));
elements.csvButton.addEventListener('click', () => download(new Blob([manifestCsv(state.records)], { type: 'text/csv;charset=utf-8' }), datedName('csv')));
elements.zipButton.addEventListener('click', exportZip);

render();
