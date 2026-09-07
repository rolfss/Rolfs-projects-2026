import test from 'node:test';
import assert from 'node:assert/strict';
import { REVIEW_POLICY, LOG_LIMITS, makeReviewEntry, redactQuestion, QuestionLog, recordQuestion, reviewEndpoint } from '../question-log.mjs';
import { buildReviewReport } from '../review-questions.mjs';
import worker, { LunaGate, LIMITS } from '../worker.mjs';

class Storage {
  constructor() { this.data = new Map(); this.alarmAt = null; this.queue = Promise.resolve(); }
  async get(k) { return structuredClone(this.data.get(k)); }
  async put(k, v) { this.data.set(k, structuredClone(v)); }
  async delete(keys) { for (const k of Array.isArray(keys) ? keys : [keys]) this.data.delete(k); }
  async deleteAll() { this.data.clear(); this.alarmAt = null; }
  async getAlarm() { return this.alarmAt; }
  async setAlarm(n) { this.alarmAt = n; }
  async deleteAlarm() { this.alarmAt = null; }
  async list(o = {}) { return new Map([...this.data.entries()].filter(([k]) => (!o.prefix || k.startsWith(o.prefix)) && (!o.end || k < o.end) && (!o.startAfter || k > o.startAfter)).sort(([a], [b]) => a.localeCompare(b)).slice(0, o.limit ?? Infinity).map(([k, v]) => [k, structuredClone(v)])); }
  transaction(fn) {
    const result = this.queue.then(async () => {
      const tx = new Storage(); tx.data = structuredClone(this.data); tx.alarmAt = this.alarmAt;
      const value = await fn(tx); this.data = tx.data; this.alarmAt = tx.alarmAt; return value;
    });
    this.queue = result.catch(() => {}); return result;
  }
}
const info = { question: 'Er DOCX akseptert ved avlevering?', outcome: 'answered', candidates: [{ record: { id: 'format-docx' }, relevance: 90 }] };
const key = 'a'.repeat(40);
function setup() {
  const storage = new Storage(); const log = new QuestionLog({ storage });
  const env = { QUESTION_LOG_ENABLED: 'true', QUESTION_REVIEW_KEY: key,
    QUESTION_LOG: { idFromName: (n) => n, get: () => ({ fetch: (r) => log.fetch(r) }) } };
  return { storage, log, env };
}

test('without consent only minimal diagnostic fields are persisted', () => {
  const entry = makeReviewEntry({ ...info, ip: '203.0.113.5', history: ['private'], answer: 'private', OPENAI_API_KEY: 'secret' });
  assert.equal(entry.questionText, null); assert.equal(entry.textConsent, false);
  assert.equal(entry.hits[0].recordId, 'format-docx');
  assert.doesNotMatch(JSON.stringify(entry), /203\.0\.113|OPENAI_API_KEY|history|private|Er DOCX/);
});
test('explicit current consent records bounded best-effort redacted text', () => {
  const entry = makeReviewEntry({ ...info, qualityConsent: REVIEW_POLICY, question: 'Kontakt Ola Nordmann på ola@example.no, telefon 98765432 om DOCX.' });
  assert.doesNotMatch(entry.questionText, /Ola Nordmann|ola@example|98765432/);
  assert.match(entry.questionText, /DOCX/); assert.ok(entry.questionText.length <= 350);
  assert.equal(makeReviewEntry({ ...info, qualityConsent: 'old-policy' }).questionText, null);
});
test('sensitive patterns and credentials suppress the complete question text', () => {
  for (const q of ['Pasientjournal for person X', 'fødselsnummer 01019012345', 'sk-proj-abcdefghijklmno', 'api key: abc123secret'])
    assert.equal(redactQuestion(q).text, null);
});
test('unknown fields and invented source IDs never enter the record', () => {
  const entry = makeReviewEntry({ ...info, qualityConsent: REVIEW_POLICY, queryParameters: 'secret', results: [{ record: { id: 'made-up' }, relevance: 999 }] });
  assert.deepEqual(entry.hits, []); assert.equal(entry.weakMatch, true); assert.equal(entry.queryParameters, undefined);
});
test('entries persist with an expiry alarm and are deleted without another user question', async (t) => {
  const { env, storage, log } = setup(); const now = Date.parse('2026-09-07T12:00:00Z');
  t.mock.method(Date, 'now', () => now);
  assert.equal(await recordQuestion(env, { ...info, qualityConsent: REVIEW_POLICY }), true);
  assert.equal((await storage.list({ prefix: 'q:' })).size, 1); assert.equal(storage.alarmAt, now + 30 * 86400000);
  t.mock.method(Date, 'now', () => now + 30 * 86400000 + 1);
  await log.alarm(); assert.equal((await storage.list({ prefix: 'q:' })).size, 0);
  assert.equal(storage.alarmAt, null);
});
test('owner export requires a strong bearer credential and never enables browser CORS', async () => {
  const { env } = setup(); await recordQuestion(env, info);
  for (const headers of [{}, { Authorization: 'Bearer wrong' }])
    assert.equal((await reviewEndpoint(new Request('https://worker/api/admin/questions', { headers }), env)).status, 401);
  const response = await reviewEndpoint(new Request('https://worker/api/admin/questions', { headers: { Authorization: `Bearer ${key}`, Origin: 'https://evil.example' } }), env);
  assert.equal(response.status, 200); assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  assert.doesNotMatch(await response.text(), new RegExp(key));
});
test('query-string credentials are not accepted', async () => {
  const { env } = setup();
  assert.equal((await reviewEndpoint(new Request(`https://worker/api/admin/questions?key=${key}`), env)).status, 401);
});
test('storage cap and logging disable switch are enforced', async () => {
  const { env, storage } = setup();
  assert.equal(await recordQuestion({ ...env, QUESTION_LOG_ENABLED: 'false' }, info), false);
  assert.equal((await storage.list({ prefix: 'q:' })).size, 0);
  await storage.put('entry-count', LOG_LIMITS.maxEntries);
  assert.equal(await recordQuestion(env, info), false);
});
test('deleting the log never deletes the independent budget ledger', async () => {
  const { env, storage } = setup(); const budgetStorage = new Storage();
  const gate = new LunaGate({ storage: budgetStorage }, {});
  await gate.reserve('existing-spend', 'ip', 100000);
  await recordQuestion(env, info);
  const result = await reviewEndpoint(new Request('https://worker/api/admin/questions', { method: 'DELETE', headers: { Authorization: `Bearer ${key}` } }), env);
  assert.equal(result.status, 200); assert.equal(storage.data.size, 0);
  assert.equal((await budgetStorage.get('ledger')).trial, 100000);
});
test('review report prioritises failures but never treats questions as approved facts', () => {
  const report = buildReviewReport([{ questionText: 'DOCX?', outcome: 'answered', hits: [] },
    { questionText: 'Mangler kilde?', outcome: 'no_sources', weakMatch: true, hits: [] },
    { questionText: null, outcome: 'provider_error', hits: [] }]);
  assert.equal(report.total, 3); assert.equal(report.withText, 2);
  assert.equal(report.priorities[0].question, 'Mangler kilde?'); assert.match(report.warning, /Human source verification/);
});
test('health reports only safe logging capability metadata and unchanged budgets', async () => {
  const { env } = setup();
  const response = await worker.fetch(new Request('https://worker/api/health'), { ...env, OPENAI_API_KEY: 'private-openai', TURNSTILE_SECRET_KEY: 'private-bot' });
  const body = await response.json();
  assert.deepEqual([body.dailyBudgetUsd, body.monthlyBudgetUsd, body.trialBudgetUsd], [2, 6, 6]);
  assert.equal(body.questionLogging.enabled, true); assert.equal(body.questionLogging.text, 'opt-in');
  assert.doesNotMatch(JSON.stringify(body), /private-openai|private-bot|aaaaaaaa/);
});
test('new diagnostic requests cannot cross the existing daily budget', async () => {
  const storage = new Storage(); const gate = new LunaGate({ storage }, {});
  const outcomes = await Promise.all(Array.from({ length: 12 }, (_, i) => gate.reserve(`r${i}`, `ip${i}`, 900000)));
  assert.equal(outcomes.filter((r) => r.ok).length, 2); assert.equal(LIMITS.dailyMicroUsd, 2000000);
});
test('authenticated no-source questions are logged without paid inference; bots are not logged', async (t) => {
  const { env, storage } = setup(); const budgetStorage = new Storage();
  const gate = new LunaGate({ storage: budgetStorage }, { ...env, TURNSTILE_SECRET_KEY: 'test' });
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return Response.json({ success: true, action: 'noark-chat', hostname: 'rolfss.github.io' }); });
  const body = { question: 'Hvor mange elefanter bor på månen?', history: [], ip: 'test', origin: 'https://rolfss.github.io', turnstileToken: 'test', requestId: 'no-source', qualityConsent: REVIEW_POLICY };
  const response = await gate.fetch(new Request('https://internal/chat', { method: 'POST', body: JSON.stringify(body) }));
  assert.equal(response.status, 200); assert.equal(calls, 1);
  assert.equal((await budgetStorage.get('ledger')).trial, 0);
  const entries = [...(await storage.list({ prefix: 'q:' })).values()];
  assert.equal(entries.length, 1); assert.equal(entries[0].outcome, 'no_sources');
  t.mock.method(globalThis, 'fetch', async () => Response.json({ success: false }));
  await gate.fetch(new Request('https://internal/chat', { method: 'POST', body: JSON.stringify({ ...body, requestId: 'bot' }) }));
  assert.equal((await storage.list({ prefix: 'q:' })).size, 1);
});
