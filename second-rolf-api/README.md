# Second Rolf — secure Hermes edge

This Worker is the public edge for the GitHub Pages **Second Rolf** interface. It is intentionally separate from `noark-luna-api` and from the private/default Hermes profile.

## Required architecture

`GitHub Pages -> Cloudflare Turnstile -> second-rolf-api Worker -> HTTPS tunnel -> isolated Hermes profile`

Do **not** point this Worker at the default/private Hermes profile. Hermes' API server exposes the agent, including its configured tools. The public profile must therefore be isolated before the Worker is activated.

## Hermes profile

Create a named profile called `second-rolf`. Give it its own `API_SERVER_KEY`, `SOUL.md`, config, sessions and home. Keep built-in memory/user profile disabled and remove action-capable toolsets. Do not clone private state into it.

Suggested profile properties:

```yaml
memory:
  memory_enabled: false
  user_profile_enabled: false

agent:
  disabled_toolsets:
    - terminal
    - file
    - browser
    - skills
    - memory
    - session_search
    - cronjob
    - code_execution
    - delegation
    - messaging
    - homeassistant
    - discord
    - discord_admin
```

Because tool configuration is security-critical, verify the effective tool list after every Hermes update rather than assuming the config was applied.

Copy `SECOND_ROLF_SOUL.md` to the profile's `SOUL.md`. Keep the profile limited to public information.

Enable its API server with a unique key. Hermes documents an OpenAI-compatible API server and named-profile endpoints. Keep the server on loopback and expose it only through a tunnel; never bind the Hermes server itself directly to the public network.

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
- The frontend falls back to a small public-profile knowledge base if Hermes is offline.
