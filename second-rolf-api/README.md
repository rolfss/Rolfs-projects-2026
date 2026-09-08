# Second Rolf — secure local Hermes edge

This Worker is the public edge for the GitHub Pages **Second Rolf** interface. It is intentionally separate from `noark-luna-api` and from the private/default Hermes profile.

## Required architecture

`GitHub Pages -> Cloudflare Turnstile -> second-rolf-api Worker -> HTTPS tunnel -> isolated second-rolf Hermes profile -> local model server/GPU`

**There is no paid/cloud-model fallback.** If the workstation, Hermes profile, tunnel or local model is unavailable, the public page falls back to its small static public-profile knowledge base.

## Local inference lock

The Worker always sends:

- `model: second-rolf-local`
- `provider: custom`

The isolated Hermes profile must map `second-rolf-local` to the model already running locally. Hermes supports self-hosted OpenAI-compatible endpoints such as Ollama, LM Studio, vLLM and llama.cpp.

Use `HERMES_LOCAL_PROFILE.example.yaml` as the profile template. It deliberately contains:

- a `custom` local provider/base URL;
- the `second-rolf-local` API route;
- `fallback_providers: []`;
- memory disabled;
- action-capable/private-state toolsets disabled.

Do not add OpenAI, OpenRouter, Nous Portal, Anthropic, Codex or other paid/cloud providers as fallback providers for this profile.

## Hermes profile

Create a named profile called `second-rolf`. Give it its own `API_SERVER_KEY`, `SOUL.md`, config, sessions and home. Do not clone private state into it.

Copy `SECOND_ROLF_SOUL.md` to the profile's `SOUL.md`. Copy `HERMES_LOCAL_PROFILE.example.yaml` to the profile's `config.yaml`, replacing only:

- `LOCAL_MODEL_NAME`
- `LOCAL_OPENAI_COMPATIBLE_BASE_URL`

with the model and endpoint already running on the workstation.

For example, common local OpenAI-compatible base URLs are:

- Ollama: `http://127.0.0.1:11434/v1`
- LM Studio: `http://127.0.0.1:1234/v1`
- vLLM: `http://127.0.0.1:8000/v1`

Keep Hermes' API server itself on loopback. Expose it only through the authenticated tunnel; never bind Hermes directly to the public network.

Because tool configuration is security-critical, verify the effective tool list after every Hermes update rather than assuming the config was applied.

## Worker configuration

Set in Cloudflare, never GitHub:

- `TURNSTILE_SECRET_KEY` — encrypted secret
- `TURNSTILE_SITE_KEY` — public variable for `rolfss.github.io`
- `HERMES_API_SERVER_KEY` — encrypted secret for the **second-rolf** Hermes profile only
- `HERMES_API_URL` — HTTPS tunnel URL ending in the named profile's `/v1/chat/completions` endpoint

Example shape only:

`https://<private-tunnel-host>/p/second-rolf/v1/chat/completions`

Then deploy from this directory with Wrangler. Do not reuse the Noark Worker's budget, secrets, or bindings.

## Privacy and behavior

- No conversation persistence in the frontend.
- No question logging in this Worker.
- Origin restricted to `https://rolfss.github.io`.
- Turnstile required for every live request.
- Cloudflare's native rate-limit binding caps live calls at 10/minute per network address without a custom visitor database.
- Live answers are accepted by the frontend only when the backend reports `mode: hermes-local` and `localOnly: true`.
- Local model failure means static fallback, **not paid tokens**.
