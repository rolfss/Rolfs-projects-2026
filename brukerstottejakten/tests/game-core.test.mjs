import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CASES_PER_LEVEL,
  LEVEL_COUNT,
  QUIZ_TRIGGER_PROBABILITY,
  TARGET_CASES,
  accuracyPercent,
  achievementCount,
  applyUpgrade,
  beginLevel,
  careerRank,
  careerXpForRun,
  createGameState,
  isLuckyCase,
  levelForCases,
  levelObjectiveComplete,
  levelProgressPercent,
  levelStars,
  multiplierForStreak,
  performanceGrade,
  recordDecoyHit,
  recordEscape,
  recordQuizAnswer,
  recordShot,
  shouldTriggerQuiz,
  startGame,
  upgradeModifiers,
} from '../game-core.js';

test('lykkesaker har tolv prosent sjanse, aldri på duplikater eller boss', () => {
  for (const kind of ['normal', 'priority', 'legacy', 'shield', 'critical']) {
    assert.equal(isLuckyCase(kind, 0), true);
    assert.equal(isLuckyCase(kind, 0.119999), true);
    for (const roll of [0.12, 1, -1, NaN, Infinity]) assert.equal(isLuckyCase(kind, roll), false);
  }
  for (const kind of ['duplicate', 'major', 'unknown']) assert.equal(isLuckyCase(kind, 0), false);
});

test('lykkesak gir fast bonus og køavlastning uten å endre progresjon eller saksflyt', () => {
  const state = { ...startGame(createGameState()), queuePressure: 60, levelPeakPressure: 60, streak: 8 };
  for (const kind of ['normal', 'priority', 'legacy', 'shield', 'critical']) {
    const shot = { hit: true, resolved: true, kind, scoreScale: 2, now: 1000 };
    const ordinary = recordShot(state, shot);
    const lucky = recordShot(state, { ...shot, lucky: true });
    assert.equal(lucky.events.luckyResolved, true);
    assert.equal(lucky.events.scoreGain - ordinary.events.scoreGain, 400);
    assert.deepEqual(lucky.state, { ...ordinary.state, score: ordinary.state.score + 400, queuePressure: ordinary.state.queuePressure - 15 });
  }
});

test('lykkebonus venter på siste skjermingstreff og gis ikke ved bom eller inaktivt spill', () => {
  const state = { ...startGame(createGameState()), queuePressure: 10 };
  for (const shot of [{ hit: false }, { hit: true, resolved: false, kind: 'shield' }, { hit: true, resolved: true, kind: 'major' }]) {
    assert.deepEqual(recordShot(state, { ...shot, lucky: true }), recordShot(state, shot));
  }
  const partial = recordShot(state, { hit: true, kind: 'shield', lucky: true }).state;
  const closed = recordShot(partial, { hit: true, resolved: true, kind: 'shield', lucky: true });
  assert.equal(closed.events.luckyResolved, true);
  assert.equal(closed.state.casesSolved, 1);
  assert.equal(closed.state.queuePressure, 0);
  const idle = createGameState();
  assert.equal(recordShot(idle, { hit: true, resolved: true, lucky: true }).state, idle);
});

test('lykkesak på nivåslutt beholder bonus og vanlig nivåovergang', () => {
  const state = { ...startGame(createGameState()), casesSolved: 7, levelCases: 7 };
  const result = recordShot(state, { hit: true, resolved: true, lucky: true });
  assert.equal(result.events.levelCompleted, true);
  assert.equal(result.events.luckyResolved, true);
  assert.equal(result.state.level, 2);
  assert.equal(result.state.casesSolved, 8);
  assert.equal(beginLevel(result.state, 2).score, result.state.score);
});

test('kampanjen har ti nivåer og åtti saker', () => {
  assert.equal(TARGET_CASES, 80);
  assert.equal(CASES_PER_LEVEL, 8);
  assert.equal(LEVEL_COUNT, 10);
  assert.equal(levelForCases(0), 1);
  assert.equal(levelForCases(7), 1);
  assert.equal(levelForCases(8), 2);
  assert.equal(levelForCases(72), 10);
  assert.equal(levelForCases(80), 10);
});

test('nivåfremdrift nullstilles etter hvert åttende treff', () => {
  assert.equal(levelProgressPercent(0), 0);
  assert.equal(levelProgressPercent(4), 50);
  assert.equal(levelProgressPercent(7), 87.5);
  assert.equal(levelProgressPercent(8), 0);
  assert.equal(levelProgressPercent(80), 100);
});

test('ny vakt starter rent', () => {
  const state = startGame(createGameState(), 1_000);
  assert.equal(state.status, 'running');
  assert.equal(state.level, 1);
  assert.equal(state.casesSolved, 0);
  assert.equal(state.startedAt, 1_000);
});

test('delvis treff på skjermet sak gir score, men ikke løst sak', () => {
  const started = startGame(createGameState());
  const { state, events } = recordShot(started, { hit: true, resolved: false, kind: 'shield' });
  assert.equal(state.shots, 1);
  assert.equal(state.hits, 1);
  assert.equal(state.casesSolved, 0);
  assert.equal(state.points, 0);
  assert.ok(state.score > 0);
  assert.equal(events.resolved, false);
});

test('åtti løste saker vinner kampanjen', () => {
  let state = startGame(createGameState(), 2_000);
  for (let index = 0; index < TARGET_CASES; index += 1) {
    state = recordShot(state, { hit: true, resolved: true, kind: index === TARGET_CASES - 1 ? 'major' : 'normal', now: 30_000 }).state;
    if ((index + 1) % CASES_PER_LEVEL === 0 && index + 1 < TARGET_CASES) {
      state = beginLevel(state, levelForCases(index + 1), 30_000);
    }
  }
  assert.equal(state.status, 'won');
  assert.equal(state.casesSolved, TARGET_CASES);
  assert.equal(state.points, TARGET_CASES);
  assert.equal(state.level, LEVEL_COUNT);
  assert.equal(state.majorResolved, true);
});

test('quizgrensen er nøyaktig femten prosent', () => {
  assert.equal(QUIZ_TRIGGER_PROBABILITY, 0.15);
  assert.equal(shouldTriggerQuiz(true, 0), true);
  assert.equal(shouldTriggerQuiz(true, 0.149999), true);
  assert.equal(shouldTriggerQuiz(true, 0.15), false);
  assert.equal(shouldTriggerQuiz(false, 0.1), false);
  assert.equal(shouldTriggerQuiz(true, 0.1, true), false);
});

test('kombomultiplikator vokser i tydelige trinn', () => {
  assert.deepEqual([0, 3, 5, 9, 14, 20].map(multiplierForStreak), [1, 1.25, 1.5, 2, 2.5, 3]);
});

test('bom bryter serie, mens kombobuffer beskytter én gang per nivå', () => {
  let state = startGame(createGameState());
  state = applyUpgrade(state, 'combo-buffer');
  state = beginLevel(state, 1);
  state = recordShot(state, { hit: true, resolved: true }).state;
  const firstMiss = recordShot(state, { hit: false }).state;
  assert.equal(firstMiss.streak, 1);
  assert.equal(firstMiss.comboShieldCharges, 0);
  const secondMiss = recordShot(firstMiss, { hit: false }).state;
  assert.equal(secondMiss.streak, 0);
});

test('duplikat gir straff, filter halverer straffen', () => {
  let base = startGame(createGameState());
  base = { ...base, score: 1_000, points: 4 };
  const normalPenalty = recordDecoyHit(base);
  const filteredPenalty = recordDecoyHit(applyUpgrade(base, 'duplicate-filter'));
  assert.equal(normalPenalty.penalty, 180);
  assert.equal(filteredPenalty.penalty, 90);
  assert.equal(normalPenalty.state.decoysHit, 1);
  assert.equal(normalPenalty.state.streak, 0);
});

test('eskaleringvern absorberer køtrykk én gang', () => {
  let state = startGame(createGameState());
  state = applyUpgrade(state, 'queue-shield');
  state = beginLevel(state, 1);
  const guarded = recordEscape(state, { kind: 'critical' });
  assert.equal(guarded.guarded, true);
  assert.equal(guarded.state.queuePressure, 0);
  const unguarded = recordEscape(guarded.state, { kind: 'critical' });
  assert.equal(unguarded.guarded, false);
  assert.equal(unguarded.state.queuePressure, 27);
});

test('køoverlast registreres og trykket settes tilbake til håndterbart nivå', () => {
  const started = { ...startGame(createGameState()), queuePressure: 90 };
  const result = recordEscape(started, { kind: 'critical' });
  assert.equal(result.overloaded, true);
  assert.equal(result.state.overloads, 1);
  assert.equal(result.state.queuePressure, 62);
});

test('riktig og feil quizsvar følger pluss/minus én-regelen', () => {
  let state = { ...startGame(createGameState()), points: 3, score: 1_000 };
  const correct = recordQuizAnswer(state, true);
  assert.equal(correct.pointDelta, 1);
  assert.equal(correct.state.points, 4);
  const wrong = recordQuizAnswer(correct.state, false);
  assert.equal(wrong.pointDelta, -1);
  assert.equal(wrong.state.points, 3);
  const floor = recordQuizAnswer({ ...state, points: 0, score: 0 }, false);
  assert.equal(floor.state.points, 0);
  assert.equal(floor.state.score, 0);
});

test('oppgraderinger kombineres uten duplikater', () => {
  let state = startGame(createGameState());
  state = applyUpgrade(state, 'aim-lens');
  state = applyUpgrade(state, 'aim-lens');
  state = applyUpgrade(state, 'flow-core');
  assert.deepEqual(state.upgrades, ['aim-lens', 'flow-core']);
  const modifiers = upgradeModifiers(state);
  assert.equal(modifiers.hitboxScale, 1.18);
  assert.equal(modifiers.flowGainScale, 1.28);
});

test('nivåmål og stjerner vurderes av nivåstatistikken', () => {
  const state = {
    ...startGame(createGameState(), 0),
    level: 3,
    levelCases: 8,
    levelPriorityHits: 3,
    levelShots: 9,
    levelHits: 8,
    levelEscalations: 0,
    levelStartedAt: 1_000,
  };
  assert.equal(levelObjectiveComplete(state, 3), true);
  assert.equal(levelStars(state, 3, 30_000), 3);
});

test('treffsikkerhet teller alle faktiske treff, også skjermingsslag', () => {
  let state = startGame(createGameState());
  state = recordShot(state, { hit: true, resolved: false, kind: 'shield' }).state;
  state = recordShot(state, { hit: true, resolved: true, kind: 'shield', shieldBroken: true }).state;
  state = recordShot(state, { hit: false }).state;
  assert.equal(Math.round(accuracyPercent(state)), 67);
});

test('prestasjon gir karakterskala og karrierepoeng', () => {
  const strong = {
    ...startGame(createGameState(), 0),
    status: 'won',
    casesSolved: TARGET_CASES,
    points: 90,
    score: 42_000,
    shots: 90,
    hits: 86,
    bestStreak: 22,
    priorityHits: 8,
    criticalHits: 5,
    shieldBreaks: 5,
    quizCorrect: 12,
    flowActivations: 6,
    majorResolved: true,
    finishedAt: 280_000,
  };
  assert.ok(['S', 'A'].includes(performanceGrade(strong, 280_000).grade));
  assert.ok(careerXpForRun(strong, 280_000) > 1_000);
});

test('karriererang følger samlet erfaring', () => {
  assert.equal(careerRank(0).name, 'Nyansatt');
  assert.equal(careerRank(3_200).name, 'Applikasjonsforvalter');
  assert.equal(careerRank(11_500).name, 'Driftslegende');
});

test('første nivåmål blir fullført ved åtte saker', () => {
  const state = { ...startGame(createGameState()), levelCases: 8, casesSolved: 8 };
  assert.equal(levelObjectiveComplete(state, 1), true);
  assert.ok(achievementCount({ ...state, casesSolved: 80, majorResolved: true }) >= 2);
});
