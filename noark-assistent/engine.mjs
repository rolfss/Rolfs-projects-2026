import { INTENTS, RECORDS, SOURCES } from "./data.mjs";

const STOP_WORDS = new Set([
  "a", "av", "at", "de", "den", "det", "du", "en", "er", "et", "for", "fra",
  "har", "hva", "hvilke", "hvordan", "i", "ikke", "kan", "med", "må", "naar",
  "noe", "og", "om", "pa", "paa", "på", "skal", "som", "til", "ved", "vi", "vil",
  "være", "eller", "etter", "gjør", "gjore", "seg", "sin", "sine", "dette",
  "hvor", "mange", "hvem", "hvilken", "hvilket", "bor", "fortsatt", "krever",
]);

const SYNONYM_GROUPS = [
  ["obligatorisk", "paabudt", "påbudt", "krav", "pliktig", "maa", "må"],
  ["frivillig", "valgfri", "valgfritt"],
  ["kassasjon", "sletting", "slette", "destruksjon", "rydde"],
  ["bevaring", "langtidsbevaring", "oppbevaring", "bevare"],
  ["uttrekk", "eksport", "avlevering", "avleveringsuttrekk", "datauttrekk"],
  ["migrering", "systembytte", "konvertering", "overfoering", "overføring"],
  ["integrasjon", "grensesnitt", "api", "tjenestegrensesnitt", "arkivkjerne"],
  ["fagsystem", "produksjonssystem", "forsystem", "informasjonssystem"],
  ["journal", "journalfoering", "journalføring", "postliste", "postjournal"],
  ["soek", "søk", "gjenfinning", "finne", "oppslag"],
  ["innsyn", "offentlighet", "tilgang", "partsinnsyn"],
  ["tilgangsstyring", "autorisasjon", "rettighet", "rolle", "roller"],
  ["endringslogg", "revisjonsspor", "sporbarhet", "logging", "historikk"],
  ["metadata", "kontekst", "sammenheng", "opphav", "proveniens"],
  ["fangst", "dokumentfangst", "arkivering", "frys"],
  ["sak", "saksmappe", "mappe"],
  ["journalpost", "registrering", "dokumentregistrering"],
  ["arkivformat", "filformat", "format"],
  ["skjerming", "taushetsplikt", "tilgangskode", "offentligTittel"],
  ["klassifikasjon", "klassifikasjonssystem", "klasse", "ordningsprinsipp"],
];

const SOURCE_BY_ID = new Map(SOURCES.map((source) => [source.id, source]));
const RECORD_BY_ID = new Map(RECORDS.map((record) => [record.id, record]));

export function normalize(value = "") {
  return String(value)
    .replaceAll("§", " paragraf ")
    .replaceAll("æ", "ae")
    .replaceAll("Æ", "Ae")
    .replaceAll("ø", "o")
    .replaceAll("Ø", "O")
    .replaceAll("å", "a")
    .replaceAll("Å", "A")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const NORMALIZED_STOP_WORDS = new Set([...STOP_WORDS].map((word) => normalize(word)));

export function tokenize(value = "", { keepStopWords = false } = {}) {
  const tokens = normalize(value).match(/[a-z0-9]+(?:[.-][a-z0-9]+)*/g) ?? [];
  return tokens.filter((token) => token.length > 1 && (keepStopWords || !NORMALIZED_STOP_WORDS.has(token)));
}

const SYNONYM_MAP = (() => {
  const map = new Map();
  for (const rawGroup of SYNONYM_GROUPS) {
    const group = [...new Set(rawGroup.flatMap((term) => tokenize(term, { keepStopWords: true })))];
    for (const term of group) map.set(term, group);
  }
  return map;
})();

function expandTokens(tokens) {
  const expanded = new Map();
  for (const token of tokens) {
    expanded.set(token, Math.max(expanded.get(token) ?? 0, 1));
    for (const synonym of SYNONYM_MAP.get(token) ?? []) {
      expanded.set(synonym, Math.max(expanded.get(synonym) ?? 0, synonym === token ? 1 : 0.42));
    }
  }
  return expanded;
}

function weightedTokens(record) {
  const values = [
    [record.title, 4],
    [record.requirement ?? "", 5],
    [record.tags.join(" "), 3.2],
    [record.section, 2.2],
    [record.topic, 2.2],
    [record.summary, 1.5],
    [record.detail, 1],
    [SOURCE_BY_ID.get(record.source)?.title ?? "", 0.65],
  ];

  const frequencies = new Map();
  let length = 0;
  for (const [value, weight] of values) {
    for (const token of tokenize(value, { keepStopWords: true })) {
      frequencies.set(token, (frequencies.get(token) ?? 0) + weight);
      length += weight;
    }
  }
  return { frequencies, length };
}

const INDEX = RECORDS.map((record) => {
  const { frequencies, length } = weightedTokens(record);
  return {
    record,
    frequencies,
    length,
    normalizedText: normalize([
      record.title,
      record.requirement,
      record.section,
      record.topic,
      record.tags.join(" "),
      record.summary,
      record.detail,
    ].filter(Boolean).join(" ")),
  };
});

const AVERAGE_LENGTH = INDEX.reduce((sum, item) => sum + item.length, 0) / Math.max(INDEX.length, 1);
const DOCUMENT_FREQUENCY = (() => {
  const frequency = new Map();
  for (const item of INDEX) {
    for (const token of item.frequencies.keys()) {
      frequency.set(token, (frequency.get(token) ?? 0) + 1);
    }
  }
  return frequency;
})();

function bm25(item, queryTerms) {
  const k1 = 1.35;
  const b = 0.7;
  let score = 0;

  for (const [token, queryWeight] of queryTerms) {
    const termFrequency = item.frequencies.get(token) ?? 0;
    if (!termFrequency) continue;
    const documentFrequency = DOCUMENT_FREQUENCY.get(token) ?? 0;
    const inverseDocumentFrequency = Math.log(1 + ((INDEX.length - documentFrequency + 0.5) / (documentFrequency + 0.5)));
    const denominator = termFrequency + k1 * (1 - b + b * (item.length / AVERAGE_LENGTH));
    score += queryWeight * inverseDocumentFrequency * ((termFrequency * (k1 + 1)) / denominator);
  }
  return score;
}

function requirementNumberSet(value = "") {
  const text = String(value).replace(/[–—]/g, "-");
  const numbers = new Set(text.match(/\d+\.\d+/g) ?? []);
  for (const match of text.matchAll(/(\d+)\.(\d+)\s*-\s*(?:(\d+)\.)?(\d+)/g)) {
    const startChapter = Number(match[1]);
    const startNumber = Number(match[2]);
    const endChapter = Number(match[3] ?? match[1]);
    const endNumber = Number(match[4]);
    if (startChapter !== endChapter || endNumber < startNumber || endNumber - startNumber > 100) continue;
    for (let number = startNumber; number <= endNumber; number += 1) numbers.add(`${startChapter}.${number}`);
  }
  return numbers;
}

function exactBoost(item, normalizedQuery, rawTokens) {
  let boost = 0;
  if (normalizedQuery.length >= 5 && item.normalizedText.includes(normalizedQuery)) boost += 7;
  const requirement = normalize(item.record.requirement ?? "");
  if (requirement && normalizedQuery.includes(requirement)) boost += 9;
  const queryRequirementNumbers = new Set(normalizedQuery.match(/\d+\.\d+/g) ?? []);
  if ([...queryRequirementNumbers].some((number) => requirementNumberSet(item.record.requirement).has(number))) boost += 24;
  const title = normalize(item.record.title);
  if (title && normalizedQuery.includes(title)) boost += 5;

  const directMatches = rawTokens.filter((token) => item.frequencies.has(token)).length;
  if (rawTokens.length > 1 && directMatches === rawTokens.length) boost += 2.5;
  return boost;
}

function matchesFilters(record, { topic = "Alle", source = "Alle", requirementType = "Alle" } = {}) {
  if (topic && topic !== "Alle" && record.topic !== topic) return false;
  if (source && source !== "Alle" && record.source !== source) return false;
  if (requirementType && requirementType !== "Alle" && record.requirementType !== requirementType) return false;
  return true;
}

export function searchRecords(query, options = {}) {
  const rawTokens = tokenize(query);
  if (!rawTokens.length) return [];
  const queryTerms = expandTokens(rawTokens);
  const normalizedQuery = normalize(query);
  const limit = Math.min(Math.max(Number(options.limit) || 8, 1), 50);

  const scored = [];
  for (const item of INDEX) {
    if (!matchesFilters(item.record, options)) continue;
    let score = bm25(item, queryTerms) + exactBoost(item, normalizedQuery, rawTokens);
    if (normalize(item.record.topic) === normalizedQuery) score += 5;
    if (score <= 0) continue;
    const directTerms = rawTokens.filter((token) => item.frequencies.has(token));
    scored.push({ record: item.record, score, directTerms });
  }

  scored.sort((a, b) => b.score - a.score || a.record.title.localeCompare(b.record.title, "nb"));
  return scored.map((item) => ({
    ...item,
    relevance: estimateRelevance(item, rawTokens),
    relevanceMethod: "lexical",
    relevanceReason: "Anslag fra orddekning, synonymer og konkrete kravtreff i kildeposten.",
    source: getSource(item.record.source),
    url: sourceUrl(item.record),
  })).sort((a, b) => b.relevance - a.relevance || b.score - a.score)
    .slice(0, limit).map((item, index) => ({ ...item, rank: index + 1 }));
}

// Query-specific heuristic, not a probability or normalization to the top hit.
function estimateRelevance(result, rawTokens) {
  const indexed = INDEX.find(({ record }) => record.id === result.record.id);
  const terms = [...new Set(rawTokens)];
  if (!indexed || !terms.length) return 0;
  let covered = 0;
  let total = 0;
  for (const token of terms) {
    const weight = Math.log(1 + INDEX.length / (1 + (DOCUMENT_FREQUENCY.get(token) ?? 0)));
    total += weight;
    if (indexed.frequencies.has(token) || requirementNumberSet(result.record.requirement).has(token)) covered += weight;
    else if ((SYNONYM_MAP.get(token) ?? []).some((term) => indexed.frequencies.has(term))) covered += 0.55 * weight;
  }
  const coverage = covered / Math.max(total, 1);
  const strength = 1 - Math.exp(-Math.max(0, result.score) / 14);
  return Math.max(0, Math.min(99, Math.round(100 * coverage * (0.7 + 0.3 * strength))));
}

function intentScore(intent, normalizedQuery) {
  let best = 0;
  for (const pattern of intent.patterns) {
    const normalizedPattern = normalize(pattern);
    if (!normalizedPattern) continue;
    if (normalizedQuery.includes(normalizedPattern)) {
      best = Math.max(best, normalizedPattern.split(" ").length * 10 + normalizedPattern.length / 10);
    }
  }
  return best;
}

export function findIntent(query) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return null;
  const ranked = INTENTS
    .map((intent) => ({ intent, score: intentScore(intent, normalizedQuery) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.intent ?? null;
}

function intentResults(intent, query, options) {
  const rankQuery = intent.id === "requirement-types" ? `${query} obligatorisk betinget valgfritt kravtyper` : query;
  const ranked = searchRecords(rankQuery, { ...options, limit: 50 });
  const byId = new Map(ranked.map((result) => [result.record.id, result]));
  const selected = [];
  const seen = new Set();
  // Curated intents widen candidate recall; they never manufacture a percentage.
  for (const id of intent.recordIds) {
    const record = RECORD_BY_ID.get(id);
    if (!record || !matchesFilters(record, options)) continue;
    const result = byId.get(id) ?? {
      record, score: 0, directTerms: [], relevance: 0,
      relevanceMethod: "lexical", relevanceReason: "Tematisk kandidat uten direkte ordtreff.",
      source: getSource(record.source), url: sourceUrl(record),
    };
    selected.push(result);
    seen.add(id);
  }
  for (const result of ranked) {
    if (!seen.has(result.record.id)) selected.push(result);
    seen.add(result.record.id);
    if (selected.length >= (Number(options.limit) || 8)) break;
  }
  return selected.slice(0, Number(options.limit) || 8)
    .sort((a, b) => b.relevance - a.relevance || b.score - a.score)
    .map((result, index) => ({ ...result, rank: index + 1 }));
}

function confidenceFor(results) {
  const score = results[0]?.relevance ?? 0;
  if (score >= 75) return { level: "høy", label: "Godt søketreff", score };
  if (score >= 40) return { level: "middels", label: "Delvis kildedekning", score };
  return { level: "lav", label: "Svakt søketreff", score };
}

function uniquePoints(results, lead, count = 3) {
  const normalizedLead = normalize(lead);
  const points = [];
  const seen = new Set();
  for (const result of results) {
    const text = result.record.summary;
    const normalizedText = normalize(text);
    if (!normalizedText || normalizedLead.includes(normalizedText) || seen.has(normalizedText)) continue;
    seen.add(normalizedText);
    points.push({ text, citation: result.rank, recordId: result.record.id });
    if (points.length >= count) break;
  }
  return points;
}

export function answerQuestion(query, options = {}) {
  const cleanQuery = String(query ?? "").trim();
  if (cleanQuery.length < 2) {
    return {
      status: "empty",
      query: cleanQuery,
      lead: "Skriv et spørsmål om Noark 5 eller arkivregelverket.",
      points: [],
      results: [],
      confidence: { level: "lav", label: "Ingen søk", score: 0 },
    };
  }

  const intent = findIntent(cleanQuery);
  const results = intent
    ? intentResults(intent, cleanQuery, { ...options, limit: options.limit ?? 8 })
    : searchRecords(cleanQuery, { ...options, limit: options.limit ?? 8 });
  const confidence = confidenceFor(results, intent);

  if (!results.length || (!intent && results[0].score < 1.15)) {
    return {
      status: "insufficient",
      query: cleanQuery,
      lead: "Jeg fant ikke sikkert nok grunnlag i kildebasen til å gi et presist svar.",
      points: [],
      results: results.slice(0, 4),
      confidence,
      guidance: "Prøv et mer konkret begrep, et kravnummer eller et metadataelement. Åpne originalkilden ved tvil.",
    };
  }

  const lead = intent?.lead ?? results[0].record.summary;
  return {
    status: "ok",
    query: cleanQuery,
    lead,
    leadCitation: intent ? (results.find((r) => r.record.id === intent.recordIds[0])?.rank ?? 1) : 1,
    points: uniquePoints(results, lead, options.pointCount ?? 3),
    results,
    confidence,
    intent: intent?.id ?? null,
    guidance: confidence.level === "lav"
      ? "Treffene er svake. Kontroller originalkildene før du bygger beslutninger på svaret."
      : "Svaret er satt sammen lokalt fra de viste kildepostene. Kontroller originalkilden ved juridiske eller operative beslutninger.",
  };
}

export function getSource(id) {
  return SOURCE_BY_ID.get(id) ?? null;
}

export function getRecord(id) {
  return RECORD_BY_ID.get(id) ?? null;
}

export function sourceUrl(record) {
  const source = getSource(record.source);
  if (!source) return "#";
  if (record.page && /\.pdf(?:$|\?)/i.test(source.url)) return `${source.url}#page=${record.page}`;
  return source.url;
}

export function formatLocation(record) {
  const parts = [];
  if (record.section) parts.push(record.section);
  if (record.page) parts.push(`side ${record.page}`);
  if (record.requirement) parts.push(`krav ${record.requirement}`);
  return parts.join(" · ");
}

export function listRecords(options = {}) {
  return RECORDS
    .filter((record) => matchesFilters(record, options))
    .map((record) => ({ record, source: getSource(record.source), url: sourceUrl(record) }));
}

export function corpusStats() {
  return {
    records: RECORDS.length,
    sources: SOURCES.length,
    requirements: RECORDS.filter((record) => record.requirement).length,
    topics: new Set(RECORDS.map((record) => record.topic)).size,
  };
}

export function topicCounts() {
  const counts = new Map();
  for (const record of RECORDS) counts.set(record.topic, (counts.get(record.topic) ?? 0) + 1);
  return counts;
}

export function requirementTypeLabel(type) {
  return ({ O: "Obligatorisk", B: "Betinget obligatorisk", V: "Valgfritt", M: "Blandede kravtyper" })[type] ?? "Ikke angitt";
}
