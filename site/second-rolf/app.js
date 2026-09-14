import { knowledge } from './knowledge.js';
import { BACKEND_ORIGIN, watchStatus } from './status.js';
const els = Object.fromEntries(['messages', 'composer', 'question', 'send', 'clear', 'status', 'verification', 'chat-feedback'].map(id => [id, document.getElementById(id)]));
let history = [], live = false, siteKey = '', turnstileToken = '', widgetId = null, scriptPromise, busy = false, generation = 0, controller;

function normalize(text) { return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9æøå -]/g, ' '); }
function localAnswer(question) {
  const query = normalize(question);
  const words = new Set(query.split(/\s+/).filter(w => w.length > 2));
  const matches = knowledge.map(item => ({ ...item, score: item.terms.reduce((sum, term) => sum + (words.has(normalize(term)) ? 2 : query.includes(normalize(term)) ? 1 : 0), 0) }))
    .filter(item => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 2);
  const relevant = matches.filter(m => m.score >= matches[0].score * .75);
  return relevant.length ? { text: relevant.map(m => m.answer).join('\n\n'), sources: relevant.map(m => ({ title: m.source, url: new URL(m.url, 'https://rolfss.github.io/Rolfs-projects-2026/second-rolf/').href })) } : {
    text: 'Jeg bruker nå en liten offentlig kunnskapsbase. Spør gjerne om Rolfs prosjekter, dokumentasjonsforvaltning, AI-verktøy eller arbeidsmåte. Når den lokale modellen er tilgjengelig, kan jeg svare friere og følge opp samtalen.', sources: []
  };
}

function addMessage(role, text, sources = [], isLive = false) {
  const article = document.createElement('article'); article.className = `message ${role}`;
  const avatar = document.createElement('div'); avatar.className = 'avatar'; avatar.textContent = role === 'assistant' ? 'R2' : 'DU';
  const bubble = document.createElement('div');
  if (role === 'assistant') {
    const speaker = document.createElement('span'); speaker.className = 'speaker';
    speaker.textContent = isLive ? 'Second Rolf · lokal AI' : 'Second Rolf · offentlig profil'; bubble.append(speaker);
  }
  const p = document.createElement('p');
  // Render the common emphasis syntax without accepting model-generated HTML.
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
  live = status.available === true;
  els.status.classList.toggle('live', live);
  els.status.querySelector('b').textContent = live ? (status.gpu ? 'Lokal AI · GPU tilgjengelig' : 'Lokal AI tilgjengelig') : 'Offentlig profilmodus';
  els.status.title = live ? 'Ministral 3 14B på Rolfs PC' : 'PC-en eller modellen er ikke tilkoblet. Offentlig profil er fortsatt tilgjengelig.';
  if (typeof status.siteKey === 'string' && status.siteKey) siteKey = status.siteKey;
  if (live) void loadTurnstile().catch(() => { els['chat-feedback'].textContent = 'Sikkerhetskontrollen kunne ikke lastes. Prøv å laste siden på nytt.'; });
  else els.verification.hidden = true;
}

async function loadTurnstile() {
  if (!siteKey) return;
  // An element named "turnstile" can appear on window before the SDK loads.
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
    body: JSON.stringify({ question, history, turnstileToken }), signal: AbortSignal.any([signal, AbortSignal.timeout(100_000)])
  });
  const data = await response.json();
  if (!response.ok) { const error = new Error(data.message || 'Tilkoblingen svarte ikke.'); error.code = data.error; throw error; }
  if (data.mode !== 'local-model' || data.localOnly !== true || typeof data.answer !== 'string' || !data.answer.trim()) throw new Error('Ugyldig svar fra modellen.');
  return { text: data.answer.slice(0, 6000), sources: Array.isArray(data.sources) ? data.sources.slice(0, 6) : [], isLive: true };
}

function setBusy(value) {
  busy = value; els.send.disabled = value;
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
  setBusy(true); els['chat-feedback'].textContent = live ? 'Ministral tenker …' : '';
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
        setLive({ available: false }); result = localAnswer(cleaned);
        result.text += '\n\nLokal AI svarte ikke denne gangen. Dette svaret kommer fra den offentlige profilen.';
      }
    } else result = localAnswer(cleaned);
    if (thisGeneration !== generation) return;
    addMessage('assistant', result.text, result.sources, result.isLive);
    history.push({ role: 'user', content: cleaned }, { role: 'assistant', content: result.text.slice(0, 3000) });
    while (history.length > 8 || history.reduce((sum, m) => sum + m.content.length, 0) > 12000) history.splice(0, 2);
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
watchStatus(setLive);
