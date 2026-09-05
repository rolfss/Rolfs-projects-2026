import { MISSION_CATALOG } from './game-core.js';

export const CAREER_LEVELS = Object.freeze([
  Object.freeze({ level: 1, xp: 0, title: 'Ny i køen' }),
  Object.freeze({ level: 2, xp: 260, title: 'Førstelinjemedarbeider' }),
  Object.freeze({ level: 3, xp: 620, title: 'Brukerstøttekonsulent' }),
  Object.freeze({ level: 4, xp: 1_080, title: 'Rådgiver' }),
  Object.freeze({ level: 5, xp: 1_650, title: 'Seniorrådgiver' }),
  Object.freeze({ level: 6, xp: 2_350, title: 'Systemforvalter' }),
  Object.freeze({ level: 7, xp: 3_200, title: 'Tjenesteansvarlig' }),
  Object.freeze({ level: 8, xp: 4_200, title: 'Produkteier' }),
  Object.freeze({ level: 9, xp: 5_350, title: 'Driftsleder' }),
  Object.freeze({ level: 10, xp: 6_700, title: 'Virksomhetsarkitekt' }),
  Object.freeze({ level: 11, xp: 8_250, title: 'Regional strateg' }),
  Object.freeze({ level: 12, xp: 10_050, title: 'Årets ansatt' }),
  Object.freeze({ level: 13, xp: 12_100, title: 'Køens vokter' }),
  Object.freeze({ level: 14, xp: 14_450, title: 'Operasjonell legende' }),
  Object.freeze({ level: 15, xp: 17_150, title: 'Myten i Service Manager' }),
]);

export const DAILY_MODIFIERS = Object.freeze([
  Object.freeze({ id: 'queue-storm', name: 'Køstorm', detail: 'Én ekstra sak kan være aktiv. +12 % poeng.', scoreMultiplier: 1.12, extraTargets: 1 }),
  Object.freeze({ id: 'priority-day', name: 'Prioritetsdag', detail: 'Flere HASTER-saker. De gir +25 % poeng.', priorityBias: 0.16, priorityMultiplier: 1.25 }),
  Object.freeze({ id: 'archive-focus', name: 'Arkivfokus', detail: 'Noark-bonus gir ekstra prestisje.', quizReward: 430 }),
  Object.freeze({ id: 'coffee-flow', name: 'Kaffeflyt', detail: 'Saksflyt fylles 25 % raskere.', flowMultiplier: 1.25 }),
  Object.freeze({ id: 'legacy-lift', name: 'Etterslepsløft', detail: 'Flere eldre saker. De gir +20 % poeng.', legacyBias: 0.18, legacyMultiplier: 1.2 }),
  Object.freeze({ id: 'precision-window', name: 'Presisjonsvindu', detail: 'Presisjonstreff gir dobbelt bonus.', perfectMultiplier: 2 }),
]);

export const PERK_CATALOG = Object.freeze({
  search: Object.freeze({ id: 'search', name: 'Smart søk', icon: 'SØK', detail: 'Treffsonen blir 24 % større.', effect: 'hitbox' }),
  coffee: Object.freeze({ id: 'coffee', name: 'Kaffekick', icon: 'KOFF', detail: 'Saksflyt fylles 35 % raskere og varer lenger.', effect: 'flow' }),
  priority: Object.freeze({ id: 'priority', name: 'Tydelig prioritering', icon: 'P1', detail: 'HASTER- og hovedhendelser gir 40 % mer poeng.', effect: 'priority' }),
  knowledge: Object.freeze({ id: 'knowledge', name: 'Kunnskapsbase', icon: 'KB', detail: 'Riktige Noark-svar gir større bonus og åtte sekunder flyt.', effect: 'quiz' }),
  shield: Object.freeze({ id: 'shield', name: 'SLA-skjold', icon: 'SLA', detail: 'De neste tre eskaleringene blir stoppet.', effect: 'shield' }),
  buffer: Object.freeze({ id: 'buffer', name: 'Kombobuffer', icon: 'BUF', detail: 'To bom kan absorberes uten å bryte treffrekken.', effect: 'combo' }),
  automation: Object.freeze({ id: 'automation', name: 'Automatisering', icon: 'AUTO', detail: 'Hvert femte treff gir en automatisk bonuslukking.', effect: 'automation' }),
  stabilizer: Object.freeze({ id: 'stabilizer', name: 'Driftsstabilisator', icon: 'STAB', detail: 'Hovedhendelsen beveger seg saktere og tåler bedre sikting.', effect: 'boss' }),
});

export function hashString32(value) {
  const text = String(value ?? '');
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createSeededRandom(seed) {
  let value = Number(seed) >>> 0;
  return function seededRandom() {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function dateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dailySeed(date = new Date()) {
  return hashString32(`brukerstottejakten:${dateKey(date)}`);
}

export function dailyModifier(seed) {
  return DAILY_MODIFIERS[Math.abs(Number(seed) || 0) % DAILY_MODIFIERS.length];
}

export function selectMissionIds(seed, count = 3) {
  const rng = createSeededRandom(seed ^ 0x9E3779B9);
  const groups = [
    ['queue', 'control'],
    ['streak', 'perfect', 'precision'],
    ['noark', 'flow', 'priority'],
  ];
  const selected = groups.map((group) => group[Math.floor(rng() * group.length)]);
  const all = Object.keys(MISSION_CATALOG);
  while (selected.length < count) {
    const candidate = all[Math.floor(rng() * all.length)];
    if (!selected.includes(candidate)) selected.push(candidate);
  }
  return selected.slice(0, count);
}

export function selectPerkChoices(seed, selectionIndex = 0, owned = [], count = 3) {
  const rng = createSeededRandom((Number(seed) >>> 0) ^ Math.imul(selectionIndex + 1, 0x85EBCA6B));
  const available = Object.values(PERK_CATALOG).filter((perk) => !owned.includes(perk.id));
  for (let index = available.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    [available[index], available[swap]] = [available[swap], available[index]];
  }
  return available.slice(0, count);
}

export function createDefaultProfile(name = '') {
  return {
    name: sanitizeName(name),
    xp: 0,
    plays: 0,
    wins: 0,
    bestScore: 0,
    bestGrade: 'D',
    streak: 0,
    lastPlayed: '',
    badges: [],
  };
}

export function sanitizeName(name) {
  return String(name ?? '').trim().replace(/\s+/g, ' ').slice(0, 18);
}

export function careerForXp(xp) {
  const value = Math.max(0, Math.round(Number(xp) || 0));
  let current = CAREER_LEVELS[0];
  for (const level of CAREER_LEVELS) {
    if (value >= level.xp) current = level;
    else break;
  }
  const next = CAREER_LEVELS[current.level] || null;
  const span = next ? Math.max(1, next.xp - current.xp) : 1;
  const progress = next ? Math.min(100, ((value - current.xp) / span) * 100) : 100;
  return { ...current, next, progress, xp: value, xpIntoLevel: value - current.xp, xpToNext: next ? next.xp - value : 0 };
}

export function dayDistance(fromKey, toKey) {
  const from = new Date(`${fromKey}T12:00:00`);
  const to = new Date(`${toKey}T12:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return Number.POSITIVE_INFINITY;
  return Math.round((to - from) / 86_400_000);
}

const gradeWeight = Object.freeze({ SS: 6, S: 5, A: 4, B: 3, C: 2, D: 1 });

export function applySessionToProfile(profileInput, session) {
  const profile = { ...createDefaultProfile(), ...(profileInput || {}) };
  const today = session.dateKey || dateKey();
  const distance = profile.lastPlayed ? dayDistance(profile.lastPlayed, today) : Number.POSITIVE_INFINITY;
  const streak = distance === 0 ? profile.streak : distance === 1 ? profile.streak + 1 : 1;
  const grade = session.grade || 'D';
  const badges = new Set(profile.badges || []);
  for (const badge of session.badges || []) badges.add(badge);
  if (session.won) badges.add('null-restanse');
  if (grade === 'SS') badges.add('ss-rang');
  if (streak >= 3) badges.add('tre-dager');
  if (session.daily) badges.add('dagens-ko');

  return {
    ...profile,
    name: sanitizeName(session.name ?? profile.name),
    xp: Math.max(0, Math.round(profile.xp + (session.xp || 0))),
    plays: profile.plays + 1,
    wins: profile.wins + (session.won ? 1 : 0),
    bestScore: Math.max(profile.bestScore || 0, session.score || 0),
    bestGrade: gradeWeight[grade] > gradeWeight[profile.bestGrade] ? grade : profile.bestGrade,
    streak,
    lastPlayed: today,
    badges: [...badges],
  };
}

function encodeUtf8(value) {
  if (typeof btoa === 'function') {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  }
  return Buffer.from(value, 'utf8').toString('base64');
}

function decodeUtf8(value) {
  if (typeof atob === 'function') {
    const binary = atob(value);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  return Buffer.from(value, 'base64').toString('utf8');
}

export function resultCode(seed, score, grade = 'D') {
  const hash = hashString32(`${seed}:${score}:${grade}`);
  return `${grade}-${hash.toString(36).toUpperCase().padStart(7, '0').slice(-7)}`;
}

export function encodeDuel({ seed, score, name = '', grade = 'D', code = '' }) {
  const payload = {
    v: 1,
    s: Number(seed) >>> 0,
    p: Math.max(0, Math.round(Number(score) || 0)),
    n: sanitizeName(name),
    g: String(grade).slice(0, 2),
    c: String(code || resultCode(seed, score, grade)).slice(0, 12),
  };
  return encodeUtf8(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function decodeDuel(token) {
  if (!token || String(token).length > 280) return null;
  try {
    const normalized = String(token).replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const payload = JSON.parse(decodeUtf8(padded));
    if (payload?.v !== 1 || !Number.isFinite(payload.s) || !Number.isFinite(payload.p)) return null;
    return {
      seed: Number(payload.s) >>> 0,
      score: Math.max(0, Math.min(999_999, Math.round(payload.p))),
      name: sanitizeName(payload.n),
      grade: String(payload.g || 'D').slice(0, 2),
      code: String(payload.c || '').slice(0, 12),
    };
  } catch {
    return null;
  }
}

export function sortLeaderboard(entries, limit = 5) {
  return [...(entries || [])]
    .filter((entry) => Number.isFinite(entry?.score))
    .sort((a, b) => b.score - a.score || (b.cases || 0) - (a.cases || 0) || (a.seconds || 9999) - (b.seconds || 9999))
    .slice(0, limit);
}
