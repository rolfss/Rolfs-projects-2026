# Second Rolf v2 — local public knowledge service

**Implementation prepared and tested; live PC/Cloudflare activation remains pending.** This package does not enable the owner's Hermes remotely. See `OWNER_HERMES.md` for the separate owner-only agent activation.

## What changed

The previous code's `provider: custom` and `localOnly: true` did not prove local inference. A prompt telling a tool-enabled Hermes agent not to use its tools was not isolation. The public service now uses a separate, non-agent inference adapter: no Hermes API, shell, browser, delegation, writable memory, private files or action tools. It can only search approved excerpts and request one completion from a fixed local model.

Public path: GitHub Pages → Turnstile → dedicated Worker → Cloudflare Access Service Auth → tunnel → public service → isolated local Ollama. The model and public service join only internal Docker networks. Only the tunnel has external connectivity. No host ports are published. Model files/corpus are read-only; containers are non-root with dropped capabilities. Use a separate VM/OS account for additional host isolation.

The implemented adapter supports **existing Ollama GGUF models**. The actual model runtime/name on Rolf's PC has NOT been inspected. If it is LM Studio, llama.cpp or another runtime, adapt and test that runner instead; do not silently download/replace the existing model or substitute a cloud API. GPU passthrough, memory limits and read-only model loading require testing on the workstation. Sharing weights need not mean sharing a process or private agent state.

## Source coverage at implementation

- Six verified public portfolio excerpts included in `public-seed.json`.
- Master's PDF located on GitHub; its Git blob SHA is pinned in `sources.json`. Full text was not extracted here.
- Bachelor's repository README points to a Google Doc. Document access/export is pending.
- Public CV and selected @rolfsselas posts/reposts have not been imported. No chat-memory facts or third-party social mirrors were substituted.

The UI reports static vs model-generated answers, pending sources and verifiable citations. It never pretends the static fallback is a generative model. Reposts retain original author/date/URL and are not treated as proof of Rolf's endorsement. Do not infer sensitive personal traits from his scholarship or social activity.

## Owner-run source import

Node 22+ and Python 3.10+ are required. No npm dependencies. The PDF step uses an up-to-date local `pdftotext`; run document parsing in an offline sandbox without private mounts. Do not execute JavaScript from a social archive.

```sh
cd second-rolf-local
npm test
npm run check
python3 import-corpus.py
# On the authorized workstation, download only the pinned public master's PDF:
python3 import-corpus.py --fetch-master --strict
```

The first import works with the six seed excerpts and explicitly reports missing sources. `--strict` requires all sources marked approved to import successfully. There is no automatic recursive crawling or public upload endpoint.

For bachelor/CV: place reviewed public-only UTF-8 text at the exact `.local` paths in `sources.json`; remove private addresses, phone numbers, references and employer-confidential content. Record the SHA-256 and set `approved: true` only after review. Keep `url: null` for a private local CV excerpt rather than inventing a public citation URL. In the UI it is identified by title without a public link.

For social input: supply a reviewed JSON list; each selected entry needs `approved`, `kind` (`original-post` or `repost`), `text`, the authentic public post `url`, date and original author for reposts. No DMs, likes archive, cookies or account tokens. The importer checks owner-authored URLs; reposts may use the original author's status URL, provided originalAuthor is recorded. Use the owner's export to verify the sharing relationship, not an inferred scraping result. No automatic updating from visitors; owner changes need renewed checksum approval. The sourceStatus report distinguishes indexed, unavailable and pending records.

The generated `.local/corpus.json`, raw documents and secrets stay off GitHub/Pages. Only selected retrieved excerpts reach the local model. Public responses can quote approved excerpts; do not approve material that is not safe to expose.

## Workstation deployment — must be verified before enabling the Worker

1. Run `inspect-local.ps1` in Windows PowerShell. It only checks command availability and the standard loopback Ollama model listing. An unavailable endpoint is not proof no local model exists. Do not read or paste private config/credentials.
2. Verify the installed runner, exact model name, full model digest and its license for public-serving use. For Ollama, reuse the existing model directory (only blobs/manifests), read-only. Fill `.local/model.json` from the example. No `pull` or model download command is included.
3. Create `.env` from `.env.example` using reviewed digest-pinned image references. Obtain those image bytes through the owner's approved installation process before isolating the services. Image pins are intentionally not invented. Review available RAM/GPU before applying memory limits. In WSL/Linux give only the deployment UID 1000 access to deployment input copies; do not make secrets world-readable or alter original private folders.
4. Generate a new random 32-byte key directly into `.local/bridge-key` (hex), with owner-only permissions. Put the named tunnel token in `.local/tunnel-token` using a secure field/editor; never chat, source control or shell command-line arguments. The tunnel must lead only to `http://public:8788` and its hostname must require the dedicated Cloudflare Access service token. No quick public tunnel to raw Ollama or Hermes.
5. Run `python3 preflight.py`, inspect `docker compose config` locally, build the public image and start the services with the owner-approved Docker installation. The offline preflight checks inputs, not Docker's effective network or sandbox state.
6. Before setting `PUBLIC_CHAT_ENABLED=true`, verify all acceptance checks below on the actual host and deployed edge. See `../second-rolf-api/README.md` for Worker secrets and variables. Authentication/host changes require owner authorization. This session did not deploy the Worker or start containers on the PC.

## Required live acceptance checks

- Model name/digest and GGUF locality verified by `/api/tags` and `/api/show`; cloud features disabled with `OLLAMA_NO_CLOUD=1` and external networking denied. Check model logs only locally for the cloud-disabled startup flag; do not enable prompt logs. A localhost/custom-provider setting alone is not enough.
- Inspect containers: no published ports, host networking, privileged mode, normal-home/work mounts, Docker socket or shared Hermes credentials. Verify public/model cannot reach Internet, host/LAN or private Hermes, including DNS/proxy escape routes. Docker internal networking is not a replacement for host/VM firewall verification.
- Calls without Cloudflare Access and bridge authentication fail. Valid Turnstile hostname/action accepted; replay, oversized messages, model/provider/tool overrides denied. Tunnel cannot route to raw Ollama/private agent.
- Two independent browsers cannot see each other's history. Clear cancels in-flight UI requests. Public text cannot invoke tools or alter source data.
- Disconnect the local model/tunnel: health reports not ready and no cloud completion is attempted. Try the actual selected model against thesis questions and injection attempts; mocked tests do not establish model answer quality.
- Check service CPU/RAM/GPU limits and one-at-a-time inference under load. The daily cap is in-memory and resets on restart; native edge rate limits are per-location/approximate, not a global billing meter. Keep an owner kill switch and resource monitoring.

## Limitations

Lexical retrieval runs locally without embeddings or API costs. It is a baseline: synonym recall and Norwegian/English cross-language matching are limited. Exact substring checks reject made-up quotes and unknown source IDs; they do NOT prove the answer's interpretation follows from a source. The model may still hallucinate or follow malicious text. Layering and removal of tools limit impact rather than proving perfect safety.

The isolation environment flag and health response are operator declarations checked against runtime model metadata, not remote attestation. Trust requires inspecting the actual deployment. Containers share a host kernel; a dedicated VM strengthens separation. No request text logging or permanent visitor memory is added. Hosting providers may retain operational metadata. No new third-party services are paid for by this code; electricity/hosting remain separate costs.

References checked 2026-09-08:
https://docs.ollama.com/faq
https://docs.docker.com/reference/compose-file/networks/
https://docs.docker.com/compose/how-tos/gpu-support/
https://developers.cloudflare.com/cloudflare-one/access-controls/service-credentials/service-tokens/
https://hermes-agent.nousresearch.com/docs/user-guide/security
