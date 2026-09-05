import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SceneRenderer } from '../renderer.js';

const projectUrl = new URL('../', import.meta.url);
const read = (name) => readFile(new URL(name, projectUrl), 'utf8');

test('spillflaten er norsk, selvstendig og peker på lokale ressurser', async () => {
  const html = await read('index.html');
  assert.match(html, /<html lang="nb">/);
  assert.match(html, /<title>Brukerstøttejakten 4\.0/);
  assert.match(html, /maksimal vaktlengde/);
  assert.match(html, /40<\/b><span>saker mot null restanse/);
  assert.match(html, /8<\/b><span>nivåer med nye mekanikker/);
  assert.match(html, /<canvas[^>]+id="gameCanvas"/);
  assert.match(html, /src="\.\/game\.js"/);
  assert.match(html, /href="\.\/styles\.css"/);
  const resourceUrls = [...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)=[\"']([^\"']+)[\"']/gi)]
    .map((match) => match[1]);
  assert.deepEqual(resourceUrls.filter((url) => /^https?:\/\//i.test(url)), []);
});

test('alle ID-er som spillkontrolleren bruker finnes i HTML-en', async () => {
  const [html, controller] = await Promise.all([read('index.html'), read('game.js')]);
  const ids = [...controller.matchAll(/querySelector\('#([A-Za-z][\w-]*)'\)/g)].map((match) => match[1]);
  assert.ok(ids.length > 30, 'forventet et rikt spillgrensesnitt');
  for (const id of new Set(ids)) assert.match(html, new RegExp(`id=["']${id}["']`), `mangler #${id}`);
});

test('grafikkmotoren eksporterer både WebGL-hovedmodus og Canvas-reserve', async () => {
  assert.equal(typeof SceneRenderer, 'function');
  const source = await read('renderer.js');
  assert.match(source, /getContext\('webgl'/);
  assert.match(source, /getContext\('2d'/);
  assert.match(source, /renderWebGL\(/);
  assert.match(source, /renderCanvas\(/);
});
