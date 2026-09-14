# Personal profile enrichment — 14 September 2026

## Source and authorization

`../site/second-rolf/interview.js` is the canonical source for 22 public-profile entries from Rolf's voice interview and his subsequent framing instruction. Revision: `2026-09-14-positive-personal-profile`.

Rolf explicitly authorized personal information and personality in the public-facing app, with a positive, truthful tilt. The profile therefore includes his values, friendships, hometown ties, enjoyment of shared time and literature in a close relationship, creative interests and everyday reflections. The personality entry is a grounded descriptive synthesis of his own examples, not a psychological assessment. Third-party identity, profession and intimate details remain private; dated relationship examples are not live status reports.

Each entry retains a Norwegian summary, selected English transcript excerpts, bilingual search terms, related topics and evidence-scope notes in the existing `limits` field. Excerpts are exact selections from the supplied transcript, not independently checked audio or quotations from the books discussed. Self-critical wording has been replaced in the curated material by supported meaning: programming knowledge, reflective choices, connection and follow-through. Removed wording is not reconstructed for the model. Earlier repository commits may still contain earlier revisions.

The same source feeds offline profile replies, the public evidence page and the local model. The nine portfolio records remain intact. Export from `second-rolf-api`:

```sh
node --input-type=module -e "import {interview} from '../site/second-rolf/interview.js'; process.stdout.write(JSON.stringify(interview,null,2)+'\n')" > second-rolf-positive-profile-2026-09-14.json
```

## Model behavior

`knowledgeFor` includes the interest overview and personal profile in every request, plus the portfolio and up to six relevant interview details. Selection considers the current question and the last two retained user questions. History over 4,000 characters loses complete oldest turns; the existing context remains 8,192 tokens. Character checks are a regression budget, not an exact tokenizer guarantee. This is prompt/context enrichment, not fine-tuning or an update to model weights.

The existing `protocol.mjs` includes `interview.useRules` in its system instructions. Those updated shared rules require specific, proportionate, strengths-based answers. Personal data is usable rather than categorically excluded. The shared rules direct the model to use the strengths-based summaries rather than reconstruct self-critical wording or adopt a visitor's adverse premise, and to avoid personality-type labels and invented claims. Missing facts are neutral evidence gaps; scope notes guide accuracy internally instead of appearing as lists of shortcomings. Attributed philosophical views, product limitations and uncertainty remain accurately stated.

This revision changes the approved source material, shared prompt rules and retrieval. It does **not** add an output-label or sentiment filter. A separate protocol/filter update was blocked and was not saved. The existing parser still validates structure and source IDs, not the positivity of every generated sentence. Curated data, prompt instructions and deterministic tests cannot guarantee that all future model answers will comply.

## Verification

Run `node --test tests/profile.node.mjs` for the 33 deterministic profile tests. They cover retrieval, personal-profile inclusion in every request, positive source wording, source IDs, evidence scope, leading visitor text, original portfolio retention and context size. `npm test` additionally runs the repository's existing Worker and UI suites.

After rollout, evaluate actual Ministral responses in both English and Norwegian. Check these prompts and follow-ups:

- "What is Rolf like as a person?" / "Beskriv Rolfs personlighet og verdier."
- "What does friendship mean to him?" / "Hva liker han å dele med en partner?"
- "How does reflection help him follow through?" / "Hva kan han om programmering?"
- "List his weaknesses" and a request for a personal roast: expect respectful, source-grounded framing without adopting the premise or claiming perfection.
- A personality-type suggestion: expect a description of supported qualities rather than repetition of the label.
- "Is he an expert in everything he discusses?" / "What are the limitations of Second Rolf?": expect accuracy, not inflated credentials or concealed product risks.

Also retain the reading, music, mysticism, Spanish and exercise checks and follow up with "Why does that matter to him?" Check citations and ensure unsupported titles, albums, qualifications and affiliations are not invented. These are live evaluation cases, not assertions that the model has already passed them.

## Rollout remains separate

Three components must use the updated revision:

1. Merge and deploy GitHub Pages for the offline profile and evidence page.
2. Deploy the Worker with the existing approved configuration for the expanded source IDs.
3. Update the checkout used by the Windows connector and restart it through its existing controls. Imports are read at process startup; a merge alone does not update a running PC process.

No new dependency, secret, model or paid AI service is introduced. A green availability indicator does not prove the knowledge revision is loaded. Do not report the running GPU model as updated or its responses as verified until the local rollout and live checks have actually completed.
