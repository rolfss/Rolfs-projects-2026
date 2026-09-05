import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAREER_LEVELS,
  DAILY_MODIFIERS,
  PERK_CATALOG,
  applySessionToProfile,
  careerForXp,
  createDefaultProfile,
  createSeededRandom,
  dailyModifier,
  dailySeed,
  dateKey,
  decodeDuel,
  encodeDuel,
  hashString32,
  resultCode,
  sanitizeName,
  selectMissionIds,
  selectPerkChoices,
  sortLeaderboard,
} from '../meta-core.js';

test('seedet tilfeldighet er reproducerbar', () => {
  const first = createSeededRandom(12345);
  const second = createSeededRandom(12345);
  assert.deepEqual([first(), first(), first()], [second(), second(), second()]);
});

test('dagens kø og modifikator er stabile for samme dato', () => {
  const date = new Date('2026-09-05T12:00:00');
  assert.equal(dateKey(date), '2026-09-05');
  assert.equal(dailySeed(date), dailySeed(new Date('2026-09-05T23:00:00')));
  assert.deepEqual(dailyModifier(dailySeed(date)), dailyModifier(dailySeed(date)));
  assert.ok(DAILY_MODIFIERS.includes(dailyModifier(dailySeed(date))));
});

test('oppdragsutvalg dekker ulike typer mål', () => {
  const missions = selectMissionIds(9876, 3);
  assert.equal(missions.length, 3);
  assert.equal(new Set(missions).size, 3);
});

test('fordelsvalg er deterministiske og utelater eide fordeler', () => {
  const first = selectPerkChoices(42, 0, ['search'], 3);
  const second = selectPerkChoices(42, 0, ['search'], 3);
  assert.deepEqual(first, second);
  assert.equal(first.some((perk) => perk.id === 'search'), false);
  assert.ok(first.every((perk) => PERK_CATALOG[perk.id]));
});

test('karrieren finner nivå, neste terskel og fremdrift', () => {
  assert.equal(CAREER_LEVELS.length, 15);
  const career = careerForXp(1_200);
  assert.equal(career.level, 4);
  assert.equal(career.title, 'Rådgiver');
  assert.ok(career.progress > 0 && career.progress < 100);
});

test('øktoppdatering gir XP, seiere, spillrekke og merker', () => {
  let profile = createDefaultProfile('Ada');
  profile = applySessionToProfile(profile, {
    xp: 500,
    score: 8_000,
    grade: 'S',
    won: true,
    daily: true,
    dateKey: '2026-09-04',
    badges: ['presisjon'],
  });
  profile = applySessionToProfile(profile, {
    xp: 400,
    score: 7_000,
    grade: 'A',
    won: false,
    daily: false,
    dateKey: '2026-09-05',
    badges: [],
  });
  assert.equal(profile.xp, 900);
  assert.equal(profile.plays, 2);
  assert.equal(profile.wins, 1);
  assert.equal(profile.streak, 2);
  assert.equal(profile.bestGrade, 'S');
  assert.ok(profile.badges.includes('null-restanse'));
  assert.ok(profile.badges.includes('dagens-ko'));
});

test('duellkode kan deles og valideres', () => {
  const code = resultCode(123, 7890, 'S');
  const token = encodeDuel({ seed: 123, score: 7890, name: 'Ada Lovelace', grade: 'S', code });
  const decoded = decodeDuel(token);
  assert.deepEqual(decoded, { seed: 123, score: 7890, name: 'Ada Lovelace', grade: 'S', code });
  assert.equal(decodeDuel('ikke gyldig'), null);
});

test('navn begrenses og resultatkode er stabil', () => {
  assert.equal(sanitizeName('  Ada   Lovelace med altfor langt navn '), 'Ada Lovelace med a');
  assert.equal(hashString32('abc'), hashString32('abc'));
  assert.equal(resultCode(1, 2, 'A'), resultCode(1, 2, 'A'));
});

test('lokal toppliste sorterer poeng, progresjon og tid', () => {
  const sorted = sortLeaderboard([
    { name: 'B', score: 1000, cases: 20, seconds: 250 },
    { name: 'A', score: 1400, cases: 15, seconds: 200 },
    { name: 'C', score: 1000, cases: 22, seconds: 280 },
  ]);
  assert.deepEqual(sorted.map((entry) => entry.name), ['A', 'C', 'B']);
});
