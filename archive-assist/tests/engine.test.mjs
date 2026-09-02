import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyCommonDefaults, csvCell, deriveTitle, detectSensitiveData, duplicateHashes,
  extractDateFromName, inferDocumentType, inferLanguage, manifestCsv, metadataScore,
  proposeFilename, validateMetadata
} from '../engine.mjs';
import { createZip, safeZipPath } from '../zip.mjs';

test('henter ISO-dato fra vanlige filnavn', () => {
  assert.equal(extractDateFromName('2026-08-28_referat.pdf'), '2026-08-28');
  assert.equal(extractDateFromName('referat_28.08.2026.docx'), '2026-08-28');
  assert.equal(extractDateFromName('2026-02-31_feil.txt'), '');
});

test('lager lesbar tittel av filnavn', () => {
  assert.equal(deriveTitle('2026-08-28_motereferat_anskaffelse_v2_endelig.pdf'), 'Motereferat anskaffelse');
});

test('gjenkjenner dokumenttype fra navn og innhold', () => {
  assert.equal(inferDocumentType('rutine_dokumentfangst.docx', '', ''), 'Prosedyre eller rutine');
  assert.equal(inferDocumentType('slides.pptx', '', ''), 'Presentasjon');
});

test('skiller grovt mellom norsk og engelsk', () => {
  assert.equal(inferLanguage('Dette er et dokument som skal brukes til kontroll og videre arbeid.'), 'nb');
  assert.equal(inferLanguage('This is a document that will be used for review and further work.'), 'en');
});

test('fanger e-post og telefon som mulige personopplysninger', () => {
  const signals = detectSensitiveData('Kontakt kari@example.no eller 999 88 777.');
  assert.ok(signals.includes('E-postadresse'));
  assert.ok(signals.includes('Mulig telefonnummer'));
});

test('validering krever hjemmel ved unntatt offentlighet', () => {
  const findings = validateMetadata({ title: 'A', creator: 'B', organizationalUnit: 'C', documentDate: '2026-01-01', documentType: 'Notat', subject: 'Sak', accessLevel: 'Unntatt offentlighet', retentionDecision: 'Bevares', sha256: 'a'.repeat(64), keywords: ['sak'], description: 'Beskrivelse' });
  assert.ok(findings.some(item => item.field === 'accessBasis'));
});

test('felles metadata kan brukes uten å overskrive eksisterende verdi', () => {
  const result = applyCommonDefaults({ creator: 'Eksisterende', accessLevel: 'Ikke vurdert', originalFileName: 'a.pdf', documentDate: '2026-01-01' }, { creator: 'Ny', accessLevel: 'Intern' }, false);
  assert.equal(result.creator, 'Eksisterende');
  assert.equal(result.accessLevel, 'Intern');
});

test('poengsum øker når sentrale felt fylles', () => {
  const low = metadataScore({ title: 'Tittel' });
  const high = metadataScore({ title: 'Tittel', description: 'Beskrivelse', creator: 'Kari', organizationalUnit: 'Arkiv', documentDate: '2026-01-01', documentType: 'Notat', subject: 'Sak', keywords: ['arkiv'], classificationCode: '041', accessLevel: 'Åpen', retentionDecision: 'Bevares', sha256: 'a'.repeat(64) });
  assert.ok(high > low);
  assert.equal(high, 100);
});

test('foreslått filnavn er plattformvennlig', () => {
  assert.equal(proposeFilename({ title: 'Årsrapport – økonomi', documentDate: '2026-03-01' }, 'PDF'), '2026-03-01_arsrapport-okonomi.pdf');
});

test('CSV nøytraliserer formelstart og siterer tekst', () => {
  assert.equal(csvCell('=1+1'), '"\'=1+1"');
  assert.match(manifestCsv([{ metadata: { title: 'A, B' } }]), /"A, B"/);
});

test('duplikater grupperes etter SHA-256', () => {
  const groups = duplicateHashes([{ metadata: { sha256: 'a'.repeat(64) } }, { metadata: { sha256: 'a'.repeat(64) } }, { metadata: { sha256: 'b'.repeat(64) } }]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0][1].length, 2);
});

test('ZIP-bygger lager gyldige ZIP-signaturer og renser sti', async () => {
  assert.equal(safeZipPath('../metadata/a?.json'), 'metadata/a_.json');
  const blob = await createZip([{ name: 'test.txt', data: 'hei' }]);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  assert.deepEqual([...bytes.slice(0, 4)], [0x50, 0x4b, 0x03, 0x04]);
  assert.deepEqual([...bytes.slice(-22, -18)], [0x50, 0x4b, 0x05, 0x06]);
});
