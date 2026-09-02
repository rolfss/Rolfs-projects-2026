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

test('the seeded catalog has at least 20 connected assets', () => {
  assert.ok(assets.length >= 20);
  assert.ok(relationships.length >= 15);
});

test('weak legacy collection produces transparent required findings', () => {
  const asset = assets.find((item) => item.id === 'CW-DOC-002');
  const findings = validateAsset(asset, assets, relationships);
  assert.ok(findings.some((finding) => finding.id === 'META-001'));
  assert.ok(findings.some((finding) => finding.id === 'META-010'));
  assert.ok(findings.every((finding) => finding.evidence && finding.fix && finding.why));
});

test('suggested remediation improves the targeted rule and versions the asset', () => {
  const asset = assets.find((item) => item.id === 'CW-DOC-002');
  const before = validateAsset(asset, assets, relationships);
  const improved = applySuggestedRemediation(asset, 'META-001');
  const after = validateAsset(improved, assets, relationships);
  assert.ok(before.some((finding) => finding.id === 'META-001'));
  assert.ok(!after.some((finding) => finding.id === 'META-001'));
  assert.notEqual(improved.version, asset.version);
});

test('AI readiness is use-case specific and exposes evidence', () => {
  const asset = assets.find((item) => item.id === 'CW-DOC-002');
  const assessment = assessReadiness(asset, 'rag_assistant');
  assert.equal(assessment.useCase.id, 'rag_assistant');
  assert.equal(assessment.status, 'Not ready');
  assert.ok(assessment.dimensions.length >= 13);
  assert.ok(assessment.dimensions.every((dimension) => dimension.evidence && dimension.action));
});

test('quality remains multidimensional rather than a single opaque score', () => {
  const asset = assets[0];
  const findings = validateAsset(asset, assets, relationships);
  const quality = calculateQuality(asset, findings);
  assert.ok(quality.length >= 9);
  assert.ok(quality.every((dimension) => Number.isFinite(dimension.score) && dimension.evidence));
});

test('priority formula rewards impact and penalizes effort', () => {
  const high = priorityScore({ impact: 5, urgency: 5, riskReduction: 5, effort: 1 });
  const costly = priorityScore({ impact: 5, urgency: 5, riskReduction: 5, effort: 5 });
  assert.ok(high > costly);
});

test('portfolio metrics reconcile to catalog size', () => {
  const metrics = portfolioMetrics(assets, relationships);
  assert.equal(metrics.assets, assets.length);
  assert.equal(metrics.ready + metrics.readyWithControls + metrics.notReady, assets.length);
});

test('governance brief includes limitations and the selected use case', () => {
  const asset = assets[0];
  const findings = validateAsset(asset, assets, relationships);
  const quality = calculateQuality(asset, findings);
  const assessment = assessReadiness(asset, 'analytical_reporting');
  const brief = createGovernanceBrief(asset, findings, quality, assessment);
  assert.match(brief, /Assumptions and limitations/);
  assert.match(brief, /Analytical reporting/);
  assert.match(brief, /not legal approval/i);
});
