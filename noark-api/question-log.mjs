import { BUILD_INFO, RECORDS } from '../noark-assistent/data.mjs';

export const REVIEW_POLICY = '2026-09-review-v1';
export const LOG_LIMITS = Object.freeze({ retentionDays: 30, maxEntries: 5000, pageSize: 100, textLength: 350 });
const TTL = LOG_LIMITS.retentionDays * 86400000;
const knownRecords = new Set(RECORDS.map((r) => r.id));
const outcomes = new Set(['accepted', 'answered', 'insufficient', 'no_sources', 'provider_error', 'incomplete', 'validation_or_network_error']);
const pad = (n) => String(n).padStart(13, '0');
const reply = (value, status = 200) => Response.json(value, { status, headers: {
  'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
} });

export function loggingEnabled(env) {
  return env.QUESTION_LOG_ENABLED === 'true' && Boolean(env.QUESTION_LOG);
}

// Best-effort minimisation, NOT guaranteed anonymisation. Explicit consent is still required for text.
export function redactQuestion(question) {
  const text = String(question ?? '').normalize('NFKC').replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
  if (/\b(?:sk-[\w-]{12,}|bearer\s+\S+|eyJ[\w-]+\.[\w-]+\.[\w-]+)|(?:passord|password|secret[_ -]?key|api[_ -]?(?:key|nøkkel))\s*[:=]/iu.test(text) ||
      /\b(?:pasient(?:en|journal)?|diagnose|personnummer|fødselsnummer|taushetsbelagt|d-nummer)\b/iu.test(text)) {
    return { text: null, redaction: 'text-withheld-sensitive-pattern' };
  }
  let safe = text
    .replace(/https?:\/\/[^\s]+|www\.[^\s]+/giu, '[lenke fjernet]')
    .replace(/[\w.+-]+@[\w.-]+\.[\p{L}]{2,}/giu, '[e-post fjernet]')
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[IP fjernet]')
    .replace(/\b\d{4}\/\d{3,}\b/g, '[saksnummer fjernet]')
    .replace(/(?:\+\d{1,3}[\s.-]?)?(?<!\d)(?:\d[\s.-]?){7,}\d(?!\d)/g, '[nummer fjernet]')
    .replace(/\b(?:navn|name|adresse|address)\s*[:=][^,;!?\n]+/giu, '[personfelt fjernet]')
    .replace(/\b[\p{Lu}][\p{Ll}]{1,}(?:\s+[\p{Lu}][\p{Ll}]{1,}){1,3}\b/gu, '[mulig navn fjernet]');
  const changed = safe !== text;
  safe = safe.slice(0, LOG_LIMITS.textLength);
  return { text: safe || null, redaction: changed ? 'patterns-redacted' : 'no-pattern-detected' };
}

export function makeReviewEntry(info, now = Date.now()) {
  const consented = info.qualityConsent === REVIEW_POLICY;
  const redacted = consented ? redactQuestion(info.question) : { text: null, redaction: 'no-text-consent' };
  const hits = (info.results ?? info.candidates ?? []).slice(0, 8)
    .filter((r) => knownRecords.has(r.record?.id))
    .map((r) => ({ recordId: r.record.id, relevance: Math.max(0, Math.min(100, Math.round(Number(r.relevance) || 0))) }));
  return {
    schemaVersion: 1, policy: REVIEW_POLICY, day: new Date(now).toISOString().slice(0, 10),
    questionText: redacted.text, textConsent: consented, redaction: redacted.redaction,
    corpusVersion: BUILD_INFO.corpusVersion, outcome: outcomes.has(info.outcome) ? info.outcome : 'validation_or_network_error',
    hits, weakMatch: (hits[0]?.relevance ?? 0) < 60,
    // Deliberately no conversation history, answer text, request ID, IP, user agent, URL or credentials.
  };
}

export async function recordQuestion(env, info) {
  if (!loggingEnabled(env) || !info) return false;
  try {
    const entry = makeReviewEntry(info);
    const stub = env.QUESTION_LOG.get(env.QUESTION_LOG.idFromName('noark-question-review-v1'));
    const response = await stub.fetch(new Request('https://internal/append', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry),
      signal: AbortSignal.timeout(3000),
    }));
    return response.ok;
  } catch { return false; } // A logging outage must never retry a paid inference or expose its input.
}

export async function validReviewKey(request, env) {
  const expected = env.QUESTION_REVIEW_KEY;
  const supplied = request.headers.get('Authorization') ?? '';
  if (typeof expected !== 'string' || expected.length < 32 || expected.length > 256 || !supplied.startsWith('Bearer ') || supplied.length > 263) return false;
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([expected, supplied.slice(7)].map(async (s) =>
    new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s)))));
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}

export async function reviewEndpoint(request, env) {
  if (!env.QUESTION_LOG || !(await validReviewKey(request, env))) return reply({ error: 'not_authorized' }, 401);
  if (!['GET', 'DELETE'].includes(request.method)) return reply({ error: 'method' }, 405);
  const cursor = new URL(request.url).searchParams.get('cursor') ?? '';
  if (cursor && !/^q:\d{13}:[0-9a-f-]{36}$/i.test(cursor)) return reply({ error: 'cursor' }, 400);
  const stub = env.QUESTION_LOG.get(env.QUESTION_LOG.idFromName('noark-question-review-v1'));
  // Never forward the owner's bearer token to a log, URL, browser or Durable Object.
  return stub.fetch(new Request(`https://internal/${request.method === 'DELETE' ? 'purge' : 'list'}?cursor=${encodeURIComponent(cursor)}`,
    { method: request.method }));
}

export class QuestionLog {
  constructor(ctx) { this.storage = ctx.storage; }

  async prune(now = Date.now()) {
    return this.storage.transaction(async (tx) => {
      const expired = await tx.list({ prefix: 'q:', end: `q:${pad(now - TTL)}:\uffff`, limit: 1000 });
      if (expired.size) {
        await tx.delete([...expired.keys()]);
        await tx.put('entry-count', Math.max(0, (await tx.get('entry-count') ?? 0) - expired.size));
      }
      const first = await tx.list({ prefix: 'q:', limit: 1 });
      if (first.size) {
        const time = Number([...first.keys()][0].split(':')[1]);
        await tx.setAlarm(Math.max(now + 1000, time + TTL));
      } else await tx.deleteAlarm();
      return expired.size;
    });
  }

  async alarm() { await this.prune(); }

  async fetch(request) {
    const path = new URL(request.url).pathname;
    const now = Date.now();
    if (path === '/purge' && request.method === 'DELETE') {
      // Separate namespace: this NEVER clears or resets the spending ledger.
      await this.storage.deleteAll();
      return reply({ deleted: true });
    }
    if (path === '/list' && request.method === 'GET') {
      await this.prune(now);
      const cursor = new URL(request.url).searchParams.get('cursor') ?? '';
      const startAfter = cursor > `q:${pad(now - TTL)}:\uffff` ? cursor : `q:${pad(now - TTL)}:\uffff`;
      const rows = await this.storage.list({ prefix: 'q:', startAfter, limit: LOG_LIMITS.pageSize });
      return reply({ policy: REVIEW_POLICY, retentionDays: LOG_LIMITS.retentionDays,
        records: [...rows.values()].filter((r) => r.expiresAt > now),
        nextCursor: rows.size === LOG_LIMITS.pageSize ? [...rows.keys()].at(-1) : null });
    }
    if (path !== '/append' || request.method !== 'POST') return reply({ error: 'not_found' }, 404);
    let entry;
    try {
      const raw = await request.text();
      if (new TextEncoder().encode(raw).length > 12000) throw new Error();
      const body = JSON.parse(raw);
      if (body.policy !== REVIEW_POLICY || !outcomes.has(body.outcome) || !Array.isArray(body.hits) || body.hits.length > 8 ||
          (body.questionText !== null && (body.textConsent !== true || typeof body.questionText !== 'string' || body.questionText.length > LOG_LIMITS.textLength))) throw new Error();
      // Whitelist all persisted fields even on this private, internal-only interface.
      entry = makeReviewEntry({ qualityConsent: body.textConsent ? REVIEW_POLICY : '', question: body.questionText ?? '',
        outcome: body.outcome, results: body.hits.map((r) => ({ record: { id: r.recordId }, relevance: r.relevance })) }, now);
      entry.questionText = body.questionText === null ? null : entry.questionText;
      entry.redaction = ['no-text-consent', 'text-withheld-sensitive-pattern', 'patterns-redacted', 'no-pattern-detected'].includes(body.redaction) ? body.redaction : entry.redaction;
      entry.expiresAt = now + TTL;
    } catch { return reply({ error: 'invalid_entry' }, 400); }
    await this.prune(now);
    const saved = await this.storage.transaction(async (tx) => {
      const count = await tx.get('entry-count') ?? 0;
      if (count >= LOG_LIMITS.maxEntries) return false;
      await tx.put(`q:${pad(now)}:${crypto.randomUUID()}`, entry);
      await tx.put('entry-count', count + 1);
      if (!(await tx.getAlarm())) await tx.setAlarm(now + TTL);
      return true;
    });
    return reply({ saved }, saved ? 201 : 429);
  }
}
