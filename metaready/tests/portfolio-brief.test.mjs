import test from 'node:test';
import assert from 'node:assert/strict';
import { assets, initialBacklog, relationships } from '../data.mjs';
import { buildPortfolioBrief, portfolioSnapshot } from '../portfolio-brief.mjs';

test('porteføljebildet summerer ressurser, relasjoner og tiltak', () => {
  const state = { assets: structuredClone(assets), backlog: structuredClone(initialBacklog) };
  const snapshot = portfolioSnapshot(state, relationships);
  assert.equal(snapshot.assets, assets.length);
  assert.equal(snapshot.relationships, relationships.length);
  assert.ok(snapshot.statuses.length > 0);
  assert.ok(Array.isArray(snapshot.prioritizedBacklog));
});

test('ledelsesbriefen inneholder styringsrekkefølge og prioriterte tiltak', () => {
  const state = { assets: structuredClone(assets), backlog: structuredClone(initialBacklog) };
  const brief = buildPortfolioBrief(state, relationships, { generatedAt: new Date('2026-09-06T08:00:00Z') });
  assert.match(brief, /ledelsesbrief/i);
  assert.match(brief, /Informasjonsressurser:/);
  assert.match(brief, /Prioriterte tiltak/);
  assert.match(brief, /Anbefalt styringsrekkefølge/);
  assert.match(brief, /AI-bruk/);
});
