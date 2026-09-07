import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGameState, startGame, recordShot, recordDecoyHit, beginLevel, accuracyPercent } from '../game-core.js';
import { COFFEE_DURATION_MS, COFFEE_SCALE, WEAPON_DURATION_MS, PICKUPS, CASE_VARIANTS, createBoostState, collectBoost, boostStatus, chooseVariant, variantHealth, pickupScreen, hitPickup, weaponGeometry, weaponTargets, coffeeScreen, drawPickup, drawVariantBadge, drawWeaponGuide } from '../combat-boosters.js';

const rectangle = (id, x, y, kind = 'normal', size = 12) => ({
  id, kind, health: 3, maxHealth: 3,
  screen: { polygon: [{ x: x - size, y: y - size }, { x: x + size, y: y - size }, { x: x + size, y: y + size }, { x: x - size, y: y + size }] },
});
const renderer = {
  width: 1000,
  hitTest(targets, x, y) {
    return targets.find(t => !t.dead && !t.resolving && t.screen && x >= t.screen.polygon[0].x && x <= t.screen.polygon[1].x && y >= t.screen.polygon[0].y && y <= t.screen.polygon[2].y) || null;
  },
};

test('coffee lasts exactly five active-play seconds', () => {
  const state = collectBoost(createBoostState(), 'coffee', 1200);
  assert.equal(COFFEE_DURATION_MS, 5000);
  assert.equal(boostStatus(state, 1200).coffeeMs, 5000);
  assert.equal(boostStatus(state, 6199).scale, COFFEE_SCALE);
  assert.equal(boostStatus(state, 6200).scale, 1);
  assert.equal(boostStatus(state, 8000).coffeeMs, 0);
});

test('another coffee refreshes the timer without cumulative enlargement', () => {
  const first = collectBoost(createBoostState(), 'coffee', 1000);
  const second = collectBoost(first, 'coffee', 2000);
  assert.equal(first.coffeeUntil, 6000);
  assert.equal(second.coffeeUntil, 7000);
  assert.equal(boostStatus(second, 2000).scale, 1.65);
});

test('phone and email equip distinct twelve-second modes, independently of coffee', () => {
  const coffee = collectBoost(createBoostState(), 'coffee', 0);
  const phone = collectBoost(coffee, 'phone', 500);
  assert.equal(boostStatus(phone, 500).weapon, 'scatter');
  assert.equal(boostStatus(phone, 500).coffeeMs, 4500);
  assert.equal(boostStatus(phone, 500).weaponMs, WEAPON_DURATION_MS);
  const email = collectBoost(phone, 'email', 2000);
  assert.equal(boostStatus(email, 2000).weapon, 'area');
  assert.equal(boostStatus(email, 14000).weapon, 'single');
  assert.equal(boostStatus(phone, 12500).weapon, 'single');
});

test('unchanged active-play time freezes all effects', () => {
  const effects = collectBoost(collectBoost(createBoostState(), 'coffee', 200), 'email', 200);
  const snapshot = boostStatus(effects, 300);
  for (let i = 0; i < 300; i++) assert.deepEqual(boostStatus(effects, 300), snapshot);
});

test('restart state is clean and invalid pickups cannot alter it', () => {
  const clean = createBoostState();
  for (const kind of ['orange', 'unknown', '__proto__']) assert.equal(collectBoost(clean, kind, 0), clean);
  for (const time of [NaN, Infinity, -1]) assert.equal(collectBoost(clean, 'coffee', time), clean);
  assert.deepEqual(boostStatus(clean, 0), { coffeeMs: 0, weaponMs: 0, scale: 1, weapon: 'single' });
});

for (const [key, variant] of Object.entries(CASE_VARIANTS)) {
  test(`${key}: distinct ${variant.health}-hit case, introduced at level ${variant.level}`, () => {
    assert.ok(variant.health >= 2 && variant.health <= 5);
    assert.equal(variantHealth(key), variant.health);
    const armored = ['shield', 'critical'].includes(variant.kind);
    assert.equal(variantHealth(key, 1), variant.health - (armored ? 1 : 0));
    assert.ok(variantHealth(key, 100) >= 1);
    assert.ok(variant.scoreScale > 1);
  });
}

test('variant pool preserves category objectives, basic cases and the boss', () => {
  assert.equal(chooseVariant('priority', 2, 0), null);
  assert.equal(chooseVariant('priority', 3, 0), 'vip');
  assert.equal(chooseVariant('shield', 4, 0), 'hardware');
  assert.equal(chooseVariant('shield', 7, .5), 'server');
  assert.equal(chooseVariant('legacy', 6, 0), 'network');
  assert.equal(chooseVariant('critical', 8, 0), 'security');
  for (const kind of ['normal', 'duplicate', 'major']) assert.equal(chooseVariant(kind, 10, 0), null);
  for (const roll of [.65, .9, NaN, Infinity, -1]) assert.equal(chooseVariant('shield', 10, roll), null);
});

test('pickup graphics and hit detection share geometry at desktop and mobile sizes', () => {
  const pickup = { kind: 'coffee', x: .5, dead: false };
  for (const [width, height] of [[1440, 800], [390, 740], [800, 290]]) {
    const p = pickupScreen(pickup, width, height);
    assert.equal(hitPickup([pickup], p.x, p.y, width, height), pickup);
    assert.equal(hitPickup([pickup], p.x + p.radius + 6, p.y, width, height), null);
  }
  pickup.dead = true;
  const p = pickupScreen(pickup, 1000, 700);
  assert.equal(hitPickup([pickup], p.x, p.y, 1000, 700), null);
});

test('single shots select one case; scatter selects up to three without double damage', () => {
  const points = weaponGeometry('scatter', 500, 300, 1000).points;
  const cases = points.map((point, id) => rectangle(id, point.x, point.y));
  assert.equal(weaponTargets(renderer, cases, 500, 300, 'single').length, 1);
  assert.equal(weaponTargets(renderer, cases, 500, 300, 'scatter').length, 3);
  const big = rectangle(9, 500, 300, 'major', 200);
  assert.deepEqual(weaponTargets(renderer, [big], 500, 300, 'scatter'), [big]);
});

test('area hits include nearby polygon edges, not just centers', () => {
  const center = rectangle(1, 500, 300);
  const edge = rectangle(2, 590, 300);
  const outside = rectangle(3, 610, 410);
  const dead = { ...rectangle(4, 510, 310), dead: true };
  const resolving = { ...rectangle(5, 520, 320), resolving: true };
  const hit = weaponTargets(renderer, [center, edge, outside, dead, resolving], 500, 300, 'area');
  assert.deepEqual(hit.map(t => t.id), [1, 2]);
});

test('area can hit a nearby case without a direct central contact', () => {
  const near = rectangle(1, 560, 300);
  assert.deepEqual(weaponTargets(renderer, [near], 500, 300, 'single'), []);
  assert.deepEqual(weaponTargets(renderer, [near], 500, 300, 'area'), [near]);
});

test('collateral avoids duplicates but directly shooting one still penalizes', () => {
  const normal = rectangle(1, 500, 300);
  const decoy = rectangle(2, 565, 288, 'duplicate');
  for (const mode of ['area', 'scatter']) {
    assert.deepEqual(weaponTargets(renderer, [normal, decoy], 500, 300, mode), [normal]);
    assert.deepEqual(weaponTargets(renderer, [normal, decoy], 565, 288, mode), [decoy]);
  }
  const result = recordDecoyHit({ ...startGame(createGameState()), score: 1000 });
  assert.equal(result.state.score, 820);
  assert.equal(result.state.shots, 1);
});

test('multiple contacts award cases and score, but count only one shot and combo step', () => {
  let state = startGame(createGameState());
  for (let i = 0; i < 3; i++) state = recordShot(state, { hit: true, resolved: true, countShot: i === 0 }).state;
  assert.equal(state.casesSolved, 3);
  assert.equal(state.points, 3);
  assert.equal(state.shots, 1);
  assert.equal(state.hits, 1);
  assert.equal(state.levelShots, 1);
  assert.equal(state.levelHits, 1);
  assert.equal(state.streak, 1);
  assert.equal(accuracyPercent(state), 100);
  assert.equal(recordShot(state, { hit: false, countShot: false }).state, state);
});

test('secondary armored contacts retain objective and lucky-case rewards on closure', () => {
  let state = recordShot(startGame(createGameState()), { hit: true }).state;
  const partial = recordShot(state, { hit: true, countShot: false, kind: 'shield', lucky: true });
  assert.equal(partial.state.casesSolved, 0);
  assert.equal(partial.events.luckyResolved, false);
  const final = recordShot(partial.state, { hit: true, countShot: false, resolved: true, kind: 'shield', lucky: true, shieldBroken: true });
  assert.equal(final.state.shieldBreaks, 1);
  assert.equal(final.state.levelShieldBreaks, 1);
  assert.equal(final.events.luckyResolved, true);
  assert.equal(final.state.casesSolved, 1);
  assert.equal(final.state.shots, 1);
});

test('new counting option preserves normal level completion and the 80-case campaign', () => {
  let state = startGame(createGameState());
  for (let i = 0; i < 80; i++) {
    const result = recordShot(state, { hit: true, resolved: true, kind: i === 79 ? 'major' : 'normal', countShot: i % 2 === 0 });
    state = result.state;
    if (result.events.levelCompleted) state = beginLevel(state, state.level);
  }
  assert.equal(state.status, 'won');
  assert.equal(state.majorResolved, true);
  assert.equal(state.casesSolved, 80);
  assert.equal(state.shots, 40);
  assert.equal(accuracyPercent(state), 100);
});

function screenFixture() {
  const polygon = [{ x: 400, y: 250 }, { x: 500, y: 250 }, { x: 500, y: 290 }, { x: 400, y: 290 }];
  return { center: { x: 450, y: 270 }, width: 100, height: 40, depth: 8, front: polygon, polygon, offset: { x: 5, y: -5 }, bounds: { left: 400, right: 505, top: 245, bottom: 290 }, scale: 1 };
}

test('coffee enlarges rendered and clickable geometry identically, without mutation', () => {
  const original = screenFixture(), backup = structuredClone(original);
  const enlarged = coffeeScreen(original, 1.65, 1200, 150, 500);
  assert.equal(enlarged.width, 165);
  assert.equal(enlarged.height, 66);
  assert.deepEqual(enlarged.front, enlarged.polygon);
  assert.equal(enlarged.bounds.right - enlarged.bounds.left, 105 * 1.65);
  assert.deepEqual(original, backup);
  for (let i = 0; i < 50; i++) assert.deepEqual(coffeeScreen(original, 1.65, 1200, 150, 500), enlarged);
  assert.equal(coffeeScreen(original, 1, 1200, 150, 500), original);
});

test('coffee respects the flight band on short mobile screens', () => {
  const enlarged = coffeeScreen(screenFixture(), 1.65, 390, 245, 305);
  assert.ok(enlarged.width > 100);
  assert.ok(enlarged.bounds.top >= 245);
  assert.ok(enlarged.bounds.bottom <= 305);
});

test('pickup/variant/weapon-guide rendering contains only local steady graphics', () => {
  const noop = () => {};
  const calls = [];
  const context = new Proxy({ measureText: text => ({ width: text.length * 7 }) }, { get(obj, key) { return obj[key] || ((...args) => { calls.push([key, ...args]); }); }, set(obj, key, value) { obj[key] = value; return true; } });
  for (const kind of Object.keys(PICKUPS)) drawPickup(context, { kind, x: .5 }, 1000, 700);
  const target = { variant: 'server', health: 4, maxHealth: 5, screen: screenFixture() };
  drawVariantBadge(context, target);
  drawWeaponGuide(context, 'area', { x: 500, y: 300, visible: true }, 1000);
  assert.ok(calls.some(call => call[0] === 'fillText' && call[1].includes('SERVERHAVARI')));
  assert.ok(!calls.some(call => call[0] === 'fillRect' && call[1] === 0 && call[2] === 0 && call[3] === 1000));
});

test('integration retains the original soundtrack and the no-flash/double-speed guards', () => {
  const rendererSource = readFileSync(new URL('../renderer.js', import.meta.url), 'utf8');
  const game = readFileSync(new URL('../game.js', import.meta.url), 'utf8');
  assert.match(rendererSource, /this\.soundtrack\.setLevel\(frame\.level/);
  assert.match(rendererSource, /target\.speed \*= 2/);
  assert.match(rendererSource, /!target\.__doubleSpeedApplied/);
  assert.match(rendererSource, /this\.impactFlash = 0/);
  assert.match(rendererSource, /this\.levelPulse = 0/);
  assert.match(game, /target\.alpha = \.78/);
  assert.match(game, /countShot: !secondary/);
  assert.match(game, /pulse \? 'single' : boostStatus/);
  assert.match(game, /state\.levelCases >= CASES_PER_LEVEL - 1 && target\.kind !== 'major'/);
});
