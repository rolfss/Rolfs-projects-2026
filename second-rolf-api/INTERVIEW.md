# Professional and technical knowledge scope

Second Rolf is strictly a professional and technical assistant. Its factual source is the allowlisted professional dataset in `site/second-rolf/knowledge.js`, covering documented work experience, education, professional skills and public portfolio projects. Revision: `2026-09-15-cv-professional`.

`site/second-rolf/interview.js` remains an empty compatibility module providing revision and scope instructions. It supplies no private interview records. Do not restore earlier personal material or add non-work preferences, personal anecdotes, personality descriptions or private-life content to the data, prompts or public interface.

For voluntary or civic background outside the documented career profile, the public dataset uses only the generic wording `Frivillige og politiske verv i studietiden.` Do not reconstruct or publish organization names behind that generic description.

The interface, suggested questions, default replies and `sources.html` cover professional background, education, documentation and information management, system administration, integrations, AI, digital product development and technical project examples. The legacy `interview.html` URL redirects to the professional source page. There is no transcript or profile-export feature.

## Deployment boundary

The browser accepts live status and answers only for the current `PROFILE_REVISION`. The Worker and relay must agree with the revision reported by the authenticated Windows connector. Updating the revision blocks older model deployments from the updated interface. Until all components match, the site uses only the professional offline dataset.

Publish Pages to update the visible app. Deploy the matching Worker and update/restart the local connector before enabling live model replies. A full Windows reboot or model retraining is not required. A Pages publication does not update the PC or Cloudflare, or erase already-open browser tabs and previously saved copies.

## Validation

Run `npm test` and `npm run check` from `second-rolf-api`. Tests cover the professional source allowlist, an empty compatibility dataset, rejection of removed source IDs, professional-only pages and suggestions, scoped model instructions, generic treatment of civic background, and refusal of older backend responses. Keep the existing transport, security, overload and UI tests. Deterministic tests do not constitute evaluation of actual Ministral replies.
