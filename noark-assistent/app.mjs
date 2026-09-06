import {
  BUILD_INFO,
  RECORDS,
  SOURCES,
  SUGGESTED_QUESTIONS,
  TOPICS,
} from "./data.mjs";
import {
  answerQuestion,
  corpusStats,
  formatLocation,
  listRecords,
  requirementTypeLabel,
  searchRecords,
  sourceUrl,
} from "./engine.mjs";
import { buildDecisionNote } from "./decision-note.mjs";

const HISTORY_KEY = "noark-assistent-history-v1";
const MAX_HISTORY = 8;
const LIBRARY_PAGE_SIZE = 18;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const state = {
  latestAnswer: null,
  libraryLimit: LIBRARY_PAGE_SIZE,
  libraryResults: [],
};

function element(tag, options = {}) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.attrs) {
    for (const [name, value] of Object.entries(options.attrs)) {
      if (value !== null && value !== undefined) node.setAttribute(name, String(value));
    }
  }
  return node;
}

function appendText(parent, text) {
  parent.append(document.createTextNode(text));
}

function formatCorpusDate(value) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { toast.hidden = true; }, 2300);
}

function setStatus(label, busy = false) {
  const status = $(".status-dot");
  status.lastChild.textContent = label;
  status.classList.toggle("is-busy", busy);
}

function citationButton(rank, label = `[${rank}]`) {
  return element("button", {
    className: "citation-button",
    text: label,
    attrs: { type: "button", "data-citation": rank, "aria-label": `Vis kilde ${rank}` },
  });
}

function activateCitation(rank) {
  const card = $(`.evidence-item[data-rank="${rank}"]`);
  if (!card) return;
  $$(".evidence-item.is-active").forEach((item) => item.classList.remove("is-active"));
  card.classList.add("is-active");
  card.scrollIntoView({ behavior: "smooth", block: "nearest" });
  setTimeout(() => card.classList.remove("is-active"), 2200);
}

function renderStats() {
  const stats = corpusStats();
  $("#stat-records").textContent = String(stats.records);
  $("#stat-sources").textContent = String(stats.sources);
  $("#stat-requirements").textContent = String(stats.requirements);
  $("#app-version").textContent = BUILD_INFO.version;
  const date = $("#corpus-date");
  date.dateTime = BUILD_INFO.corpusVersion;
  date.textContent = formatCorpusDate(BUILD_INFO.corpusVersion);
}

function renderSuggestions() {
  const container = $("#suggestion-list");
  container.replaceChildren(...SUGGESTED_QUESTIONS.map((question) => element("button", {
    className: "suggestion-button",
    text: question,
    attrs: { type: "button", "data-question": question },
  })));
}

function userMessage(question) {
  const article = element("article", { className: "message user-message" });
  article.append(
    element("div", { className: "message-role", text: "Du" }),
    element("div", { className: "message-content", text: question }),
  );
  return article;
}

function assistantMessage(answer) {
  const article = element("article", { className: "message assistant-message answer-message" });
  const role = element("div", { className: "message-role", text: "Assistent" });
  const content = element("div", { className: "message-content" });

  const answerHeader = element("div", { className: "answer-header" });
  answerHeader.append(
    element("span", {
      className: `confidence confidence-${answer.confidence.level}`,
      text: `${answer.confidence.label} · ${answer.confidence.score}/100`,
      attrs: { title: "Kildedekning beregnet fra treffstyrke og direkte termtreff. Ikke en sannsynlighet for at svaret er juridisk riktig." },
    }),
    element("span", { className: "answer-mode", text: "Lokal kildesyntese" }),
  );
  content.append(answerHeader);

  const lead = element("p", { className: "answer-lead" });
  appendText(lead, answer.lead);
  if (answer.leadCitation && answer.results.length) {
    appendText(lead, " ");
    lead.append(citationButton(answer.leadCitation));
  }
  content.append(lead);

  if (answer.points.length) {
    const list = element("ul", { className: "answer-points" });
    for (const point of answer.points) {
      const item = element("li");
      appendText(item, point.text);
      appendText(item, " ");
      item.append(citationButton(point.citation));
      list.append(item);
    }
    content.append(list);
  }

  if (answer.guidance) content.append(element("p", { className: "message-note", text: answer.guidance }));

  const actions = element("div", { className: "answer-actions" });
  actions.append(
    element("button", { className: "quiet-button", text: "Kopier svar", attrs: { type: "button", "data-action": "copy-answer" } }),
    element("button", { className: "quiet-button", text: "Kopier beslutningsnotat", attrs: { type: "button", "data-action": "copy-decision-note" } }),
    element("button", { className: "quiet-button", text: "Kopier delingslenke", attrs: { type: "button", "data-action": "copy-link" } }),
  );
  content.append(actions);

  article.append(role, content);
  return article;
}

function insufficientMessage(answer) {
  const article = element("article", { className: "message assistant-message answer-message" });
  const content = element("div", { className: "message-content" });
  content.append(
    element("span", { className: "confidence confidence-lav", text: answer.confidence.label }),
    element("p", { className: "answer-lead", text: answer.lead }),
    element("p", { className: "message-note", text: answer.guidance }),
  );
  article.append(element("div", { className: "message-role", text: "Assistent" }), content);
  return article;
}

function renderEvidence(results) {
  const container = $("#evidence-list");
  const empty = $("#evidence-empty");
  const count = $("#result-count");
  container.replaceChildren();

  if (!results.length) {
    empty.hidden = false;
    count.textContent = "Ingen sikre treff";
    return;
  }

  empty.hidden = true;
  count.textContent = `${results.length} ${results.length === 1 ? "kildepost" : "kildeposter"}`;

  for (const result of results) {
    const { record, source, rank, relevance, url } = result;
    const card = element("article", {
      className: "evidence-item",
      attrs: { "data-rank": rank, id: `source-${rank}` },
    });
    const top = element("div", { className: "evidence-top" });
    top.append(
      element("span", { className: "source-number", text: String(rank) }),
      element("span", { className: "source-kind", text: source.type }),
      element("span", { className: "relevance", text: `${relevance}% treff` }),
    );

    const heading = element("h3", { text: record.title });
    const location = element("p", { className: "source-location", text: formatLocation(record) || record.topic });
    const summary = element("p", { className: "source-summary", text: record.detail });
    const sourceLine = element("p", { className: "source-name" });
    sourceLine.append(element("strong", { text: source.shortTitle }), document.createTextNode(` · ${source.publisher}`));

    const footer = element("div", { className: "source-footer" });
    const bar = element("span", { className: "relevance-bar", attrs: { "aria-hidden": "true" } });
    bar.style.setProperty("--relevance", `${relevance}%`);
    const link = element("a", {
      className: "source-link",
      text: "Åpne originalkilden ↗",
      attrs: { href: url, target: "_blank", rel: "noreferrer" },
    });
    footer.append(bar, link);
    card.append(top, heading, location, summary, sourceLine, footer);
    container.append(card);
  }
}

function plainTextAnswer(answer) {
  const lines = [
    `Spørsmål: ${answer.query}`,
    "",
    `${answer.lead}${answer.leadCitation ? ` [${answer.leadCitation}]` : ""}`,
  ];
  for (const point of answer.points) lines.push(`- ${point.text} [${point.citation}]`);
  lines.push("", "Kilder:");
  for (const result of answer.results) {
    lines.push(`[${result.rank}] ${result.source.title} — ${formatLocation(result.record) || result.record.topic}`);
    lines.push(result.url);
  }
  lines.push("", "Fagstøtte: kontroller originalkildene før beslutninger.");
  return lines.join("\n");
}

async function copyText(text, message) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = element("textarea", { text });
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
  showToast(message);
}

function shareUrl(question) {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("q", question);
  return url.toString();
}

function readHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string").slice(0, MAX_HISTORY) : [];
  } catch {
    return [];
  }
}

function saveHistory(question) {
  const normalized = question.trim();
  const history = [normalized, ...readHistory().filter((item) => item.toLowerCase() !== normalized.toLowerCase())].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  const history = readHistory();
  const section = $("#history-section");
  const list = $("#history-list");
  section.hidden = history.length === 0;
  list.replaceChildren(...history.map((question) => element("button", {
    className: "history-button",
    text: question,
    attrs: { type: "button", "data-question": question },
  })));
}

async function runQuestion(question, { save = true, updateUrl = true } = {}) {
  const clean = String(question ?? "").trim();
  if (!clean) return;
  const conversation = $("#conversation");
  conversation.append(userMessage(clean));
  setStatus("Søker", true);
  $("#question").value = "";
  await new Promise((resolve) => setTimeout(resolve, 55));

  const answer = answerQuestion(clean, { limit: 8, pointCount: 3 });
  state.latestAnswer = answer;
  conversation.append(answer.status === "ok" ? assistantMessage(answer) : insufficientMessage(answer));
  renderEvidence(answer.results);
  setStatus("Klar", false);
  if (save) saveHistory(clean);
  if (updateUrl) {
    const url = new URL(window.location.href);
    url.searchParams.set("q", clean);
    history.replaceState(null, "", url);
  }
  conversation.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function resetConversation() {
  const conversation = $("#conversation");
  conversation.replaceChildren();
  const welcome = element("article", { className: "message assistant-message" });
  const content = element("div", { className: "message-content" });
  content.append(
    element("p", { text: "Samtalen er nullstilt. Still et nytt spørsmål, eller velg en av problemstillingene over." }),
    element("p", { className: "message-note", text: "All behandling skjer lokalt i nettleseren." }),
  );
  welcome.append(element("div", { className: "message-role", text: "Assistent" }), content);
  conversation.append(welcome);
  state.latestAnswer = null;
  $("#evidence-list").replaceChildren();
  $("#evidence-empty").hidden = false;
  $("#result-count").textContent = "Ingen søk";
  const url = new URL(window.location.href);
  url.searchParams.delete("q");
  history.replaceState(null, "", url);
}

function setActiveTab(name, { updateHash = true } = {}) {
  $$(".tab-button").forEach((button) => {
    const active = button.dataset.tab === name;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });
  $$(".tab-panel").forEach((panel) => { panel.hidden = panel.dataset.panel !== name; });
  if (updateHash) history.replaceState(null, "", `${window.location.pathname}${window.location.search}${name === "chat" ? "" : `#${name}`}`);
  if (name === "library") renderLibrary();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function populateLibraryTopics() {
  const select = $("#library-topic");
  select.replaceChildren(...TOPICS.map((topic) => element("option", { text: topic, attrs: { value: topic } })));
}

function currentLibraryResults() {
  const query = $("#library-query").value.trim();
  const topic = $("#library-topic").value || "Alle";
  const requirementType = $("#library-type").value || "Alle";
  if (query) return searchRecords(query, { topic, requirementType, limit: 50 });
  return listRecords({ topic, requirementType }).map((item, index) => ({ ...item, rank: index + 1, relevance: 100 }));
}

function libraryCard(result) {
  const { record, source, url } = result;
  const card = element("article", { className: "library-item" });
  const meta = element("div", { className: "library-meta" });
  meta.append(element("span", { className: "topic-badge", text: record.topic }));
  if (record.requirementType) {
    meta.append(element("span", {
      className: `type-badge type-${record.requirementType.toLowerCase()}`,
      text: record.requirementType,
      attrs: { title: requirementTypeLabel(record.requirementType) },
    }));
  }
  if (record.requirement) meta.append(element("span", { className: "requirement-number", text: record.requirement }));

  const title = element("h2", { text: record.title });
  const summary = element("p", { className: "library-summary", text: record.summary });
  const detail = element("p", { className: "library-detail", text: record.detail });
  const location = element("p", { className: "library-location", text: `${source.shortTitle} · ${formatLocation(record) || record.section}` });
  const link = element("a", {
    className: "source-link",
    text: "Se originalkilden ↗",
    attrs: { href: url, target: "_blank", rel: "noreferrer" },
  });
  card.append(meta, title, summary, detail, location, link);
  return card;
}

function renderLibrary({ resetLimit = false } = {}) {
  if (resetLimit) state.libraryLimit = LIBRARY_PAGE_SIZE;
  state.libraryResults = currentLibraryResults();
  const visible = state.libraryResults.slice(0, state.libraryLimit);
  $("#library-grid").replaceChildren(...visible.map(libraryCard));
  $("#library-count").textContent = `${state.libraryResults.length} ${state.libraryResults.length === 1 ? "treff" : "treff"}`;
  const more = $("#library-more");
  more.hidden = visible.length >= state.libraryResults.length;
  more.textContent = `Vis flere (${state.libraryResults.length - visible.length})`;
  if (!visible.length) {
    const empty = element("div", { className: "library-empty" });
    empty.append(element("h2", { text: "Ingen treff" }), element("p", { text: "Prøv et annet begrep, kravnummer eller en bredere filtrering." }));
    $("#library-grid").append(empty);
  }
}

function renderSources() {
  const container = $("#source-grid");
  container.replaceChildren(...SOURCES.map((source, index) => {
    const card = element("article", { className: "source-catalog-item" });
    card.append(
      element("span", { className: "source-index", text: String(index + 1).padStart(2, "0") }),
      element("span", { className: "source-kind", text: source.type }),
      element("h2", { text: source.title }),
      element("p", { text: source.note }),
      element("p", { className: "source-publisher", text: `${source.publisher} · ${source.published}` }),
      element("a", { className: "source-link", text: "Åpne kilden ↗", attrs: { href: source.url, target: "_blank", rel: "noreferrer" } }),
    );
    return card;
  }));
}

function bindEvents() {
  $("#question-form").addEventListener("submit", (event) => {
    event.preventDefault();
    runQuestion($("#question").value);
  });
  $("#question").addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      $("#question-form").requestSubmit();
    }
  });
  document.addEventListener("click", (event) => {
    const citation = event.target.closest("[data-citation]");
    if (citation) activateCitation(Number(citation.dataset.citation));

    const question = event.target.closest("[data-question]");
    if (question) {
      setActiveTab("chat");
      runQuestion(question.dataset.question);
    }

    const tab = event.target.closest("[data-tab]");
    if (tab) setActiveTab(tab.dataset.tab);

    const action = event.target.closest("[data-action]");
    if (action?.dataset.action === "copy-answer" && state.latestAnswer) {
      copyText(plainTextAnswer(state.latestAnswer), "Svaret er kopiert");
    }
    if (action?.dataset.action === "copy-decision-note" && state.latestAnswer) {
      copyText(buildDecisionNote(state.latestAnswer), "Beslutningsnotatet er kopiert");
    }
    if (action?.dataset.action === "copy-link" && state.latestAnswer) {
      copyText(shareUrl(state.latestAnswer.query), "Delingslenken er kopiert");
    }
  });
  $("#clear-chat").addEventListener("click", resetConversation);
  $("#clear-history").addEventListener("click", () => {
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
    showToast("Historikken er slettet");
  });
  $("#library-filters").addEventListener("input", () => renderLibrary({ resetLimit: true }));
  $("#library-filters").addEventListener("change", () => renderLibrary({ resetLimit: true }));
  $("#library-filters").addEventListener("reset", () => setTimeout(() => renderLibrary({ resetLimit: true }), 0));
  $("#library-more").addEventListener("click", () => {
    state.libraryLimit += LIBRARY_PAGE_SIZE;
    renderLibrary();
  });
  window.addEventListener("hashchange", () => {
    const name = window.location.hash.slice(1);
    if (["library", "sources"].includes(name)) setActiveTab(name, { updateHash: false });
  });
}

function initialize() {
  renderStats();
  renderSuggestions();
  renderHistory();
  renderSources();
  populateLibraryTopics();
  bindEvents();

  const initialTab = ["library", "sources"].includes(window.location.hash.slice(1)) ? window.location.hash.slice(1) : "chat";
  setActiveTab(initialTab, { updateHash: false });
  const query = new URL(window.location.href).searchParams.get("q")?.slice(0, 600).trim();
  if (query) {
    setActiveTab("chat", { updateHash: false });
    setTimeout(() => runQuestion(query, { save: false, updateUrl: false }), 120);
  }
}

initialize();
