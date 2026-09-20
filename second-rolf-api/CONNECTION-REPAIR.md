# Second Rolf: connection and model readiness

The current runtime is PrismML Bonsai 2 27B PQ2_0, exposed only at `127.0.0.1:8099` with alias `Bonsai-2-27B-PQ2_0`. The browser, Worker and authenticated PC connector must agree on profile revision `2026-09-20-bonsai-private-notes` before live replies are allowed. A connected PC or an open local chat page is not sufficient evidence.

## Historical incident: 15 September 2026

A public health request at **19:29:32 UTC** reported the former Ministral model available but omitted `profileRevision`. The deployed Worker was older than the website's profile contract. This was a point-in-time health observation, not a browser chat or hardware inspection. Evidence: [read-only diagnostic run](https://github.com/rolfss/Rolfs-projects-2026/actions/runs/35013925450).

The status module also imported an older cache-keyed profile module. The current browser module graph uses cache version `20260920-bonsai-private-notes` consistently.

Do not remove the profile or exact-model checks to hide a mismatch. A legacy local connector may still contain removed profile material. Updating a website alone does not update Cloudflare or a running Windows process.

## Current checks

- Distinguish model connectivity from permission to answer with the current public profile. Show a visible update-required reason when a model is connected but its profile version is wrong.
- Require the exact Bonsai alias, healthy loopback runtime, matching process identity and a real structured inference probe before declaring readiness. Report GPU use only with matching live NVIDIA process evidence and complete offload evidence.
- Permit general chat, explanations, writing, mathematics, science, culture and coding. Keep claims about Rolf source-grounded in the public professional dataset.
- Exclude private owner notes from public model context, frontend and repository. Never resolve a connection problem by restoring private transcripts or weakening the privacy boundary.
- Label built-in profile responses as **not AI**. Do not feed those templates into subsequent model conversation history. Never substitute a cloud model.

## Coordinated update on the Windows PC

First install the pinned model/runtime described in [README.md](./README.md#run-on-windows). `RuntimeRoot` is the existing local Second Rolf runtime folder containing its Start/Stop scripts and startup wrapper, not the public repository checkout. Use the existing private connector config; do not paste or publish its secret key. Node 22+, npm and the matching GPU runtime are required. For independent diagnostics against a running supervisor, set `SECOND_ROLF_MODEL_STATUS` to its private process-status file.

From the tested checkout, run source checks before replacing a running connector or publishing:

```powershell
cd second-rolf-api
npm ci
npm run check
npm test
```

After the local checks pass, use the coordinated repair entry point with the existing private config:

```powershell
.\local\repair.ps1 -RuntimeRoot 'C:\path\to\existing-second-rolf-runtime' -ConfigPath 'C:\path\to\existing-second-rolf-runtime\.private\config.json' -DeployWorker
```

The repair entry point stages a versioned application snapshot, stops the previous supervisor and updates the runtime's supervisor wrapper. It starts the new runtime and validates real local inference; a failure restores the previous wrapper. It retains the existing startup target, handles the dedicated runtime and connector, preserves Worker secrets and checks public readiness. The connector config must be the existing `RuntimeRoot\.private\config.json`; repair does not copy or replace credentials. The pinned runtime and model must already be installed. If their installation manifest is elsewhere, add `-InstallationPath 'C:\path\to\installation.json'`. `local/supervise.ps1` is an internal component managed by the wrapper. Restart only the Second Rolf processes being updated and avoid two competing connectors sharing the relay.

Deploying requires existing Cloudflare authorization. If it is absent, authorize locally. Keep Cloudflare credentials and connector secrets out of source and diagnostic output. GitHub Pages publication, Worker deployment and the PC restart are separate operations.

## Independent diagnostics

```powershell
npm run doctor
node local/doctor.mjs --local-only
node local/doctor.mjs --public-only
```

`--local-only` checks the pinned loopback runtime and GPU evidence, then performs actual structured inference with the application prompt. `--public-only` reads the deployed Worker's health and explains configuration, profile mismatch, disconnection or network failure. Neither needs to print the private config or store visitor messages.

After public readiness passes, reload the app, complete Turnstile and ask a general question plus a question about the documented model/hardware. AI responses should be labelled `Bonsai 2 27B`; built-in fallbacks must never carry that label. Also check a private-notes request and a leading personal allegation: the assistant should avoid disclosure or invented personal claims. Actual replies require evaluation; prompt wording alone does not establish privacy behavior.

## GitHub deployment boundary

A push to `main` can publish Pages and deploy the Worker. Validate the local model and privacy behavior **before** that push. The Worker validation workflow deploys only when `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets are configured; otherwise it reports deployment skipped. GitHub cannot restart the owner's PC connector through that workflow. A green unit-test run and published page alone do not prove live inference has been updated.
