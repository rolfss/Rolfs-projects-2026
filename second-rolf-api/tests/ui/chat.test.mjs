import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { PROFILE_REVISION } from '../../../site/second-rolf/interview.js';

const harness = vi.hoisted(() => ({ status: null, token: null, nextStatus: null }));
vi.mock('../../../site/second-rolf/status.js?v=20260920-bonsai-private-notes', async importOriginal => ({
  ...await importOriginal(),
  watchStatus: fn => { harness.status = fn; },
  getStatus: async () => harness.nextStatus
}));
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const query = s => document.querySelector(s);
const submit = async text => { query('#question').value = text; query('#composer').dispatchEvent(new Event('submit', { cancelable: true })); await flush(); };
const reply = (text, profileRevision = PROFILE_REVISION, model = 'Bonsai-2-27B-PQ2_0') => new Response(JSON.stringify({ answer: text, model, profileRevision, mode: 'local-model', localOnly: true, sources: [] }), { status: 200 });
const status = data => harness.status({ profileRevision: PROFILE_REVISION, model: 'Bonsai-2-27B-PQ2_0', reason: data.available ? 'ready' : 'model_unavailable', ...data });

beforeEach(async () => {
  vi.resetModules();
  harness.nextStatus = null;
  const html = fs.readFileSync(path.resolve('../site/second-rolf/index.html'), 'utf8');
  document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)[1].replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
  window.turnstile = { render: vi.fn((_, opts) => { harness.token = opts.callback; opts.callback('verified'); return 'widget'; }), reset: vi.fn() };
  await import('../../../site/second-rolf/app.js');
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); document.body.innerHTML = ''; });

it('loads verification on a fresh page without a named element occupying the SDK global', async () => {
  const sdk = window.turnstile;
  delete window.turnstile;
  expect(window.turnstile).toBeUndefined();
  expect(query('#turnstile')).toBeNull();
  const append = vi.spyOn(document.head, 'append').mockImplementation(script => {
    expect(script.src).toBe('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit');
    window.turnstile = sdk;
    script.onload(new Event('load'));
  });
  status({ available: true, gpu: true, siteKey: 'site' }); await flush();
  expect(append).toHaveBeenCalledTimes(1);
  expect(sdk.render).toHaveBeenCalledTimes(1);
  const fetcher = vi.fn().mockResolvedValue(reply('Live answer')); vi.stubGlobal('fetch', fetcher);
  await submit('A real question');
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(query('#messages').textContent).toContain('Live answer');
});

it('allows general chat in the introduction without adding personal preferences about Rolf', () => {
  expect(query('.lede').textContent).toContain('dokumentasjonsforvaltning');
  expect(query('.lede').textContent).toContain('andre emner');
  expect(query('#messages').textContent).toContain('faglig og teknisk');
  const prompts = [...document.querySelectorAll('[data-prompt]')].map(b => b.dataset.prompt).join(' ');
  expect(prompts).not.toMatch(/hobby|musikk|bøker|fritid|personlighet|mystikk/i);
  expect(prompts).toContain('himmelen er blå');
  expect(document.querySelector('a[href="./interview.html"]')).toBeNull();
  expect(document.querySelector('a[href="./sources.html"]')).not.toBeNull();
});

it('keeps offline answers and source links, without falsely labelling them local AI', async () => {
  status({ available: false }); await submit('Hva er Arkivmuseet?');
  expect(query('#messages').textContent).toContain('offentlig profil');
  expect(query('#messages').lastElementChild.textContent).toContain('ikke AI');
  expect(query('#messages .sources a').href).toContain('/arkivmuseet/');
  expect(query('#status').classList.contains('live')).toBe(false);
  expect(query('#reply-wait').hidden).toBe(true);
});

it('names Bonsai and the verified GPU rather than just saying local AI', () => {
  status({ available: true, gpu: true, siteKey: 'site' });
  expect(query('#status').classList.contains('live')).toBe(true);
  expect(query('#status').textContent).toContain('Bonsai 2 27B · aktiv på GPU');
  status({ available: true, gpu: false, siteKey: 'site' });
  expect(query('#status').textContent).not.toContain('GPU');
  status({ available: false }); expect(query('#status').classList.contains('live')).toBe(false);
});

it('does not call an older backend, including the former basic-interest revision', async () => {
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  for (const profileRevision of [undefined, 'older-revision', '2026-09-14-basic-public-interests']) {
    harness.status({ available: true, gpu: true, siteKey: 'site', profileRevision });
    await submit('What is MetaReady?');
  }
  expect(fetcher).not.toHaveBeenCalled();
  expect(query('#status').classList.contains('live')).toBe(false);
  expect(query('#messages').textContent).toContain('proveniens');
  expect(window.turnstile.render).not.toHaveBeenCalled();
});

it('sends only previous complete turns and blocks duplicate submissions while answering', async () => {
  status({ available: true, gpu: true, siteKey: 'site' });
  let resolve;
  const fetcher = vi.fn(() => new Promise(r => { resolve = r; })); vi.stubGlobal('fetch', fetcher);
  await submit('First question'); await submit('Duplicate question'); expect(fetcher).toHaveBeenCalledTimes(1);
  expect(JSON.parse(fetcher.mock.calls[0][1].body).history).toEqual([]);
  expect(JSON.parse(fetcher.mock.calls[0][1].body).profileRevision).toBe(PROFILE_REVISION);
  resolve(reply('First answer')); await flush(); harness.token('another');
  await submit('Follow up');
  const body = JSON.parse(fetcher.mock.calls[1][1].body);
  expect(body.history).toEqual([{ role: 'user', content: 'First question' }, { role: 'assistant', content: 'First answer' }]);
  expect(body.question).toBe('Follow up'); resolve(reply('Follow-up answer')); await flush();
});

it('preserves the question when verification is not ready', async () => {
  status({ available: true, siteKey: 'site' }); harness.token('');
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher); await submit('Please keep this question');
  expect(fetcher).not.toHaveBeenCalled(); expect(query('#question').value).toBe('Please keep this question');
  expect(query('#messages').children).toHaveLength(1);
  expect(query('#reply-wait').hidden).toBe(true);
});

it('explains the pause and shows elapsed time until a slow answer completes', async () => {
  vi.useFakeTimers();
  status({ available: true, siteKey: 'site' });
  let resolve;
  const fetcher = vi.fn(() => new Promise(r => { resolve = r; })); vi.stubGlobal('fetch', fetcher);
  expect(query('#question').getAttribute('aria-describedby')).toBe('response-time');
  expect(query('#response-time').textContent).toContain('Hele svaret vises når det er ferdig');
  await submit('A slower question');
  expect(query('#reply-wait').hidden).toBe(false);
  expect(query('#reply-wait-message').textContent).toContain('Venter på svar');
  expect(query('#reply-elapsed').getAttribute('aria-hidden')).toBe('true');
  expect(query('#send').disabled).toBe(true);
  await vi.advanceTimersByTimeAsync(16000);
  expect(query('#reply-elapsed').textContent).toBe('16 s');
  expect(query('#reply-wait-message').textContent).toContain('vi venter fortsatt');
  await submit('Duplicate'); expect(fetcher).toHaveBeenCalledTimes(1);
  resolve(reply('The completed answer')); await flush();
  expect(query('#reply-wait').hidden).toBe(true);
  expect(query('#send').disabled).toBe(false);
  await vi.advanceTimersByTimeAsync(5000);
  expect(query('#reply-elapsed').textContent).toBe('');
});

it('does not let a cancelled request stop the next question’s waiting indicator', async () => {
  vi.useFakeTimers();
  status({ available: true, siteKey: 'site' });
  const resolvers = [];
  vi.stubGlobal('fetch', () => new Promise(r => { resolvers.push(r); }));
  await submit('Old question'); await vi.advanceTimersByTimeAsync(3000);
  query('#clear').click();
  expect(query('#reply-wait').hidden).toBe(true);
  harness.token('new-verification'); await submit('New question');
  resolvers[0](reply('Old answer')); await flush();
  await vi.advanceTimersByTimeAsync(2000);
  expect(query('#reply-wait').hidden).toBe(false);
  expect(query('#reply-elapsed').textContent).toBe('2 s');
  expect(query('#messages').textContent).not.toContain('Old answer');
  resolvers[1](reply('New answer')); await flush();
  expect(query('#reply-wait').hidden).toBe(true);
});

it('stops waiting on a busy response and preserves the retry message and question', async () => {
  vi.useFakeTimers();
  status({ available: true, siteKey: 'site' });
  let resolve; vi.stubGlobal('fetch', () => new Promise(r => { resolve = r; }));
  await submit('Please keep my question'); await vi.advanceTimersByTimeAsync(16000);
  resolve(new Response(JSON.stringify({ error: 'busy', message: 'Modellen er opptatt. Prøv igjen om litt.' }), { status: 429 }));
  await flush(); await vi.advanceTimersByTimeAsync(5000);
  expect(query('#reply-wait').hidden).toBe(true);
  expect(query('#chat-feedback').textContent).toContain('Modellen er opptatt');
  expect(query('#question').value).toBe('Please keep my question');
  expect(query('#send').disabled).toBe(false);
});

it('ignores a late reply after starting a new conversation', async () => {
  status({ available: true, siteKey: 'site' });
  let resolve; vi.stubGlobal('fetch', () => new Promise(r => { resolve = r; }));
  await submit('Old question'); query('#clear').click(); resolve(reply('Old answer')); await flush();
  expect(query('#messages').children).toHaveLength(1); expect(query('#send').disabled).toBe(false);
});

it('uses an honest fallback and safe text rendering after a network failure', async () => {
  status({ available: true, siteKey: 'site' }); vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  await submit('Arkivmuseet <img src=x onerror=alert(1)>');
  expect(query('#status').classList.contains('live')).toBe(false); expect(query('#messages').textContent).toContain('offentlige profilen');
  expect(query('#messages img')).toBeNull();
});

it('discards stale response content instead of displaying it or retaining it in history', async () => {
  status({ available: true, siteKey: 'site' });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply('STALE_CONTENT', '2026-09-14-basic-public-interests')));
  await submit('What is MetaReady?');
  expect(query('#messages').textContent).not.toContain('STALE_CONTENT');
  expect(query('#messages').textContent).toContain('proveniens');
  expect(query('#status').classList.contains('live')).toBe(false);
});

it('explains that only fallback mode is limited, rather than banning general questions', async () => {
  status({ available: false });
  await submit('A non-work preference question');
  const answer = query('#messages').lastElementChild.textContent;
  expect(answer).toContain('I profilmodus');
  expect(answer).toContain('Vanlige spørsmål kan besvares av Bonsai');
  expect(answer).not.toMatch(/hobby|musikk|bøker|science fiction|fantasy/i);
});

it('forwards general questions to the real chat route instead of the profile matcher', async () => {
  status({ available: true, gpu: true, siteKey: 'site' });
  const fetcher = vi.fn().mockResolvedValue(reply('Shorter wavelengths scatter more strongly.'));
  vi.stubGlobal('fetch', fetcher);
  await submit('Why is the sky blue?');
  expect(JSON.parse(fetcher.mock.calls[0][1].body).question).toBe('Why is the sky blue?');
  expect(query('#messages').lastElementChild.textContent).toContain('Shorter wavelengths');
  expect(query('#messages').lastElementChild.textContent).toContain('Bonsai 2 27B');
  expect(query('#messages').lastElementChild.querySelector('.sources')).toBeNull();
});

it('does not display an answer from a different or unspecified model as Bonsai', async () => {
  for (const model of ['another-model', 'ministral-3:14b', null]) {
    status({ available: true, siteKey: 'site' }); harness.token('verified');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply('WRONG_MODEL_OUTPUT', PROFILE_REVISION, model)));
    await submit('Why is the sky blue?');
    expect(query('#messages').textContent).not.toContain('WRONG_MODEL_OUTPUT');
    expect(query('#status').classList.contains('live')).toBe(false);
  }
});

it('distinguishes a connected legacy model from a disconnected PC without bypassing privacy', async () => {
  status({ available: false, modelOnline: true, profileRevision: undefined, reason: 'backend_update_required' });
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  await submit('Why is the sky blue?');
  expect(query('#status').textContent).toContain('Bonsai tilkoblet');
  expect(query('#status').textContent).toContain('oppdatering kreves');
  expect(query('#status-detail').textContent).toContain('Cloudflare');
  expect(query('#status').classList.contains('live')).toBe(false);
  expect(fetcher).not.toHaveBeenCalled();
});

it('rechecks readiness on request and recovers without reloading the page', async () => {
  status({ available: false, reason: 'pc_disconnected' });
  harness.nextStatus = { available: true, model: 'Bonsai-2-27B-PQ2_0', profileRevision: PROFILE_REVISION, gpu: true, reason: 'ready', siteKey: 'site' };
  query('#retry-status').click(); await flush();
  expect(query('#status').classList.contains('live')).toBe(true);
  expect(query('#retry-status').disabled).toBe(false);
});

it('does not feed an offline template into a later live conversation', async () => {
  status({ available: false }); await submit('What is MetaReady?');
  status({ available: true, siteKey: 'site' });
  const fetcher = vi.fn().mockResolvedValue(reply('A general answer.')); vi.stubGlobal('fetch', fetcher);
  await submit('Explain gravity.');
  expect(JSON.parse(fetcher.mock.calls[0][1].body).history).toEqual([]);
});
