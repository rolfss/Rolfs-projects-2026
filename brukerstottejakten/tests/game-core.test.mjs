import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FINAL_BOSS_HITS,
  FLOW_THRESHOLD,
  ROUND_SECONDS,
  STAGES,
  TARGET_CASES,
  accuracyPercent,
  awardScore,
  comboMultiplier,
  createGameState,
  experienceAward,
  finishByTimeout,
  hitScore,
  missionStatus,
  performanceRank,
  progressPercent,
  recordEscape,
  recordQuizAnswer,
  remainingSeconds,
  resolveShot,
  shouldOfferQuiz,
  stageForCases,
  stageProgressPercent,
  startGame,
} from '../game-core.js';

test('v4 har åtte faser, førti saker og en femminuttersvakt', () => {
  assert.equal(STAGES.length, 8);
  assert.equal(TARGET_CASES, 40);
  assert.equal(FINAL_BOSS_HITS, 5);
  assert.equal(ROUND_SECONDS, 300);
});

test('fasegrensene følger progresjonen', () => {
  assert.deepEqual([0, 4, 5, 9, 10, 34, 35, 40].map(stageForCases), [1, 1, 2, 2, 3, 7, 8, 8]);
  assert.equal(stageProgressPercent(0), 0);
  assert.equal(stageProgressPercent(3), 60);
  assert.equal(stageProgressPercent(5), 0);
  assert.equal(stageProgressPercent(40), 100);
});

test('quizsannsynligheten er nøyaktig tretti prosent', () => {
  assert.equal(shouldOfferQuiz(0), true);
  assert.equal(shouldOfferQuiz(0.299999), true);
  assert.equal(shouldOfferQuiz(0.3), false);
  assert.equal(shouldOfferQuiz(0.999), false);
});

test('treff gir poeng, progresjon, presisjon og treffrekke', () => {
  const state = startGame(createGameState(), 1_000);
  const result = resolveShot(state, { hit: true, kind: 'priority', precision: 0.9, randomValue: 0.9 });
  assert.equal(result.state.casesSolved, 1);
  assert.equal(result.state.hits, 1);
  assert.equal(result.state.shots, 1);
  assert.equal(result.state.streak, 1);
  assert.equal(result.state.priorityHits, 1);
  assert.equal(result.state.perfectHits, 1);
  assert.ok(result.state.score > 165);
  assert.equal(result.events.perfectHit, true);
  assert.equal(result.events.quizTriggered, false);
});

test('bom bryter rekken med mindre kombobuffer brukes', () => {
  let state = startGame(createGameState());
  state = resolveShot(state, { hit: true, randomValue: 0.9 }).state;
  state = resolveShot(state, { hit: true, randomValue: 0.9 }).state;
  const guarded = resolveShot(state, { hit: false, protectStreak: true });
  assert.equal(guarded.state.streak, 2);
  assert.equal(guarded.events.guardUsed, true);
  const missed = resolveShot(guarded.state, { hit: false });
  assert.equal(missed.state.streak, 0);
});

test('Saksflyt aktiveres og restverdien beholdes', () => {
  let state = { ...startGame(createGameState()), flow: FLOW_THRESHOLD - 5, streak: 5 };
  const result = resolveShot(state, { hit: true, precision: 1, flowMultiplier: 1.5, randomValue: 0.9 });
  assert.equal(result.events.flowActivated, true);
  assert.equal(result.state.flowActivations, 1);
  assert.ok(result.state.flow >= 0 && result.state.flow < FLOW_THRESHOLD);
});

test('skjold stopper eskalering uten å nullstille rekken', () => {
  const state = { ...startGame(createGameState()), streak: 4, flow: 60 };
  const shielded = recordEscape(state, { shielded: true });
  assert.equal(shielded.escalations, 0);
  assert.equal(shielded.streak, 4);
  assert.equal(shielded.shieldsUsed, 1);
  const normal = recordEscape(shielded);
  assert.equal(normal.escalations, 1);
  assert.equal(normal.streak, 0);
});

test('Noark-svar gir bonus eller trekk, aldri negativ score', () => {
  let state = startGame(createGameState());
  state = recordQuizAnswer(state, false, { penalty: 500 });
  assert.equal(state.score, 0);
  state = recordQuizAnswer(state, true, { reward: 430 });
  assert.equal(state.score, 430);
  assert.equal(state.quizCorrect, 1);
  assert.equal(state.quizAnswered, 2);
});

test('førti treff gir seier selv med spørsmål og bom', () => {
  let state = startGame(createGameState(), 2_000);
  state = recordQuizAnswer(state, false);
  state = resolveShot(state, { hit: false }).state;
  for (let index = 0; index < TARGET_CASES; index += 1) {
    state = resolveShot(state, {
      hit: true,
      kind: index >= TARGET_CASES - FINAL_BOSS_HITS ? 'critical' : 'normal',
      bossHit: index >= TARGET_CASES - FINAL_BOSS_HITS,
      randomValue: 0.99,
      now: 42_000,
    }).state;
  }
  assert.equal(state.status, 'won');
  assert.equal(state.casesSolved, TARGET_CASES);
  assert.equal(state.bossHits, FINAL_BOSS_HITS);
  assert.equal(state.finishedAt, 42_000);
  assert.equal(progressPercent(state.casesSolved), 100);
});

test('tidsavbrudd avslutter en uferdig vakt', () => {
  const state = startGame(createGameState(), 1_000);
  assert.equal(remainingSeconds(state, 11_000), 290);
  assert.equal(remainingSeconds(state, 401_000), 0);
  const timedOut = finishByTimeout(state, 301_000);
  assert.equal(timedOut.status, 'timeout');
  assert.equal(timedOut.finishedAt, 301_000);
});

test('poengberegningen belønner måltype, presisjon og rekke', () => {
  const plain = hitScore({ kind: 'normal', streak: 1, precision: 0 });
  const skilled = hitScore({ kind: 'priority', streak: 8, precision: 1, scoreMultiplier: 1.2, perfectMultiplier: 2 });
  assert.equal(plain, 100);
  assert.ok(skilled > plain * 3);
  assert.ok(comboMultiplier(99) <= 2.25);
});

test('oppdrag rapporterer progresjon og fullføring', () => {
  let state = { ...startGame(createGameState()), casesSolved: 12, bestStreak: 8, shots: 20, hits: 18, quizCorrect: 3 };
  assert.equal(missionStatus(state, 'queue').complete, true);
  assert.equal(missionStatus(state, 'streak').current, 8);
  assert.equal(missionStatus(state, 'precision').complete, true);
  assert.equal(missionStatus(state, 'noark').complete, true);
});

test('rangering og erfaring skalerer med resultatet', () => {
  const strong = {
    ...createGameState(),
    status: 'won',
    casesSolved: 40,
    score: 10_600,
    hits: 40,
    shots: 44,
    escalations: 1,
    quizCorrect: 3,
    bestStreak: 12,
    flowActivations: 3,
    bossHits: 5,
  };
  const rank = performanceRank(strong, ['queue', 'streak', 'noark']);
  assert.equal(rank.grade, 'SS');
  assert.ok(experienceAward(strong, ['queue', 'streak', 'noark']) > 500);
  const bonus = awardScore(strong, 500, 'mission');
  assert.equal(bonus.score, strong.score + 500);
  assert.equal(bonus.missionScore, 500);
  assert.equal(Math.round(accuracyPercent(strong)), 91);
});
