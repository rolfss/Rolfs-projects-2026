import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const [html, css, game] = await Promise.all([
  readFile(new URL('index.html', root), 'utf8'),
  readFile(new URL('styles.css', root), 'utf8'),
  readFile(new URL('game.js', root), 'utf8'),
]);

test('spillsiden beskriver den utvidede kaffepausekampanjen', () => {
  assert.match(html, /Brukerstøttejakten 4\.0/);
  assert.match(html, /10<\/b><span>nivåer/);
  assert.match(html, /80<\/b><span>saker/);
  assert.match(html, /Service Manager Mk V/);
});

test('alle sentrale spillflater finnes i dokumentet', () => {
  for (const id of ['gameCanvas', 'levelRail', 'radarBlips', 'quizOverlay', 'intermissionOverlay', 'winOverlay', 'weaponRig']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
});

test('Service Manager Mk V har egne kosmetiske og progressive lag', () => {
  for (const selector of ['.gun-holo-sight', '.gun-capacitor', '.gun-shoulder', '.gun-energy-line', '.weapon-rig.module-9']) {
    assert.ok(css.includes(selector), `Mangler ${selector}`);
  }
});

test('spillet er selvstendig og eksponerer bare testgrensesnitt i testmodus', () => {
  assert.doesNotMatch(html, /https?:\/\/[^"']+\.(?:js|css)/i);
  assert.match(game, /window\.__brukerstottejakten/);
  assert.match(game, /shouldTriggerQuiz/);
  assert.match(game, /intermissionActive/);
});
