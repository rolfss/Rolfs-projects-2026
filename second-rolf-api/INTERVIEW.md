# Public knowledge scope

Second Rolf is restricted to public portfolio facts and basic cultural, creative and recreational interests. `site/second-rolf/interview.js` retains its legacy filename, but now contains only this reduced dataset. Revision: `2026-09-14-basic-public-interests`.

No transcript excerpts, private anecdotes, personality descriptions, relationship information, personal beliefs or interpretations belong in this dataset, its prompts, public pages, export data or test fixtures. Do not restore them from repository history or use flattering wording to reintroduce them. Keep hobby descriptions short and factual; do not infer a personality from a preference.

The public interest page has no transcript or JSON-download feature. The current source contains only the basic-interest allowlist. Historical Git commits and previously downloaded or cached copies are a separate cleanup concern; a normal deployment does not erase them.

## Deployment safety

The browser accepts live status and responses only for the current `PROFILE_REVISION`. The Worker accepts requests only for that revision. The relay requires the authenticated connector to report that same revision and rejects stale attachments or answers. The connector pins the revision it actually imports at process startup. Older deployments fail closed to the reduced public profile.

Rollout requires GitHub Pages publication, a Worker redeploy and a refresh/restart of the Windows connector. A Pages deployment alone cannot update or delete files on the PC, retire an older Worker deployment or erase already-open browser tabs. Until all components match, the updated site uses only its reduced offline knowledge.

The profile is request context, not model fine-tuning. Restarting the updated connector replaces its imported prompt data; the Ministral model weights are unchanged. Existing private local configuration and credentials must not be published.

## Validation

Run `npm test` and `npm run check` from `second-rolf-api`. Tests cover the basic-interest allowlist, removal of legacy source IDs, no transcript fields or download controls, prompt boundaries, cache-busted page imports, and refusal of mismatched browser/Worker/connector revisions. These checks do not constitute a live rollout or a test of real Ministral responses.
