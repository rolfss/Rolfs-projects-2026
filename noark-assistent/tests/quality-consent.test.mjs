import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { QUALITY_POLICY, supportsQualityConsent, qualityConsentView, bindQualityConsent } from '../quality-consent.mjs';

const ready = () => ({ configured: true, questionLogging: { enabled: true, policy: QUALITY_POLICY, retentionDays: 30, text: 'opt-in' } });
class Control extends EventTarget {
  constructor() { super(); this.checked = false; this.hidden = false; this.disabled = false; this.id = 'quality-status'; this.attrs = {}; this.label = { hidden: false }; }
  setAttribute(name, value) { this.attrs[name] = value; }
  closest() { return this.label; }
  change(value) { this.checked = value; this.dispatchEvent(new Event('change')); }
}
function setup(loadStatus = async () => ready()) {
  const checkbox = new Control(); checkbox.checked = true; // Simulate browser restoration.
  const status = new Control(), lunaToggle = new Control(), retryButton = new Control();
  const controller = bindQualityConsent({ checkbox, status, lunaToggle, retryButton, loadStatus });
  return { checkbox, status, lunaToggle, retryButton, controller };
}

test('requires an exact supported opt-in policy, retention and real configured backend', () => {
  assert.equal(supportsQualityConsent(ready()), true);
  for (const backend of [null, {}, { configured: true }, { ...ready(), configured: false }, { ...ready(), configured: 'true' }])
    assert.equal(supportsQualityConsent(backend), false);
  for (const change of [{ enabled: false }, { enabled: 'true' }, { policy: 'old-policy' }, { retentionDays: 31 }, { retentionDays: '30' }, { text: 'always' }])
    assert.equal(supportsQualityConsent({ ...ready(), questionLogging: { ...ready().questionLogging, ...change } }), false);
});

test('grant requires Luna and an explicit boolean opt-in', () => {
  for (const luna of [false, true]) for (const checked of [false, true, 'true', undefined])
    assert.equal(qualityConsentView(ready(), luna, checked).granted, luna && checked === true);
});

test('initial state hides the dead checkbox and clears restored consent', () => {
  const { checkbox, status, controller } = setup();
  assert.equal(checkbox.checked, false); assert.equal(checkbox.disabled, true); assert.equal(checkbox.label.hidden, true);
  assert.match(status.textContent, /Kontrollerer/); assert.equal(controller.granted(), false);
  assert.equal(checkbox.attrs['aria-describedby'], status.id); assert.equal(checkbox.attrs.autocomplete, 'off');
});

test('missing logging offers retry rather than an unusable consent checkbox', async () => {
  const { checkbox, status, retryButton, controller } = setup(async () => ({ configured: true }));
  await controller.refresh();
  assert.equal(checkbox.label.hidden, true); assert.equal(retryButton.hidden, false);
  assert.equal(retryButton.type, 'button'); assert.match(status.textContent, /ikke aktiv på serveren/);
});

test('consent becomes interactive only in Luna mode and updates its status immediately', async () => {
  const { checkbox, status, lunaToggle, controller } = setup();
  await controller.refresh();
  assert.equal(checkbox.disabled, true); assert.match(status.textContent, /slår på «Bruk Luna»/);
  lunaToggle.change(true);
  assert.equal(checkbox.disabled, false); assert.equal(checkbox.label.hidden, false); assert.equal(checkbox.checked, false);
  checkbox.change(true); assert.equal(controller.granted(), true); assert.match(status.textContent, /Samtykke er på/);
  checkbox.change(false); assert.equal(controller.granted(), false); assert.match(status.textContent, /Samtykke er av/);
});

test('switching to local search revokes consent; returning to Luna never restores it', async () => {
  const { checkbox, lunaToggle, controller } = setup();
  await controller.refresh(); lunaToggle.change(true); checkbox.change(true);
  lunaToggle.change(false); assert.equal(controller.granted(), false); assert.equal(checkbox.checked, false);
  lunaToggle.change(true); assert.equal(checkbox.checked, false); assert.equal(controller.granted(), false);
});

test('reset clears consent without disabling a supported checkbox', async () => {
  const { checkbox, lunaToggle, controller } = setup();
  await controller.refresh(); lunaToggle.change(true); checkbox.change(true); controller.clear();
  assert.equal(controller.granted(), false); assert.equal(checkbox.checked, false); assert.equal(checkbox.disabled, false);
});

test('retry recovers from a missing Worker capability without preselecting consent', async () => {
  let backend = { configured: true };
  const { checkbox, lunaToggle, retryButton, controller } = setup(async () => backend);
  lunaToggle.change(true); await controller.refresh();
  backend = ready(); await controller.refresh();
  assert.equal(checkbox.disabled, false); assert.equal(checkbox.checked, false); assert.equal(retryButton.hidden, true);
});

test('failed health checks fail closed and can be retried', async () => {
  let fail = false;
  const { checkbox, status, lunaToggle, retryButton, controller } = setup(async () => { if (fail) throw new Error('offline'); return ready(); });
  await controller.refresh(); lunaToggle.change(true); checkbox.change(true);
  fail = true; await controller.refresh();
  assert.equal(controller.granted(), false); assert.equal(checkbox.checked, false); assert.equal(checkbox.label.hidden, true);
  assert.match(status.textContent, /kunne ikke bekreftes/); assert.equal(retryButton.hidden, false); assert.equal(retryButton.disabled, false);
});

test('no consent can be granted while a recheck is pending; duplicate rechecks are suppressed', async () => {
  let resolve; let calls = 0;
  const { checkbox, lunaToggle, retryButton, controller } = setup(() => { calls++; return new Promise((r) => { resolve = r; }); });
  lunaToggle.change(true);
  const pending = controller.refresh(); await controller.refresh();
  checkbox.checked = true;
  assert.equal(controller.granted(), false); assert.equal(retryButton.disabled, true); assert.equal(calls, 1);
  // A disabled control cannot be user-selected; reset our deliberate DOM tampering.
  checkbox.checked = false;
  resolve(ready()); await pending; assert.equal(checkbox.checked, false); assert.equal(controller.granted(), false);
});

test('an unsupported policy change revokes a previously granted choice', async () => {
  let backend = ready();
  const { checkbox, lunaToggle, controller } = setup(async () => backend);
  await controller.refresh(); lunaToggle.change(true); checkbox.change(true);
  backend = { ...ready(), questionLogging: { ...ready().questionLogging, policy: 'future-policy' } };
  await controller.refresh(); assert.equal(controller.granted(), false); assert.equal(checkbox.disabled, true); assert.equal(checkbox.checked, false);
});

test('app submission uses the guarded consent value and does not make consent required', () => {
  const app = readFileSync(new URL('../app.mjs', import.meta.url), 'utf8');
  assert.match(app, /qualityConsent: state\.qualityConsent\?\.granted\(\) === true/);
  assert.doesNotMatch(app, /qualityConsent: state\.luna\.questionLogging/);
  assert.match(app, /function resetConversation\(\) \{\s*state\.qualityConsent\?\.clear\(\)/);
});

test('real API client sends the policy only for opt-in and removes it on withdrawal', async (t) => {
  const { askLuna } = await import('../luna-client.mjs');
  const sent = [];
  t.mock.method(globalThis, 'fetch', async (_url, init) => {
    sent.push(JSON.parse(init.body));
    return Response.json({ message: 'Simulert svar; intet modellkall.' }, { status: 503 });
  });
  for (const consent of [false, true, false]) {
    await assert.rejects(askLuna('Må et fagsystem være Noark-godkjent?', [], 'unit-test-token', undefined, { qualityConsent: consent }), /Simulert svar/);
  }
  assert.deepEqual(sent.map((body) => body.qualityConsent), ['', QUALITY_POLICY, '']);
});
