import { FLOW_MAX } from './game-core.js';

export const PULSE_DAMAGE = 3;
export const PULSE_RECHARGE_MS = 5_000;
export const FRUIT = Object.freeze({
  orange: Object.freeze({ name: 'Appelsin', color: '#ffad38', flesh: '#ffe399', score: 250, relief: 12, flow: 0, label: 'KØ −12' }),
  melon: Object.freeze({ name: 'Vannmelon', color: '#59c980', flesh: '#ff7180', score: 150, relief: 0, flow: 30, label: 'FLYT +30' }),
  pineapple: Object.freeze({ name: 'Ananas', color: '#e9c448', flesh: '#fff0a0', score: 200, relief: 0, flow: 0, label: 'PULS KLAR' }),
});

// Fruit is an optional bonus, not a support case, quiz roll or combo shortcut.
export function recordFruit(state, kind) {
  const fruit = FRUIT[kind];
  if (state.status !== 'running' || !fruit) return { state, collected: false };
  const accumulatedFlow = state.flow + fruit.flow;
  const flowActivated = accumulatedFlow >= FLOW_MAX;
  return {
    state: {
      ...state,
      score: state.score + fruit.score,
      queuePressure: Math.max(0, state.queuePressure - fruit.relief),
      flow: accumulatedFlow % FLOW_MAX,
      flowActivations: state.flowActivations + (flowActivated ? 1 : 0),
    },
    collected: true,
    flowActivated,
    rechargePulse: kind === 'pineapple',
    message: `${fruit.name}! +${fruit.score} poeng · ${fruit.label}`,
  };
}

export function fruitScreen(fruit, width, height) {
  const radius = Math.max(14, Math.min(25, height * .034));
  return { x: fruit.x * width, y: height * (.715 + fruit.lane * .035), radius };
}

export function hitFruit(fruits, x, y, width, height) {
  return [...fruits].reverse().find(fruit => {
    if (fruit.dead || fruit.resolving) return false;
    const screen = fruitScreen(fruit, width, height);
    return Math.hypot(x - screen.x, y - screen.y) <= screen.radius + 8;
  }) || null;
}
