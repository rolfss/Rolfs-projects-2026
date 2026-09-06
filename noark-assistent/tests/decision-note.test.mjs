import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDecisionNote } from '../decision-note.mjs';

test('beslutningsnotat inneholder spørsmål, dekning, kilder og forbehold', () => {
  const note = buildDecisionNote({
    query: 'Må fagsystemet integreres med en Noark-kjerne?',
    lead: 'Nei, ikke nødvendigvis.',
    confidence: { label: 'Høy kildedekning', score: 94 },
    points: [{ text: 'Arkivkravene kan oppfylles på flere måter.', citation: 1 }],
    guidance: 'Kontroller løsningsvalget mot originalkilden.',
    results: [{
      rank: 1,
      source: { title: 'Noark 5 versjon 6.0' },
      record: { section: '5.2', page: 42, requirement: '5.2.1' },
      url: 'https://example.test/noark.pdf#page=42',
    }],
  }, { generatedAt: new Date('2026-09-06T08:00:00Z') });

  assert.match(note, /Må fagsystemet/);
  assert.match(note, /Høy kildedekning \(94\/100\)/);
  assert.match(note, /Noark 5 versjon 6\.0/);
  assert.match(note, /krav 5\.2\.1/);
  assert.match(note, /originalkildene/);
});

test('tomt spørsmål gir tomt notat', () => {
  assert.equal(buildDecisionNote({ query: '   ' }), '');
});
