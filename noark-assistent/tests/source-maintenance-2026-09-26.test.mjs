import test from 'node:test';
import assert from 'node:assert/strict';
import { answerQuestion, searchRecords, normalize, sourceUrl } from '../engine.mjs';
import { retrieveConversation } from '../rag-shared.mjs';
import { buildPayload } from '../../noark-api/worker.mjs';

const visibleText = (answer) => normalize([answer.lead, ...answer.points.map((point) => point.text)].join(' '));
const evidenceText = (record) => normalize(`${record.summary} ${record.detail}`);

function localAnswer(question, expectedId) {
  assert.ok(searchRecords(question, { limit: 4 }).some(({ record }) => record.id === expectedId),
    `${question}: relevant source is missing from the first four search results`);
  const answer = answerQuestion(question);
  assert.equal(answer.status, 'ok');
  assert.ok(answer.results.some(({ record }) => record.id === expectedId),
    `${question}: relevant source is missing from the local answer`);
  return answer;
}

function modelEvidence(question, expectedIds, history = []) {
  const candidates = retrieveConversation(question, history);
  assert.ok(candidates.length <= 12);
  const payload = buildPayload(question, history, candidates);
  const input = JSON.parse(payload.body.input[0].content);
  return expectedIds.map((id) => {
    const evidence = input.source_records.find((record) => record.id === id);
    assert.ok(evidence, `${question}: ${id} is missing from the actual model input`);
    assert.ok(evidence.section && evidence.publisher && evidence.sourceTitle,
      'The model must receive provenance with the factual qualification');
    return evidence;
  });
}

test('M003 answers show an unconditional mappeID change prohibition', () => {
  const question = 'Kan M003 mappeID endres?';
  const answer = localAnswer(question, 'meta-map-id');
  assert.match(visibleText(answer), /mappeid.{0,130}skal ikke kunne endres/);
  const [evidence] = modelEvidence(question, ['meta-map-id']);
  const text = evidenceText(evidence);
  assert.match(text, /entydig/);
  assert.match(text, /skal ikke kunne endres/);
  assert.doesNotMatch(text, /normalt/);
  assert.match(text, /saksar/);
  assert.match(text, /sakssekvensnummer/);
  assert.equal(evidence.requirement, 'M003');
  assert.equal(evidence.page, 6);
});

test('moving a registration does not transfer the M004 exception to M003', () => {
  const question = 'Kan M004 registreringsID endres ved flytting til en annen mappe?';
  const answer = localAnswer(question, 'meta-registration-id');
  assert.match(visibleText(answer), /registreringsid/);
  const [registration, folder] = modelEvidence(question, ['meta-registration-id', 'meta-map-id']);
  assert.equal(registration.requirement, 'M004');
  assert.match(evidenceText(registration), /flytting.{0,80}kan.{0,45}endring/);
  assert.doesNotMatch(evidenceText(registration), /skal ikke kunne endres/);
  assert.equal(folder.requirement, 'M003');
  assert.match(evidenceText(folder), /skal ikke kunne endres/);
  assert.doesNotMatch(evidenceText(folder), /flytting.{0,80}kan.{0,45}endring/);
});

test('an Arkade 2.13.0 package question receives the METS defect and its fixed version', () => {
  const question = 'Vi har laget en Noark 5-pakke i Arkade 2.13.0. Kan METS mangle filbeskrivelser?';
  const answer = localAnswer(question, 'arkade-2-13-1-mets');
  const text = visibleText(answer);
  assert.match(text, /2\.13\.0/);
  assert.match(text, /2\.13\.1/);
  assert.match(text, /mets/);
  assert.match(text, /rett/);
  const [evidence] = modelEvidence(question, ['arkade-2-13-1-mets']);
  assert.match(evidenceText(evidence), /2\.13\.0/);
  assert.match(evidenceText(evidence), /2\.13\.1/);
  assert.equal(evidence.verifiedAt, '2026-09-26');
});

test('the Arkade source preserves the affected file-path condition and release provenance', () => {
  const question = 'En fil ligger utenfor dokumentfilkatalogen, men katalognavnet finnes i filstien. Hva var feilen i Arkade?';
  const answer = localAnswer(question, 'arkade-2-13-1-mets');
  const result = answer.results.find(({ record }) => record.id === 'arkade-2-13-1-mets');
  assert.equal(result.source.id, 'arkade-2-13-1');
  assert.equal(result.source.published, '23.09.2026');
  assert.equal(sourceUrl(result.record), 'https://github.com/nasjonalarkivet/arkade5/releases/tag/v2.13.1');
  const [evidence] = modelEvidence(question, ['arkade-2-13-1-mets']);
  const text = evidenceText(evidence);
  assert.match(text, /utenfor.{0,70}dokumentfilkatalog/);
  assert.match(text, /katalognavn|navnet pa.{0,30}katalog/);
  assert.match(text, /filsti/);
  assert.match(text, /mets/);
  assert.match(text, /beskriv/);
  assert.doesNotMatch(text, /filene (ble |blir )?(slettet|tapt)|filer gar tapt/);
  assert.doesNotMatch(normalize(evidence.sourceType), /^(lov|forskrift)$/);
});

test('a fixed-version follow-up retains the Arkade METS defect as model evidence', () => {
  const history = [{ role: 'user', content: 'Vi bruker Arkade 2.13.0 til Noark 5-pakker og har manglende filbeskrivelser i METS.' }];
  const [evidence] = modelEvidence('Er dette rettet i 2.13.1?', ['arkade-2-13-1-mets'], history);
  const text = evidenceText(evidence);
  assert.match(text, /2\.13\.0/);
  assert.match(text, /2\.13\.1/);
  assert.match(text, /mets/);
  assert.match(text, /rett/);
});

test('the new Arkade release does not hide the continuing PDF/A-validation limitation', () => {
  const question = 'Er PDF/A-validering aktivert i Arkade 2.13.1?';
  const answer = localAnswer(question, 'guide-arkade-pdfa');
  const text = visibleText(answer);
  assert.match(text, /pdfa.{0,90}deaktivert/);
  assert.match(text, /2\.12\.5/);
  const [evidence] = modelEvidence(question, ['guide-arkade-pdfa']);
  assert.match(evidenceText(evidence), /deaktivert/);
  assert.match(evidenceText(evidence), /2\.12\.5/);
});

test('the conceptual archive-structure answer cites appendix 2 and the correct PDF page', () => {
  const question = 'Hvordan er Noark sin overordnede arkivstruktur bygd opp?';
  const answer = localAnswer(question, 'n6-conceptual-structure');
  assert.match(visibleText(answer), /arkivdel/);
  assert.match(visibleText(answer), /dokumentobjekt/);
  const result = answer.results.find(({ record }) => record.id === 'n6-conceptual-structure');
  assert.match(normalize(result.record.section), /^tillegg 2\b/);
  assert.match(sourceUrl(result.record), /Noark-5-versjon-6\.pdf#page=53$/);
  const [evidence] = modelEvidence(question, ['n6-conceptual-structure']);
  assert.match(normalize(evidence.section), /^tillegg 2\b/);
  assert.equal(evidence.page, 53);
});
