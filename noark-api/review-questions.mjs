import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { API_CONFIG } from '../noark-assistent/api-config.mjs';

// Private diagnostic reports are review material, never instructions or ground truth.
export function buildReviewReport(records) {
  if (!Array.isArray(records) || records.length > 5000) throw new Error('Invalid review export.');
  const outcomes = {};
  const groups = new Map();
  for (const r of records) {
    const outcome = ['answered', 'insufficient', 'no_sources', 'provider_error', 'incomplete', 'validation_or_network_error', 'accepted'].includes(r.outcome) ? r.outcome : 'unknown';
    outcomes[outcome] = (outcomes[outcome] ?? 0) + 1;
    if (typeof r.questionText !== 'string' || !r.questionText.trim()) continue;
    const text = r.questionText.slice(0, 350).trim();
    const key = text.toLocaleLowerCase('nb-NO').replace(/\s+/g, ' ');
    const group = groups.get(key) ?? { question: text, count: 0, weakOrUnanswered: 0, candidateRecordIds: new Set() };
    group.count++;
    if (r.weakMatch || outcome !== 'answered') group.weakOrUnanswered++;
    for (const hit of (r.hits ?? []).slice(0, 8)) {
      if (/^[a-z0-9-]{1,80}$/.test(hit.recordId)) group.candidateRecordIds.add(hit.recordId);
    }
    groups.set(key, group);
  }
  return { total: records.length, withText: records.filter((r) => Boolean(r.questionText)).length, outcomes,
    warning: 'Untrusted, possibly personal review material. Human source verification required. Do not commit this file.',
    priorities: [...groups.values()].sort((a, b) => b.weakOrUnanswered - a.weakOrUnanswered || b.count - a.count)
      .map((g) => ({ ...g, candidateRecordIds: [...g.candidateRecordIds], nextAction: 'Verify an authoritative source, generalise the question, then add a reviewed retrieval regression test.' })) };
}

async function readHiddenKey() {
  if (!process.stdin.isTTY) throw new Error('Use an interactive terminal or a securely supplied QUESTION_REVIEW_KEY environment variable.');
  process.stderr.write('Question review key (hidden; never paste into chat): ');
  return new Promise((resolveKey, reject) => {
    let value = '';
    const input = process.stdin;
    const previousRaw = input.isRaw;
    input.setRawMode(true); input.setEncoding('utf8'); input.resume();
    function finish(error) {
      input.off('data', onData); input.setRawMode(Boolean(previousRaw)); input.pause(); process.stderr.write('\n');
      error ? reject(error) : resolveKey(value);
    }
    function onData(chunk) {
      for (const c of chunk) {
        if (c === '\u0003') return finish(new Error('Cancelled.'));
        if (c === '\r' || c === '\n') return finish();
        if (c === '\u007f' || c === '\b') value = value.slice(0, -1);
        else if (c >= ' ' && value.length < 256) value += c;
      }
    }
    input.on('data', onData);
  });
}

async function main() {
  const origin = new URL(API_CONFIG.origin);
  if (origin.origin !== 'https://noark-luna-api.rolfsselas.workers.dev') throw new Error('Review the configured destination before sending the owner key.');
  const key = process.env.QUESTION_REVIEW_KEY || await readHiddenKey();
  if (key.length < 32 || key.length > 256) throw new Error('Invalid key length.');
  const records = [];
  let cursor = '';
  for (let page = 0; page < 50; page++) {
    const url = new URL('/api/admin/questions', origin);
    if (cursor) url.searchParams.set('cursor', cursor);
    const response = await fetch(url, { headers: { Authorization: `Bearer ${key}` }, redirect: 'error', signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`Export refused (${response.status}); check deployment and owner access.`);
    const data = await response.json();
    if (!Array.isArray(data.records) || data.records.length > 100) throw new Error('Invalid export page.');
    records.push(...data.records); cursor = data.nextCursor;
    if (!cursor) break;
    if (!/^q:\d{13}:[0-9a-f-]{36}$/i.test(cursor)) throw new Error('Invalid export cursor.');
  }
  const directory = resolve(dirname(fileURLToPath(import.meta.url)), 'private-review');
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const report = buildReviewReport(records);
  const filename = resolve(directory, `review-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  await writeFile(filename, JSON.stringify(report, null, 2), { flag: 'wx', mode: 0o600 });
  console.log(`Saved a private review report for ${report.total} requests (${report.withText} with opted-in text).`);
  console.log('Stored under noark-api/private-review/. Do not publish; delete exports when the review is complete.');
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url)
  main().catch(() => { console.error('Review export failed. Check the Worker, owner key and private output directory. No credential was printed.'); process.exitCode = 1; });
