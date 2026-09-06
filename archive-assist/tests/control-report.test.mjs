import test from 'node:test';
import assert from 'node:assert/strict';
import { buildControlReport, summarizeControl } from '../control-report.mjs';

const readyRecord = {
  file: { name: 'referat.docx' },
  metadata: {
    title: 'Referat fra prosjektmøte',
    titleSuggestion: 'Referat fra prosjektmøte',
    titleSuggestionMethod: 'Overskrift i dokumentet',
    titleReviewStatus: 'Godkjent',
    proposedFileName: 'referat-fra-prosjektmote.docx',
    sha256: 'abc123',
  },
};

test('kontrollstatus blir klar når obligatoriske felt og tittel er kontrollert', () => {
  const summary = summarizeControl([readyRecord], {
    validate: () => [],
    score: () => 96,
    duplicateGroups: () => [],
  });
  assert.equal(summary.ready, true);
  assert.equal(summary.status, 'Klar for kontrollert eksport');
  assert.equal(summary.averageScore, 96);
});

test('manglende tittelkontroll holder arbeidsflaten tilbake', () => {
  const record = structuredClone(readyRecord);
  record.metadata.titleReviewStatus = 'Ikke gjennomgått';
  const summary = summarizeControl([record], { validate: () => [], score: () => 80 });
  assert.equal(summary.ready, false);
  assert.equal(summary.pendingTitles, 1);
  assert.equal(summary.status, 'Må gjennomgås');
});

test('kontrollrapport viser sporbarhet og kontrollpunkter', () => {
  const report = buildControlReport([readyRecord], {
    validate: () => [{ severity: 'warning', message: 'Kontroller tilgang.' }],
    score: () => 91,
    duplicateGroups: () => [['a', 'b']],
    generatedAt: new Date('2026-09-06T08:00:00Z'),
  });
  assert.match(report, /Archive Assist – kontrollrapport/);
  assert.match(report, /Referat fra prosjektmøte/);
  assert.match(report, /SHA-256: abc123/);
  assert.match(report, /Kontroller tilgang/);
  assert.match(report, /duplikat/i);
});
