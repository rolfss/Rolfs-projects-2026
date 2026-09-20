# Second Rolf: public profile and private owner notes

Second Rolf supports general conversation. Claims about Rolf are limited to the allowlisted professional dataset in `site/second-rolf/knowledge.js`: documented work experience, education, professional skills and public portfolio projects. Revision: `2026-09-20-bonsai-private-notes`.

`site/second-rolf/interview.js` remains an empty compatibility module providing revision and scope instructions. It contains no private interview records or owner notes. Private owner notes belong in an owner-only local file outside the public repository, site assets and public model context. The public connector must not load them into visitor conversations. A private file must not be added to Git, a deployment bundle, telemetry or diagnostic output.

The assistant is instructed not to reveal, reconstruct or invent private information or embarrassing personal claims. Visitor statements and conversation history are not authoritative evidence about Rolf. Keeping private facts out of the public inference context prevents their direct disclosure from that context; it does not guarantee that a generative model can never invent an inaccurate claim. Ordinary conversation about literature, science, culture or other topics remains allowed without claiming that a topic describes Rolf's private preferences.

## Scope

Public records may include documented employment, education, professional competence and project details. Civic background is deliberately limited to the generic wording: **Frivillige og politiske verv i studietiden.** Do not infer or name organizations behind that phrase. Do not restore earlier personal profiles, non-work preference summaries, anecdotes or private transcripts to the public dataset.

## Version boundary

The browser accepts live status and answers only for the current `PROFILE_REVISION` and exact model alias `Bonsai-2-27B-PQ2_0`. The Worker and relay must agree with the revision reported by the authenticated Windows connector. Updating the revision blocks older model deployments from the updated interface. Until all components match, the site uses only the public professional offline dataset.

Validate the local runtime and privacy behavior before publishing. Publish Pages, deploy the matching Worker and restart the local connector from the same tested revision. A full Windows reboot or model retraining is unnecessary. Pages publication alone does not update the PC or Cloudflare, or erase already-open browser tabs and previously saved copies.

## Checks

Run `npm test` and `npm run check` from `second-rolf-api`. Tests cover the professional source allowlist, the empty compatibility dataset, rejected private source IDs, public pages and suggestions, scoped instructions, generic civic wording, model identity and rejection of older backend responses. Keep the transport, security, overload and UI tests. Deterministic tests do not prove the quality or privacy behavior of actual Bonsai replies; those require separate local inference checks before publication.
