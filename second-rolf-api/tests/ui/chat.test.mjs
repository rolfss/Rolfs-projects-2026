import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';

const harness = vi.hoisted(() => ({ status: null, token: null }));
vi.mock('../../../site/second-rolf/status.js', () => ({ BACKEND_ORIGIN: 'https://second-rolf-api.rolfsselas.workers.dev', watchStatus: fn => { harness.status = fn; } }));
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const query = s => document.querySelector(s);
const submit = async text => { query('#question').value = text; query('#composer').dispatchEvent(new Event('submit', { cancelable: true })); await flush(); };
const reply = text => new Response(JSON.stringify({ answer: text, mode: 'local-model', localOnly: true, sources: [] }), { status: 200 });

beforeEach(async () => {
  vi.resetModules();
  const html = fs.readFileSync(path.resolve('../site/second-rolf/index.html'), 'utf8');
  document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)[1].replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
  window.turnstile = { render: vi.fn((_, opts) => { harness.token = opts.callback; opts.callback('verified'); return 'widget'; }), reset: vi.fn() };
  await import('../../../site/second-rolf/app.js');
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); document.body.innerHTML = ''; });

it('loads verification on a fresh page even when a named element occupies the SDK global', async () => {
  const sdk = window.turnstile;
  window.turnstile = query('#turnstile');
  const append = vi.spyOn(document.head, 'append').mockImplementation(script => {
    expect(script.src).toBe('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit');
    window.turnstile = sdk;
    script.onload(new Event('load'));
  });
  harness.status({ available: true, gpu: true, siteKey: 'site' }); await flush();
  expect(append).toHaveBeenCalledTimes(1);
  expect(sdk.render).toHaveBeenCalledTimes(1);
  const fetcher = vi.fn().mockResolvedValue(reply('Live answer')); vi.stubGlobal('fetch', fetcher);
  await submit('A real question');
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(query('#messages').textContent).toContain('Live answer');
});

it('keeps offline answers and source links, without falsely labelling them local AI', async () => {
  harness.status({ available: false }); await submit('Hva er Arkivmuseet?');
  expect(query('#messages').textContent).toContain('offentlig profil');
  expect(query('#messages .sources a').href).toContain('/arkivmuseet/');
  expect(query('#status').classList.contains('live')).toBe(false);
});

it('turns the availability light on and off as health changes', () => {
  harness.status({ available: true, gpu: true, siteKey: 'site' }); expect(query('#status').classList.contains('live')).toBe(true);
  harness.status({ available: false }); expect(query('#status').classList.contains('live')).toBe(false);
});

it('sends only previous complete turns and blocks duplicate submissions while answering', async () => {
  harness.status({ available: true, gpu: true, siteKey: 'site' });
  let resolve;
  const fetcher = vi.fn(() => new Promise(r => { resolve = r; })); vi.stubGlobal('fetch', fetcher);
  await submit('First question'); await submit('Duplicate question'); expect(fetcher).toHaveBeenCalledTimes(1);
  expect(JSON.parse(fetcher.mock.calls[0][1].body).history).toEqual([]);
  resolve(reply('First answer')); await flush(); harness.token('another');
  await submit('Follow up');
  const body = JSON.parse(fetcher.mock.calls[1][1].body);
  expect(body.history).toEqual([{ role: 'user', content: 'First question' }, { role: 'assistant', content: 'First answer' }]);
  expect(body.question).toBe('Follow up'); resolve(reply('Follow-up answer')); await flush();
});

it('preserves the question when verification is not ready', async () => {
  harness.status({ available: true, siteKey: 'site' }); harness.token('');
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher); await submit('Please keep this question');
  expect(fetcher).not.toHaveBeenCalled(); expect(query('#question').value).toBe('Please keep this question');
  expect(query('#messages').children).toHaveLength(1);
});

it('ignores a late reply after starting a new conversation', async () => {
  harness.status({ available: true, siteKey: 'site' });
  let resolve; vi.stubGlobal('fetch', () => new Promise(r => { resolve = r; }));
  await submit('Old question'); query('#clear').click(); resolve(reply('Old answer')); await flush();
  expect(query('#messages').children).toHaveLength(1); expect(query('#send').disabled).toBe(false);
});

it('uses an honest fallback and safe text rendering after a network failure', async () => {
  harness.status({ available: true, siteKey: 'site' }); vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  await submit('Arkivmuseet <img src=x onerror=alert(1)>');
  expect(query('#status').classList.contains('live')).toBe(false); expect(query('#messages').textContent).toContain('offentlige profilen');
  expect(query('#messages img')).toBeNull();
});
