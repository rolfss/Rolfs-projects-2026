const BACKEND_ORIGIN = 'https://second-rolf-api.rolfsselas.workers.dev';
const LIVE_HEALTH = '/api/second-rolf/health';
const LIVE_CHAT = '/api/second-rolf';
const MAX_HISTORY = 8;

const knowledge = [
  {
    id: 'profile',
    terms: ['rolf','jobb','jobber','arbeid','bakgrunn','profil','hvem'],
    answer: 'Rolf arbeider i skjæringspunktet mellom dokumentasjonsforvaltning, informasjonsstyring og digitale produkter. På denne siden viser han særlig små, fungerende verktøy som gjør komplisert faglogikk mer forståelig og brukbar.',
    source: 'Prosjektsiden'
  },
  {
    id: 'principles',
    terms: ['tenker','arbeidsmåte','prinsipp','bygger','produkt','verktøy','design','god','gode'],
    answer: 'En tydelig rød tråd er: faglig logikk først, grensesnitt etterpå. Verktøyene skal være etterprøvbare, brukbare, testede og nøkterne — særlig ved å vise begrensninger i stedet for å late som systemet vet mer enn det gjør.',
    source: 'Prosjektsiden · prosjektprinsipper'
  },
  {
    id: 'noark',
    terms: ['noark','arkivassistent','arkiv','regelverk','rag'],
    answer: 'Noark 5-arkivassistenten er en kildebasert fagassistent for Noark og arkivregelverket. Den er laget for å finne relevant grunnlag, svare kort og vise hvilke kilder svaret bygger på.',
    source: 'Noark 5-arkivassistent'
  },
  {
    id: 'archive-assist',
    terms: ['archive','assist','metadata','dokument','tittel','saksdokument'],
    answer: 'Archive Assist leser dokumentinnhold og tilgjengelige metadata og foreslår blant annet en bedre saksdokumenttittel. Poenget er å hjelpe saksbehandler eller arkivar, ikke å fjerne menneskelig kontroll.',
    source: 'Archive Assist'
  },
  {
    id: 'metaready',
    terms: ['metaready','metadata','ai-beredskap','beredskap','informasjonsstyring','informasjon'],
    answer: 'MetaReady er en arbeidsflate for metadata, eierskap, proveniens, sensitivitet, livsløp, relasjoner, kvalitet og AI-beredskap. Den gjør mangler om til konkrete styringstiltak.',
    source: 'MetaReady'
  },
  {
    id: 'arkivmuseet',
    terms: ['arkivmuseet','museum','museet','3d','leder','offentlighet','etterprøvbarhet'],
    answer: 'Arkivmuseet er en nettbasert 3D-museumsopplevelse om hvorfor offentlig dokumentasjon betyr noe. Brukeren går gjennom virkelige saker om dokumentasjon, offentlighet og etterprøvbarhet og avslutter med valg rettet mot ledere.',
    source: 'Arkivmuseet'
  },
  {
    id: 'games',
    terms: ['spill','lumen','relay','brukerstøttejakten','interaktiv','game'],
    answer: 'Rolf bruker også spillmekanikk som demonstrasjon av interaksjonsdesign. Lumen Relay er et kort nettleserspill, mens Brukerstøttejakten er et mer omfattende, humoristisk IT-spill med nivåer, saker og oppgraderinger.',
    source: 'Lumen Relay · Brukerstøttejakten'
  },
  {
    id: 'ai',
    terms: ['ai','ki','kunstig','intelligens','modell','luna','hermes'],
    answer: 'AI brukes først og fremst som et verktøy rundt konkrete arbeidsproblemer: kildebaserte svar, metadataforslag og interaktive assistenter. Second Rolf er neste steg: en avgrenset offentlig representasjon som senere kan kobles til Hermes uten å gi offentligheten tilgang til den private arbeidsstasjonen.',
    source: 'Offentlig portefølje · Second Rolf-arkitektur'
  },
  {
    id: 'contact',
    terms: ['kontakt','samarbeid','samarbeide','github','kode','repo'],
    answer: 'Den sikreste veien videre er å se prosjektkoden på GitHub og kontakte Rolf gjennom hans vanlige offentlige kanaler. Second Rolf skal ikke inngå avtaler, love samarbeid eller opptre som om den har fullmakt.',
    source: 'Second Rolf · sikkerhetsgrense'
  }
];

const els = {
  messages: document.querySelector('#messages'),
  form: document.querySelector('#composer'),
  question: document.querySelector('#question'),
  send: document.querySelector('#send'),
  clear: document.querySelector('#clear'),
  status: document.querySelector('#status'),
  turnstile: document.querySelector('#turnstile')
};

let history = [];
let live = false;
let siteKey = '';
let turnstileToken = '';
let widgetId = null;

function normalize(text) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9æøå -]/g, ' ');
}

function localAnswer(question) {
  const normalizedQuestion = normalize(question);
  const words = new Set(normalizedQuestion.split(/\s+/).filter((w) => w.length > 2));
  const ranked = knowledge.map((item) => ({
    ...item,
    score: item.terms.reduce((sum, term) => sum + (words.has(normalize(term)) ? 2 : normalizedQuestion.includes(normalize(term)) ? 1 : 0), 0)
  })).sort((a, b) => b.score - a.score);
  const matches = ranked.filter((item) => item.score > 0).slice(0, 2);
  if (!matches.length) return {
    text: 'Jeg har foreløpig bare en liten, offentlig kunnskapsbase. Spør gjerne om Rolfs prosjekter, dokumentasjonsforvaltning, AI-verktøy eller arbeidsmåte. Når Hermes-broen er aktiv, kan jeg håndtere langt friere spørsmål.',
    sources: ['Second Rolf · offentlig profilmodus']
  };
  return {
    text: matches.map((item) => item.answer).join('\n\n'),
    sources: [...new Set(matches.map((item) => item.source))]
  };
}

function addMessage(role, text, sources = []) {
  const article = document.createElement('article');
  article.className = `message ${role}`;
  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = role === 'assistant' ? 'R2' : 'DU';
  const bubble = document.createElement('div');
  if (role === 'assistant') {
    const speaker = document.createElement('span');
    speaker.className = 'speaker';
    speaker.textContent = live ? 'Second Rolf · Hermes' : 'Second Rolf';
    bubble.append(speaker);
  }
  const p = document.createElement('p');
  p.textContent = text;
  bubble.append(p);
  if (sources.length) {
    const small = document.createElement('div');
    small.className = 'sources';
    small.textContent = `Grunnlag: ${sources.join(' · ')}`;
    bubble.append(small);
  }
  article.append(avatar, bubble);
  els.messages.append(article);
  els.messages.scrollTop = els.messages.scrollHeight;
}

async function loadTurnstile() {
  if (!siteKey || window.turnstile) return;
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.append(script);
  });
  els.turnstile.hidden = false;
  widgetId = window.turnstile.render(els.turnstile, {
    sitekey: siteKey,
    action: 'second-rolf-chat',
    theme: 'light',
    callback: (token) => { turnstileToken = token; },
    'expired-callback': () => { turnstileToken = ''; },
    'error-callback': () => { turnstileToken = ''; return true; }
  });
}

async function detectLiveMode() {
  try {
    const response = await fetch(`${BACKEND_ORIGIN}${LIVE_HEALTH}`, {
      cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(4500)
    });
    if (!response.ok) return;
    const data = await response.json();
    if (data?.configured !== true || data?.mode !== 'hermes') return;
    live = true;
    siteKey = typeof data.siteKey === 'string' ? data.siteKey : '';
    els.status.classList.add('live');
    els.status.querySelector('b').textContent = 'Hermes live';
    await loadTurnstile();
  } catch {
    // Safe fallback: the page remains useful without exposing or probing the local workstation.
  }
}

async function askLive(question) {
  if (siteKey && !turnstileToken) throw new Error('Fullfør sikkerhetskontrollen før du sender.');
  const response = await fetch(`${BACKEND_ORIGIN}${LIVE_CHAT}`, {
    method: 'POST', credentials: 'omit', cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      history: history.slice(-MAX_HISTORY),
      requestId: crypto.randomUUID(),
      turnstileToken
    }),
    signal: AbortSignal.timeout(90000)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data?.message === 'string' ? data.message : 'Hermes-broen svarte ikke.');
  if (typeof data?.answer !== 'string' || !data.answer.trim()) throw new Error('Ugyldig svar fra Hermes-broen.');
  return { text: data.answer.trim().slice(0, 6000), sources: Array.isArray(data.sources) ? data.sources.slice(0, 6).map(String) : [] };
}

async function submit(question) {
  const cleaned = question.trim().slice(0, 1000);
  if (cleaned.length < 2) return;
  addMessage('user', cleaned);
  history.push({ role: 'user', content: cleaned });
  els.question.value = '';
  els.send.disabled = true;
  try {
    let result;
    if (live) {
      try { result = await askLive(cleaned); }
      catch {
        result = localAnswer(cleaned);
        result.text = `${result.text}\n\nHermes-broen var ikke tilgjengelig for denne meldingen. Lokal offentlig profilmodus ble brukt i stedet.`;
      }
    } else result = localAnswer(cleaned);
    addMessage('assistant', result.text, result.sources);
    history.push({ role: 'assistant', content: result.text });
    history = history.slice(-MAX_HISTORY);
  } finally {
    if (widgetId !== null && window.turnstile) {
      window.turnstile.reset(widgetId);
      turnstileToken = '';
    }
    els.send.disabled = false;
    els.question.focus();
  }
}

els.form.addEventListener('submit', (event) => {
  event.preventDefault();
  submit(els.question.value);
});
els.question.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    els.form.requestSubmit();
  }
});
document.querySelectorAll('[data-prompt]').forEach((button) => button.addEventListener('click', () => submit(button.dataset.prompt)));
els.clear.addEventListener('click', () => {
  history = [];
  els.messages.querySelectorAll('.message').forEach((message, index) => { if (index) message.remove(); });
  els.question.focus();
});

detectLiveMode();
