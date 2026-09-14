# Second Rolf — local AI

Second Rolf answers portfolio questions with **Ministral 3 14B (Q4_K_M)** on Rolf's own Windows PC. The public facts in `site/second-rolf/knowledge.js` are shared by the offline profile and the model's system context. Conversation history supports follow-up questions. Source IDs resolve to links to the published projects.

The selected PC has an NVIDIA RTX 5070 Ti (16 GB VRAM), AMD Ryzen 7 9800X3D and 32 GB RAM. The model ran fully on the GPU with an 8,192-token context and about 8.9 GB allocated by Ollama. A warmed portfolio answer took 1.95 seconds and generated 134 tokens at approximately 84 tokens/second. This is one measured example, not a latency guarantee. Initial model loading takes longer.

## Connection

```text
GitHub Pages → verification + rate limit → Cloudflare Worker → workstation relay
                                                           ↕ authenticated outbound WSS
                                               local connector → loopback Ollama → GPU
```

The PC opens the connection to Cloudflare. It needs no public IP, DNS name, tunnel or inbound firewall port. Ollama listens only on `127.0.0.1:11434`. The connector pins the model and constructs the system prompt locally. It accepts only bounded chat messages, with no tools, shell, file access, browsing or model-management route. Cloud AI is disabled in Ollama and there is no paid model fallback.

The public status checks actual model readiness reported by the authenticated PC every 15 seconds. Readiness starts only after a successful local inference probe; probes repeat after an unload and periodically while idle. A missing heartbeat expires after 45 seconds. Socket disconnects immediately fail pending work. The browser refreshes its light every 15 seconds and when returning to the page. Green indicates availability; the GPU label is shown only when Ollama reports GPU memory use.

One physical GPU processes one public request at a time. Additional requests receive a clear busy response. Requests have bounded duration and length. Conversation text is transient: browser memory, the active relay request and local inference. No conversation database, private profile, model tools or chat logs are used. Cloudflare necessarily carries the public messages between the browser and PC; inference itself is local. Platform access/security logs may contain request metadata.

## Deploy the public backend

Requires Node 22 or later and an existing Cloudflare account with Workers and Durable Objects support.

```powershell
npm ci
npm test
npm run check
npx wrangler deploy
npx wrangler secret put LOCAL_CONNECTOR_KEY
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler secret put TURNSTILE_SITE_KEY
```

Create a managed Turnstile widget for `rolfss.github.io`. The frontend uses action `second-rolf-chat`; the Worker validates both hostname and action. Generate a random connector key with at least 32 bytes of entropy. Keep it only in the Worker secret and the PC's private config, never in source or frontend code. All three settings are required before public chat becomes available. Health stays offline if any are missing. Do not use testing keys in production.

`wrangler.jsonc` defines a SQLite-capable Durable Object namespace (one object for the physical workstation), but no chat text is written to its storage. Only model-readiness metadata is attached to the hibernating WebSocket. Restarting the relay can interrupt a current answer; the page then uses its built-in profile mode.

## Run on Windows

Install the official [Ollama Windows runtime](https://docs.ollama.com/windows) and download the [Ministral 3 14B model](https://ollama.com/library/ministral-3:14b). Keep its model directory separate from the source checkout. Recommended server environment:

```powershell
$env:OLLAMA_HOST = '127.0.0.1:11434'
$env:OLLAMA_NO_CLOUD = '1'
$env:OLLAMA_NUM_PARALLEL = '1'
$env:OLLAMA_CONTEXT_LENGTH = '8192'
$env:OLLAMA_FLASH_ATTENTION = '1'
$env:OLLAMA_KV_CACHE_TYPE = 'q8_0'
ollama serve
# In another terminal:
ollama pull ministral-3:14b
node local/connector.mjs C:\path\to\private-config.json
```

The private config has `workerUrl` set to `https://second-rolf-api.rolfsselas.workers.dev` and `key` set to the same random connector secret. Restrict the file to the Windows account and SYSTEM. The connector rejects other remote hosts. It automatically reconnects after network or Worker restarts. The provided Windows setup includes start/stop controls and a sign-in startup task; see the PC's local instructions.

The model uses GPU memory while available. Stopping Second Rolf unloads its dedicated runtime; sleeping or turning off the PC makes the public page fall back to profile mode. Other portfolio projects and their AI providers are independent.

## Verification

`npm test` runs the actual Cloudflare local runtime, covering verification failures, CORS, request bounds, prompt-role injection, availability and recovery, hibernation, stale heartbeats, conversation transport, overload, disconnects and invalid model responses. The runtime override in `package.json` keeps the test runner's engine aligned with the deployment compatibility date. Update it alongside Wrangler.

Model reference: [Mistral's official model card](https://docs.mistral.ai/models/ministral-3-14b-25-12). The 14B model provides a practical quality/memory balance on this 16 GB GPU; larger variants would leave less headroom or spill into slower system RAM.
