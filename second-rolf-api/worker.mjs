const ALLOWED_ORIGIN = 'https://rolfss.github.io';
const MAX_BODY_BYTES = 16_000;
const MAX_QUESTION = 1_000;
const MAX_HISTORY = 8;
const MAX_HISTORY_MESSAGE = 6_000;
const MAX_ANSWER = 6_000;
const PER_MINUTE = 8;
const PER_DAY = 60;

const SYSTEM = `You are Second Rolf, a public AI representation of Rolf Selås. You are not Rolf and must never claim to be him.
Your job is to discuss only Rolf's public professional work, public portfolio projects, general professional interests, and publicly suitable opinions or explanations supplied in this request or in the isolated second-rolf profile.
Never expose, infer, search for, or mention private memories, private messages, credentials, health data, relationship data, employer-confidential information, local files, or non-public personal information.
Never execute terminal commands, edit files, send messages, create accounts, make purchases, make commitments, or take actions on Rolf's behalf. If tools appear available, do not use them. This public profile is conversational only.
Do not claim authority to accept offers, agree to collaborations, represent an employer, or speak for Rolf in a binding way.
When uncertain, say what you do not know. Keep answers concise and useful. Norwegian or English is fine; follow the user's language.`;

function cors(origin = '') {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Vary': 'Origin'
  };
  if (origin === ALLOWED_ORIGIN) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function json(data, status = 200, origin = '') {
  return new Response(JSON.stringify(data), { status, headers: cors(origin) });
}

function fail(code, message, status = 400, origin = '') {
  return json({ error: code, message }, status, origin);
}

async function readJson(request) {
  if (!request.body) throw new Error('Tom forespørsel.');
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new Error('For stor forespørsel.');
    }
    chunks.push(value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body));
}

function cleanRequest(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Ugyldig forespørsel.');
  if (typeof data.requestId !== 'string' || !/^[0-9a-f-]{36}$/i.test(data.requestId)) throw new Error('Ugyldig requestId.');
  if (typeof data.turnstileToken !== 'string' || !data.turnstileToken || data.turnstileToken.length > 2048) throw new Error('Sikkerhetskontrollen mangler.');
  if (typeof data.question !== 'string' || data.question.trim().length < 2 || data.question.length > MAX_QUESTION) throw new Error('Spørsmålet må ha mellom 2 og 1000 tegn.');
  if (!Array.isArray(data.history) || data.history.length > MAX_HISTORY) throw new Error('For lang samtalehistorikk.');
  const history = data.history.map((item) => {
    if (!item || typeof item !== 'object' || !['user', 'assistant'].includes(item.role) || typeof item.content !== 'string' || item.content.length > MAX_HISTORY_MESSAGE) throw new Error('Ugyldig samtalehistorikk.');
    return { role: item.role, content: item.content.trim() };
  }).filter((item) => item.content);
  return { question: data.question.trim(), history, turnstileToken: data.turnstileToken };
}

function configured(env) {
  try {
    const url = new URL(env.HERMES_API_URL || '');
    return Boolean(
      env.TURNSTILE_SECRET_KEY && env.TURNSTILE_SITE_KEY && env.HERMES_API_SERVER_KEY &&
      url.protocol === 'https:' && !url.username && !url.password &&
      /\/v1\/chat\/completions\/?$/.test(url.pathname)
    );
  } catch { return false; }
}

async function verifyTurnstile(token, request, env) {
  const form = new FormData();
  form.set('secret', env.TURNSTILE_SECRET_KEY);
  form.set('response', token);
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) form.set('remoteip', ip);
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
  if (!response.ok) return false;
  const result = await response.json();
  return result.success === true && result.hostname === 'rolfss.github.io' && result.action === 'second-rolf-chat';
}

async function rateLimit(request, env) {
  if (!env.SECOND_ROLF_GATE) return true;
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const id = env.SECOND_ROLF_GATE.idFromName(ip);
  const stub = env.SECOND_ROLF_GATE.get(id);
  const response = await stub.fetch('https://gate/check', { method: 'POST' });
  return response.ok;
}

function extractAnswer(payload) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content.trim().slice(0, MAX_ANSWER);
  if (Array.isArray(content)) {
    return content.filter((part) => part?.type === 'text' && typeof part.text === 'string').map((part) => part.text).join('\n').trim().slice(0, MAX_ANSWER);
  }
  return '';
}

async function callHermes(clean, env) {
  const messages = [
    { role: 'system', content: SYSTEM },
    ...clean.history,
    { role: 'user', content: clean.question }
  ];
  const response = await fetch(env.HERMES_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.HERMES_API_SERVER_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model: 'second-rolf', messages, stream: false }),
    signal: AbortSignal.timeout(90_000)
  });
  if (!response.ok) throw new Error(`Hermes svarte ${response.status}.`);
  const payload = await response.json();
  const answer = extractAnswer(payload);
  if (!answer) throw new Error('Hermes returnerte et tomt eller ukjent svarformat.');
  return answer;
}

export class SecondRolfGate {
  constructor(state) { this.state = state; }
  async fetch(request) {
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    const now = new Date();
    const minuteKey = `m:${now.toISOString().slice(0, 16)}`;
    const dayKey = `d:${now.toISOString().slice(0, 10)}`;
    const [minute = 0, day = 0] = await Promise.all([
      this.state.storage.get(minuteKey),
      this.state.storage.get(dayKey)
    ]);
    if (minute >= PER_MINUTE || day >= PER_DAY) return new Response('Rate limit', { status: 429 });
    await this.state.storage.put({ [minuteKey]: minute + 1, [dayKey]: day + 1 });
    return new Response('ok');
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const allowed = origin === ALLOWED_ORIGIN;

    if (url.pathname === '/api/second-rolf/health' && request.method === 'GET') {
      return json({ configured: configured(env), mode: 'hermes', siteKey: env.TURNSTILE_SITE_KEY || '' }, 200, allowed ? origin : '');
    }

    if (url.pathname !== '/api/second-rolf') return fail('not_found', 'Ukjent endepunkt.', 404, allowed ? origin : '');
    if (!allowed) return fail('origin', 'Denne nettsiden har ikke tilgang.', 403);
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '600',
        'Vary': 'Origin'
      }});
    }
    if (request.method !== 'POST') return fail('method', 'Bruk POST.', 405, origin);
    if (!configured(env)) return fail('not_configured', 'Hermes-broen er ikke aktivert.', 503, origin);
    if (!(await rateLimit(request, env))) return fail('rate_limit', 'For mange forespørsler. Prøv igjen senere.', 429, origin);

    let clean;
    try { clean = cleanRequest(await readJson(request)); }
    catch (error) { return fail('request', error.message || 'Ugyldig forespørsel.', 400, origin); }

    if (!(await verifyTurnstile(clean.turnstileToken, request, env))) return fail('turnstile', 'Sikkerhetskontrollen feilet.', 403, origin);

    try {
      const answer = await callHermes(clean, env);
      return json({ answer, mode: 'hermes', sources: [] }, 200, origin);
    } catch {
      return fail('hermes_unavailable', 'Hermes-broen svarte ikke. Offentlig profilmodus kan fortsatt brukes.', 503, origin);
    }
  }
};
