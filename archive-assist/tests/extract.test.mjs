import test from 'node:test';
import assert from 'node:assert/strict';
import { emailToText, extractOfficeText, extractPdfText, extractTextFromBytes, listZipEntries, markupToText, readZipEntry } from '../extract.mjs';
import { createZip } from '../zip.mjs';

test('HTML gjøres om til lesbart innhold', () => {
  assert.match(markupToText('<h1>Rapport om arkiv</h1><p>Dette er innholdet.</p>'), /Rapport om arkiv[\s\S]*Dette er innholdet/);
});

test('EML gir emne og lesbar meldingstekst', () => {
  const text = emailToText('From: Kari <kari@example.no>\r\nSubject: Svar på henvendelse\r\nContent-Type: text/plain; charset=utf-8\r\n\r\nVi viser til saken.');
  assert.match(text, /Emne: Svar på henvendelse/);
  assert.match(text, /Vi viser til saken/);
});

test('ZIP-leseren henter XML fra en Office-lignende pakke', async () => {
  const zip = await createZip([
    { name: 'docProps/core.xml', data: '<cp:coreProperties><dc:title>Prosedyre for journalføring</dc:title><dc:creator>Kari Nordmann</dc:creator></cp:coreProperties>' },
    { name: 'word/document.xml', data: '<w:document><w:body><w:p><w:r><w:t>Kontroller dokumenttittel før registrering.</w:t></w:r></w:p></w:body></w:document>' }
  ]);
  const bytes = new Uint8Array(await zip.arrayBuffer());
  const entries = listZipEntries(bytes);
  assert.equal(entries.length, 2);
  assert.match(new TextDecoder().decode(await readZipEntry(bytes, entries[1])), /Kontroller dokumenttittel/);
  const extracted = await extractOfficeText(bytes, 'docx');
  assert.match(extracted.text, /Tittel: Prosedyre for journalføring/);
  assert.match(extracted.text, /Kontroller dokumenttittel før registrering/);
});

test('grunnleggende PDF-leser finner tekstoperatorer', async () => {
  const source = '%PDF-1.4\n1 0 obj << /Length 55 >> stream\nBT /F1 12 Tf 72 720 Td (Vedtak om nytt arkivdepot) Tj ET\nendstream\nendobj\n%%EOF';
  const extracted = await extractPdfText(new TextEncoder().encode(source));
  assert.match(extracted.text, /Vedtak om nytt arkivdepot/);
});

test('tekstformat leses direkte fra byteinnhold', async () => {
  const extracted = await extractTextFromBytes(new TextEncoder().encode('# Rapport om dokumentfangst'), 'rapport.md', 'text/markdown');
  assert.equal(extracted.extractionMethod, 'Direkte lokal tekstlesing');
  assert.match(extracted.text, /Rapport om dokumentfangst/);
});
