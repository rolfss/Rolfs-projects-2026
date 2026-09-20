import { rankKnowledge, PROFILE_REVISION } from './knowledge.js?v=20260920-bonsai-private-notes';
import { BACKEND_ORIGIN, LOCAL_MODEL, watchStatus, getStatus, statusDescription } from './status.js?v=20260920-bonsai-private-notes';
const els = Object.fromEntries(['messages', 'composer', 'question', 'send', 'clear', 'status', 'status-detail', 'retry-status', 'verification', 'chat-feedback', 'reply-wait', 'reply-wait-message', 'reply-elapsed'].map(id => [id, document.getElementById(id)]));
let history = [], live = false, siteKey = '', turnstileToken = '', widgetId = null, scriptPromise, busy = false, generation = 0, controller, waitingTimer;

function localAnswer(question) {
  const matches = rankKnowledge(question).slice(0, 2);
  const relevant = matches.filter(m => m.score >= matches[0].score * .75);
  return relevant.length ? { text: relevant.map(m => m.answer).join('\n\n'), sources: relevant.map(m => ({ title: m.source, url: new URL(m.url, 'https://rolfss.github.io/Rolfs-projects-2026/second-rolf/').href })) } : {
    text: 'Bonsai er ikke tilgjengelig for live-chat akkurat nå. I profilmodus er svarene avgrenset til fag og teknologi og Rolfs dokumenterte profesjonelle profil. Vanlige spørsmål kan besvares av Bonsai når tilkoblingen er klar. Dette er en innebygd melding, ikke et modellsvar.', sources: []
  };
}

function addMessage(role, text, sources = [], isLive = false) {
  const article = document.createElement('article'); article.className = `message ${role}`;
  const avatar = document.createElement('div'); avatar.className = 'avatar'; avatar.textContent = role === 'assistant' ? 'R2' : 'DU';
  const bubble = document.createElement('div');
  if (role === 'assistant') {
    const speaker = document.createElement('span'); speaker.className = 'speaker';
    speaker.textContent = isLive ? 'Second Rolf · Bonsai 2 27B · lokal AI' : 'Second Rolf · offentlig profil · ikke AI'; bubble.append(speaker);
  }
  const p = document.createElement('p');
  for (const part of text.split(/(\*\*[^*\n]+\*\*)/g)) {
    if (part.startsWith('**') && part.endsWith('**')) { const strong = document.createElement('strong'); strong.textContent = part.slice(2, -2); p.append(strong); }
    else p.append(part);
  }
  bubble.append(p);
  if (sources.length) {
    const list = document.createElement('div'); list.className = 'sources'; list.append('Grunnlag: ');
    for (const [index, source] of sources.entries()) {
      if (typeof source?.title !== 'string' || typeof source.url !== 'string') continue;
      let url; try { url = new URL(source.url, location.href); } catch { continue; }
      if (url.protocol !== 'https:' || !['rolfss.github.io', 'github.com'].includes(url.hostname)) continue;
      if (index) list.append(' · ');
      const link = document.createElement('a'); link.href = url.href; link.textContent = source.title; link.rel = 'noreferrer'; list.append(link);
    }
    bubble.append(list);
  }
  article.append(avatar, bubble); els.messages.append(article); els.messages.scrollTop = els.messages.scrollHeight;
}

function setLive(status) {
  live = status.available === true && status.model === LOCAL_MODEL && status.profileRevision === PROFILE_REVISION;
  els.status.classList.toggle('live', live);
  let label;
  if (live) label = status.busy ? 'Bonsai 2 27B · opptatt' : status.gpu ? 'Bonsai 2 27B · aktiv på GPU' : 'Bonsai 2 27B · aktiv';
  else if (status.modelOnline) label = 'Bonsai tilkoblet · oppdatering kreves';
  else label = ['backend_update_required', 'connector_update_required'].includes(status.reason) ? 'Bonsai · oppdatering kreves' : 'Bonsai · live-chat utilgjengelig';
  els.status.querySelector('b').textContent = label;
  const detail = statusDescription(status);
  els.status.title = detail;
  if (els['status-detail']) els['status-detail'].textContent = detail;
  if (typeof status.siteKey === 'string' && status.siteKey) siteKey = status.siteKey;
  if (live) void loadTurnstile().catch(() => { els['chat-feedback'].textContent = 'Sikkerhetskontrollen kunne ikke lastes. Prøv å laste siden på nytt.'; });
  else els.verification.hidden = true;
}

async function loadTurnstile() {
  if (!siteKey) return;
  if (typeof window.turnstile?.render !== 'function') {
    if (!scriptPromise) scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; script.async = true;
      script.onload = resolve;
      script.onerror = () => { scriptPromise = null; script.remove(); reject(new Error('Verification unavailable')); };
      document.head.append(script);
    });
    await scriptPromise;
  }
  els.verification.hidden = !live;
  if (widgetId !== null) return;
  widgetId = window.turnstile.render(els.verification, {
    sitekey: siteKey, action: 'second-rolf-chat', theme: 'light',
    callback: token => { turnstileToken = token; if (!busy) els['chat-feedback'].textContent = ''; },
    'expired-callback': () => { turnstileToken = ''; },
    'error-callback': () => { turnstileToken = ''; return true; }
  });
}

async function askLive(question, signal) {
  const response = await fetch(`${BACKEND_ORIGIN}/api/second-rolf`, {
    method: 'POST', credentials: 'omit', cache: 'no-store', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, history, turnstileToken, profileRevision: PROFILE_REVISION }), signal: AbortSignal.any([signal, AbortSignal.timeout(100_000)])
  });
  const data = await response.json();
  if (!response.ok) { const error = new Error(data.message || 'Tilkoblingen svarte ikke.'); error.code = data.error; throw error; }
  if (data.profileRevision !== PROFILE_REVISION) { const error = new Error('Kunnskapsversjonen er ikke gjeldende.'); error.code = 'profile_revision'; throw error; }
  if (data.model !== LOCAL_MODEL || data.mode !== 'local-model' || data.localOnly !== true || typeof data.answer !== 'string' || !data.answer.trim()) { const error = new Error('Ikke et bekreftet Bonsai-svar.'); error.code = 'model_mismatch'; throw error; }
  return { text: data.answer.slice(0, 6000), sources: Array.isArray(data.sources) ? data.sources.slice(0, 6) : [], isLive: true };
}

function stopWaiting() {
  clearInterval(waitingTimer); waitingTimer = undefined;
  els['reply-wait'].hidden = true;
  els['reply-wait-message'].textContent = ''; els['reply-elapsed'].textContent = '';
}

function startWaiting() {
  stopWaiting();
  const startedAt = performance.now();
  els['reply-wait'].hidden = false;
  const update = () => {
    const seconds = Math.floor((performance.now() - startedAt) / 1000);
    const message = seconds >= 15
      ? 'Dette tar litt tid. Spørsmålet er sendt, og vi venter fortsatt på svaret.'
      : 'Venter på svar fra Bonsai …';
    // Announce only a change of state, not every second of elapsed time.
    if (els['reply-wait-message'].textContent !== message) els['reply-wait-message'].textContent = message;
    els['reply-elapsed'].textContent = `${seconds} s`;
  };
  update(); waitingTimer = setInterval(update, 1000);
}

function setBusy(value) {
  busy = value; els.send.disabled = value;
  if (!value) stopWaiting();
  els.send.textContent = value ? 'Svarer …' : 'Send';
  els.messages.setAttribute('aria-busy', String(value));
  document.querySelectorAll('[data-prompt]').forEach(button => { button.disabled = value; });
}

async function submit(question) {
  if (busy) return;
  const cleaned = question.trim().slice(0, 1000);
  if (cleaned.length < 2) return;
  if (live && !turnstileToken) {
    els.question.value = cleaned;
    els['chat-feedback'].textContent = 'Venter på sikkerhetskontrollen. Send spørsmålet når den er ferdig.';
    return;
  }
  const thisGeneration = generation;
  controller = new AbortController();
  setBusy(true); els['chat-feedback'].textContent = '';
  if (live) startWaiting();
  addMessage('user', cleaned); els.question.value = '';
  try {
    let result;
    if (live) {
      try { result = await askLive(cleaned, controller.signal); }
      catch (error) {
        if (thisGeneration !== generation) return;
        if (['turnstile', 'rate_limit', 'busy', 'request'].includes(error.code)) {
          els['chat-feedback'].textContent = error.message; els.question.value = cleaned;
          els.messages.lastElementChild?.remove(); return;
        }
        setLive({ available: false, reason: error.code === 'profile_revision' ? 'backend_update_required' : error.code === 'model_mismatch' ? 'model_mismatch' : 'network_error' }); result = localAnswer(cleaned);
        result.text += '\n\nLokal AI svarte ikke denne gangen. Dette svaret kommer fra den offentlige profilen.';
      }
    } else result = localAnswer(cleaned);
    if (thisGeneration !== generation) return;
    addMessage('assistant', result.text, result.sources, result.isLive);
    // Do not feed offline templates or connection errors back as the model's own conversation.
    if (result.isLive) {
      history.push({ role: 'user', content: cleaned }, { role: 'assistant', content: result.text.slice(0, 3000) });
      while (history.length > 8 || history.reduce((sum, m) => sum + m.content.length, 0) > 12000) history.splice(0, 2);
    }
    els['chat-feedback'].textContent = '';
  } finally {
    if (thisGeneration === generation) {
      if (widgetId !== null && window.turnstile) { window.turnstile.reset(widgetId); turnstileToken = ''; }
      setBusy(false); els.question.focus();
    }
  }
}

els.composer.addEventListener('submit', event => { event.preventDefault(); void submit(els.question.value); });
els.question.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); if (!busy) els.composer.requestSubmit(); } });
document.querySelectorAll('[data-prompt]').forEach(button => button.addEventListener('click', () => { void submit(button.dataset.prompt); }));
els.clear.addEventListener('click', () => {
  generation++; controller?.abort(); history = []; setBusy(false);
  els.messages.querySelectorAll('.message').forEach((message, index) => { if (index) message.remove(); });
  els['chat-feedback'].textContent = ''; els.question.value = ''; els.question.focus();
  if (widgetId !== null && window.turnstile) { window.turnstile.reset(widgetId); turnstileToken = ''; }
});
els['retry-status']?.addEventListener('click', async () => {
  els['retry-status'].disabled = true;
  try { setLive(await getStatus()); } finally { els['retry-status'].disabled = false; }
});
watchStatus(setLive);
