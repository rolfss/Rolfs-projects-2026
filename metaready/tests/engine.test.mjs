import test from 'node:test';
import assert from 'node:assert/strict';
import { assets, relationships } from '../data.mjs';
import {
  applySuggestedRemediation,
  assessReadiness,
  calculateQuality,
  createGovernanceBrief,
  portfolioMetrics,
  priorityScore,
  validateAsset
} from '../engine.mjs';

test('den syntetiske katalogen har minst 20 sammenkoblede ressurser', () => {
  assert.ok(assets.length >= 20);
  assert.ok(relationships.length >= 15);
});

test('det svake prosedyrearkivet gir tydelige kravfunn', () => {
  const asset = assets.find((item) => item.id === 'CW-DOC-002');
  const findings = validateAsset(asset, assets, relationships);
  assert.ok(findings.some((finding) => finding.id === 'META-001'));
  assert.ok(findings.some((finding) => finding.id === 'META-010'));
  assert.ok(findings.every((finding) => finding.evidence && finding.fix && finding.why));
});

test('foreslått utbedring retter riktig regel og øker versjonen', () => {
  const asset = assets.find((item) => item.id === 'CW-DOC-002');
  const before = validateAsset(asset, assets, relationships);
  const improved = applySuggestedRemediation(asset, 'META-001');
  const after = validateAsset(improved, assets, relationships);
  assert.ok(before.some((finding) => finding.id === 'META-001'));
  assert.ok(!after.some((finding) => finding.id === 'META-001'));
  assert.notEqual(improved.version, asset.version);
});

test('AI-beredskap avhenger av bruksområdet og viser bevis', () => {
  const asset = assets.find((item) => item.id === 'CW-DOC-002');
  const assessment = assessReadiness(asset, 'rag_assistant');
  assert.equal(assessment.useCase.id, 'rag_assistant');
  assert.equal(assessment.status, 'Not ready');
  assert.ok(assessment.dimensions.length >= 13);
  assert.ok(assessment.dimensions.every((dimension) => dimension.evidence && dimension.action));
});

test('kvalitet består av flere dimensjoner, ikke bare én totalscore', () => {
  const asset = assets[0];
  const findings = validateAsset(asset, assets, relationships);
  const quality = calculateQuality(asset, findings);
  assert.ok(quality.length >= 9);
  assert.ok(quality.every((dimension) => Number.isFinite(dimension.score) && dimension.evidence));
});

test('prioriteringsformelen belønner effekt og trekker for innsats', () => {
  const high = priorityScore({ impact: 5, urgency: 5, riskReduction: 5, effort: 1 });
  const costly = priorityScore({ impact: 5, urgency: 5, riskReduction: 5, effort: 5 });
  assert.ok(high > costly);
});

test('porteføljemåltall summerer til størrelsen på katalogen', () => {
  const metrics = portfolioMetrics(assets, relationships);
  assert.equal(metrics.assets, assets.length);
  assert.equal(metrics.ready + metrics.readyWithControls + metrics.notReady, assets.length);
});

test('styringsnotatet inneholder avgrensninger og valgt bruksområde', () => {
  const asset = assets[0];
  const findings = validateAsset(asset, assets, relationships);
  const quality = calculateQuality(asset, findings);
  const assessment = assessReadiness(asset, 'analytical_reporting');
  const brief = createGovernanceBrief(asset, findings, quality, assessment);
  assert.match(brief, /Forutsetninger og avgrensninger/);
  assert.match(brief, /Analyse og rapportering/);
  assert.match(brief, /ikke juridisk godkjenning/i);
});
