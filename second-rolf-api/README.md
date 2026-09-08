# Second Rolf edge v2 — deployment NOT activated

This replaces the earlier direct Hermes proxy. `provider: custom` and a `localOnly` label were not enforcement of local inference. **Never expose the owner's full Hermes API through this Worker.**

Public visitors use the separate non-agent service in `../second-rolf-local`. The same existing model weights may serve private Hermes, but its tools, memory, secrets and sessions are not shared.

## Cloudflare configuration

Keep `PUBLIC_CHAT_ENABLED` absent/false until the workstation acceptance tests in the local README pass. Configure a dedicated named tunnel hostname protected with Cloudflare Access **Service Auth**, allowing only this Worker's service token. Tunnel destination: `http://public:8788`. Never point it at `model:11434`, private Hermes, Docker, SSH or an admin service. Refuse all other hostnames/routes.

Worker secrets: `PUBLIC_BRIDGE_KEY` (matches the dedicated local 32-byte bridge key), `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET`, `TURNSTILE_SECRET_KEY`.

Public variables: `PUBLIC_BRIDGE_ORIGIN` (HTTPS origin, no path/credentials), `TURNSTILE_SITE_KEY` (hostname `rolfss.github.io`). Retain `SECOND_ROLF_RATE` from wrangler.toml. Old `HERMES_API_*` values are intentionally ignored. Never paste secret values into chat or GitHub.

After the source ingestion, model, isolation and Access tests pass, deploy with your authenticated Cloudflare tool and enable `PUBLIC_CHAT_ENABLED=true`. No Cloudflare deployment was performed in the implementation session.

## Limits and privacy

Turnstile per request; HMAC-pseudonymised network keys; 10/minute native limiter from existing Wrangler configuration. Cloudflare native rate limits are per-location/approximate, not a global billing limit. The local service also has one inference slot and a 100/day in-memory resource cap (resets on restart).

No request/response text logging in this code. Providers and the tunnel may retain operational metadata under their policies. No persistent chat storage in the browser or public service. Rate/replay state is temporary memory. Do not claim anonymity.

Health checks contact the restricted local service and verify its protocol, actual model readiness and no-tools status. Network isolation still requires host-level verification: an environment variable is not remote attestation. Cloud inference is never a fallback in this implementation.

Official references: https://developers.cloudflare.com/cloudflare-one/access-controls/service-credentials/service-tokens/ and https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/ .
