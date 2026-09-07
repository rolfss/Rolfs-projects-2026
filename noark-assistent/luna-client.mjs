import { API_CONFIG } from './api-config.mjs';
import { BUILD_INFO, LEGACY_CORPUS_VERSION, LEGACY_RECORD_IDS } from './data.mjs';
import { getRecord, getSource, sourceUrl } from './engine.mjs';
import { MODEL_ID, cleanConversation, retrieveConversation } from './rag-shared.mjs';

export function backendOrigin(value = API_CONFIG.origin) {
  if (!value) return '';
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/')
    throw new Error('Ugyldig backendadresse.');
  return url.origin;
}

export function acceptedCorpus(version) {
  return version === BUILD_INFO.corpusVersion || version === LEGACY_CORPUS_VERSION;
}

export function needsUpdatedCorpus(question, history = []) {
  return retrieveConversation(question, history).slice(0, 3).some((r) => !LEGACY_RECORD_IDS.has(r.record.id));
}

export async function loadLunaStatus() {
  try {
    const origin = backendOrigin();
    if (!origin) return { configured: false, message: 'Luna er klargjort, men ikke aktivert. Lokalt kildesøk fungerer.' };
    const response = await fetch(`${origin}/api/health`, { credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(7000) });
    if (!response.ok) throw new Error();
    const status = await response.json();
    if (status.model !== MODEL_ID || !acceptedCorpus(status.corpusVersion))
      throw new Error('Backend og kildebase må oppdateres samtidig.');
    return { ...status, currentCorpus: status.corpusVersion === BUILD_INFO.corpusVersion, configured: status.configured === true && typeof status.siteKey === 'string' && Boolean(status.siteKey),
      message: !status.configured ? 'Luna venter på sikker aktivering. Lokalt kildesøk fungerer.' : status.corpusVersion === BUILD_INFO.corpusVersion ? 'Luna-backend er klar med utvidet kildegrunnlag. Aktiver KI nedenfor.' : 'Luna bruker foreløpig kildegrunnlaget fra 02.09.2026. Nye veiledere brukes i lokalt søk inntil bakenden er oppdatert.' };
  } catch { return { configured: false, message: 'Luna-backend er ikke tilgjengelig. Lokalt kildesøk fungerer.' }; }
}

export function validateUiAnswer(answer) {
  if (!answer || answer.mode !== 'luna' || answer.model !== MODEL_ID || !acceptedCorpus(answer.corpusVersion) ||
      !['ok', 'insufficient'].includes(answer.status) || !Array.isArray(answer.results) || answer.results.length > 12 ||
      typeof answer.lead !== 'string' || answer.lead.length > 1000 || !Array.isArray(answer.points) || answer.points.length > 2)
    throw new Error('Ugyldig svar fra backend.');
  const ids = new Set();
  const results = answer.results.map((r, i) => {
    const record = getRecord(r.record?.id);
    if (!record || (answer.corpusVersion === LEGACY_CORPUS_VERSION && !LEGACY_RECORD_IDS.has(record.id)) || ids.has(record.id) || r.rank !== i + 1 || !Number.isInteger(r.relevance) || r.relevance < 0 || r.relevance > 100 ||
        typeof r.relevanceReason !== 'string' || r.relevanceReason.length > 160 || (i && answer.results[i - 1].relevance < r.relevance))
      throw new Error('Ugyldige kildehenvisninger.');
    ids.add(record.id);
    return { ...r, record, source: getSource(record.source), url: sourceUrl(record) };
  });
  for (const claim of [{ text: answer.lead, citations: answer.leadCitations }, ...answer.points]) {
    if (typeof claim.text !== 'string' || claim.text.length > 1000 || !Array.isArray(claim.citations) ||
        (answer.status === 'ok' && !claim.citations.length) || claim.citations.some((n) => !Number.isInteger(n) || n < 1 || n > results.length))
      throw new Error('Ugyldige påstandshenvisninger.');
  }
  if (!answer.confidence || !['høy', 'middels', 'lav'].includes(answer.confidence.level) ||
      !Number.isFinite(answer.confidence.score) || typeof answer.confidence.label !== 'string' ||
      typeof answer.guidance !== 'string' || answer.guidance.length > 500) throw new Error('Ugyldige svarfelt.');
  return { ...answer, results, guidance: answer.corpusVersion === LEGACY_CORPUS_VERSION ? `${answer.guidance.slice(0, 360)} Dette Luna-svaret bruker det eldre kildegrunnlaget fra 02.09.2026.` : answer.guidance };
}

export async function askLuna(question, history, token, signal, options = {}) {
  const clean = cleanConversation(question, history);
  if (options.corpusVersion === LEGACY_CORPUS_VERSION && needsUpdatedCorpus(question, history))
    throw new Error('Dette spørsmålet trenger de nye veilederne. Viser oppdatert lokalt søk til bakenden er oppdatert.');
  if (!token) throw new Error('Fullfør sikkerhetskontrollen før du sender til Luna.');
  const response = await fetch(`${backendOrigin()}/api/chat`, { method: 'POST', credentials: 'omit', cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...clean, requestId: crypto.randomUUID(), turnstileToken: token,
      qualityConsent: options.qualityConsent === true ? '2026-09-review-v1' : '' }),
    signal: AbortSignal.any([signal, AbortSignal.timeout(65000)]),
  });
  const answer = await response.json();
  if (!response.ok) throw new Error(typeof answer.message === 'string' ? answer.message.slice(0, 300) : 'Luna er ikke tilgjengelig.');
  // The backend may abstain locally without making a paid model call.
  if (answer.mode === 'local') throw new Error('Ingen sikre kandidater for Luna. Viser lokalt kildesøk.');
  return validateUiAnswer(answer);
}

let turnstileLoad;
export async function mountBotCheck(siteKey, target, onToken) {
  if (!turnstileLoad) turnstileLoad = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => { turnstileLoad = null; script.remove(); reject(new Error('Sikkerhetskontrollen kunne ikke lastes.')); };
    document.head.append(script);
  });
  await turnstileLoad;
  return window.turnstile.render(target, { sitekey: siteKey, action: 'noark-chat', theme: 'light',
    callback: (token) => onToken(token), 'expired-callback': () => onToken(''), 'error-callback': () => { onToken(''); return true; },
  });
}
export function resetBotCheck(widget) {
  if (widget !== null && window.turnstile) window.turnstile.reset(widget);
}
