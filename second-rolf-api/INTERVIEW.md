# Interview enrichment — 14 September 2026

## Source and scope

`../site/second-rolf/interview.js` is the canonical structured source for 20 public-profile entries from Rolf's voice interview. It records dated self-reports, personal interpretations and an everyday example separately. Each entry includes a Norwegian summary, English transcript excerpts, bilingual retrieval terms, related topics and limits on inference. Excerpts are from the supplied transcript, not independently checked audio or quotations from the books discussed.

The material covers mysticism, psychology, connecting past and present, cross-spectrum dialogue, writing, video editing, practical AI/programming, Spanish, friends, Grimstad, exercise, music, science fiction, Civilization VI and meaningful reading. It excludes the private conversation and third-party personal details. Use concrete preferences without personality classifications; do not infer affiliations, relationships, qualifications or supplement use.

`interview.html` presents the summaries and excerpts, provides stable citation anchors and exports the same object as JSON. The public profile and local prompt share this source through `knowledge.js`; the nine existing portfolio entries remain intact. To export without a browser, run from `second-rolf-api`:

```sh
node --input-type=module -e "import {interview} from '../site/second-rolf/interview.js'; process.stdout.write(JSON.stringify(interview,null,2)+'\n')" > second-rolf-interview-2026-09-14.json
```

## Retrieval and context

The model receives the portfolio, the interest overview and up to six interview records matched against the current question and the last two retained user questions. Old complete turns are dropped when retained history exceeds 4,000 characters. This leaves more room in the existing 8,192-token context; the character budget is not a tokenizer guarantee. Evidence and the complete dataset remain available on the source page instead of filling every model request. This is grounded prompt enrichment, not model fine-tuning.

## Verification and rollout

`node --test tests/profile.node.mjs` checks coverage, follow-ups, dates, identifiers, source links, prompt boundaries, original portfolio retention and context budgeting. `npm test` also runs the existing Worker and UI suites. These are deterministic code tests, not an evaluation of actual model answers.

Three running components must use the updated revision:

1. Merge and deploy GitHub Pages to update the offline profile, source page and prompt suggestions.
2. Deploy the Worker from `second-rolf-api` with the existing approved configuration so it resolves the new source IDs. No new secrets, models or paid services are required.
3. Update the repository checkout used by the Windows connector and restart the connector through its existing controls. Its imported knowledge and prompt are read at process startup; a GitHub merge alone does not update a running PC process.

After rollout, check both offline profile mode and actual GPU answers with questions about Siddhartha, music, mysticism, Spanish and exercise. Follow up with “Why does that matter to him?”; check the source link. Check that unknown Jung book titles, albums, TV series, qualifications and political/religious affiliations are not invented. A green availability light does not certify the knowledge revision.
