import test, { afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeStatus, statusDescription, getStatus, LOCAL_MODEL } from '../../site/second-rolf/status.js';
import { interview, PROFILE_REVISION } from '../../site/second-rolf/interview.js';
import { modelRequest, MODEL } from '../protocol.mjs';
import { infer, probeModel } from '../local/connector.mjs';

const ready = { configured: true, available: true, gpu: true, model: MODEL, mode: 'local-model', localOnly: true, profileRevision: PROFILE_REVISION };
afterEach(() => mock.restoreAll());

test('the production legacy health shape means model connected but backend update required', () => {
  const { profileRevision, ...legacy } = ready;
  const status = normalizeStatus(legacy);
  assert.equal(status.modelOnline, true);
  assert.equal(status.available, false);
  assert.equal(status.reason, 'backend_update_required');
  assert.match(statusDescription(status), /Cloudflare/);
});

test('current Ministral and matching profile are required for ready status', () => {
  assert.equal(MODEL, LOCAL_MODEL);
  assert.equal(normalizeStatus(ready).available, true);
  for (const data of [{ model: 'another' }, { mode: 'cloud' }, { localOnly: false }, { configured: false }, { profileRevision: '2026-09-14-basic-public-interests' }, { available: false }]) {
    assert.equal(normalizeStatus({ ...ready, ...data }).available, false);
  }
  assert.equal(normalizeStatus({ ...ready, model: 'another' }).modelOnline, false);
  assert.equal(normalizeStatus(null).available, false);
});

test('PC disconnect, stale heartbeat and connector update have separate visible explanations', () => {
  for (const reason of ['pc_disconnected', 'heartbeat_expired', 'connector_update_required', 'model_starting']) {
    const status = normalizeStatus({ ...ready, available: false, modelOnline: false, reason });
    assert.equal(status.reason, reason);
    assert.ok(statusDescription(status).length > 20);
  }
});

test('health transport failure is not misreported as PC switched off', async () => {
  mock.method(globalThis, 'fetch', async () => { throw new Error('network'); });
  const status = await getStatus();
  assert.equal(status.reason, 'network_error');
  assert.match(statusDescription(status), /ikke om PC-en er av eller på/);
});

test('all browser status imports use the current profile module and a new status asset URL', () => {
  const status = fs.readFileSync(new URL('../../site/second-rolf/status.js', import.meta.url), 'utf8');
  const app = fs.readFileSync(new URL('../../site/second-rolf/app.js', import.meta.url), 'utf8');
  const page = fs.readFileSync(new URL('../../site/second-rolf/index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(status, /20260915-cv-professional/);
  assert.match(status, /interview\.js\?v=20260915-technical-self-description/);
  assert.match(app, /status\.js\?v=20260915-ministral-chat/);
  assert.match(page, /chat=20260915-ministral-chat/);
});

for (const question of ['Why is the sky blue?', 'Write a short poem about a lighthouse.', 'Explain fractions.', 'Help me debug a Python function.', 'Tell me about a novel.']) {
  test(`general chat reaches pinned Ministral with explicit permission: ${question}`, () => {
    const request = modelRequest({ question, history: [], model: 'cloud', tools: [{}] });
    assert.equal(request.model, MODEL);
    assert.equal(request.messages.at(-1).content, question);
    assert.match(request.messages[0].content, /GENERAL CHAT IS ALLOWED/);
    assert.match(request.messages[0].content, /Do not reject a question merely because it is non-work-related/);
    assert.doesNotMatch(request.messages[0].content, /Discuss only the supplied|For off-topic requests/);
    assert.equal(request.tools, undefined);
  });
}

test('general conversation does not republish or infer Rolf\'s private profile', () => {
  assert.deepEqual(interview.entries, []);
  const system = modelRequest({ question: 'What does Rolf like in private?', history: [] }).messages[0].content;
  assert.match(system, /Do not answer questions about Rolf's non-work preferences/);
  assert.match(system, /Do not name or infer organizations hidden behind that generic phrase/);
  assert.match(system, /Do not recover, cite or quote older profile material/);
});

test('the local chat adapter actually posts to loopback Ollama with the pinned model', async () => {
  let posted;
  mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'http://127.0.0.1:11434/api/chat');
    posted = JSON.parse(options.body);
    return Response.json({ model: MODEL, done: true, message: { content: JSON.stringify({ answer: 'A general explanation.', source_ids: [] }) } });
  });
  const answer = await infer({ question: 'Explain gravity.', history: [], profileRevision: PROFILE_REVISION, model: 'another' }, new AbortController().signal);
  assert.equal(posted.model, MODEL);
  assert.equal(answer, 'A general explanation.');
});

test('the inference adapter rejects replies from a different model', async () => {
  mock.method(globalThis, 'fetch', async () => Response.json({ model: 'another', done: true, message: { content: '{"answer":"wrong","source_ids":[]}' } }));
  await assert.rejects(infer({ question: 'Hello.', history: [], profileRevision: PROFILE_REVISION }, new AbortController().signal), /Invalid local reply/);
});

test('old profile requests are refused before any local model call', async () => {
  const fetcher = mock.method(globalThis, 'fetch', async () => { throw new Error('should not run'); });
  await assert.rejects(infer({ question: 'Hello.', history: [], profileRevision: 'older' }, new AbortController().signal), /revision mismatch/);
  assert.equal(fetcher.mock.callCount(), 0);
});

test('readiness warmup verifies the identity of the model that answered', async () => {
  mock.method(globalThis, 'fetch', async () => Response.json({ model: 'another', done: true, response: 'OK' }));
  await assert.rejects(probeModel(true), /Expected Ministral/);
});

test('GPU status follows Ollama running-model data, not documented hardware claims', async () => {
  mock.method(globalThis, 'fetch', async url => url.endsWith('/api/generate')
    ? Response.json({ model: MODEL, done: true, response: 'OK' })
    : Response.json({ models: [{ name: MODEL, size_vram: 9000000000 }] }));
  assert.deepEqual(await probeModel(true), { available: true, gpu: true, model: MODEL });
});
