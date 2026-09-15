# Second Rolf: model connected, chat blocked

## Verified incident: 15 September 2026

A public health request at **19:29:32 UTC** returned `configured: true`, `available: true`, `gpu: true`, `model: ministral-3:14b`, `mode: local-model`, and `localOnly: true`, **but no `profileRevision`**. The PC/model connection was reported online; the deployed Worker was older than the website's profile-version contract. This is a point-in-time health observation, not a browser chat or hardware inspection.

Evidence: [read-only diagnostic run](https://github.com/rolfss/Rolfs-projects-2026/actions/runs/35013925450). The old status module also imported an older cache-keyed profile module (`20260915-cv-professional`), while the rest of the app used the technical-profile version.

Do not remove the profile-version check to hide this mismatch. A legacy local connector may still contain profile material that the owner has removed. A current website alone does not update the Worker or the running Windows connector.

## Changes

- Separate **Ministral connected** from **current-profile chat allowed**. Show a visible update-required reason when the model is online but its public profile cannot be verified. Green requires the current profile and the exact local model. GPU wording requires reported GPU use.
- Correct the status-module cache graph, add a manual connection check, and retain automatic checks every 15 seconds and on return to the tab.
- Permit general conversation, explanations, writing, mathematics, science, culture and coding in the actual local system prompt. These are no longer restricted to work topics.
- Keep information **about Rolf** strictly professional and source-grounded. Do not restore private interests, personal transcripts, hidden organization names, tools, file access or cloud-model fallback.
- Validate `ministral-3:14b` on the warmup reply, local chat reply and browser response. Label built-in profile responses as **not AI**. Do not send offline templates back as AI conversation history.

The approved professional facts and privacy exclusions are unchanged, so their `PROFILE_REVISION` is unchanged. UI assets have a separate cache version. The general-chat instruction change still requires updating/restarting the connector; it is not model training.

## Coordinated update on the Windows PC

From the existing repository checkout, on `main`:

```powershell
git pull --ff-only
cd second-rolf-api
.\local\repair.ps1 -DeployWorker
```

The script uses `SECOND_ROLF_CONFIG`, or the existing JSON config path supplied on a running connector's command line. If neither resolves unambiguously, it asks locally for the existing config file path. **It does not ask for or publish the secret key.** A path can also be given explicitly:

```powershell
.\local\repair.ps1 -DeployWorker -ConfigPath 'C:\path\to\private-config.json'
```

Node 22+, npm, Ollama and the downloaded `ministral-3:14b` model must already be installed. Deploying requires the existing Cloudflare authorization; if absent, run `npx wrangler login` locally and rerun. Do not put Cloudflare credentials or the connector key in GitHub source or chat.

The script installs the locked dependencies, checks source syntax, optionally deploys the Worker with existing secrets preserved, starts loopback Ollama if needed, performs an actual local chat request, restarts only connector processes using the same validated config, then checks public readiness. It does not reboot the PC, retrain or redownload the model, alter the firewall, terminate unrelated Node/Ollama processes, or change scheduled tasks. If an old startup control launches a separate checkout, update that control to this checkout too; do not leave two connectors competing for the same relay.

The PowerShell script is syntax-checked in CI, not claimed as executed on the owner's Windows PC. Its prerequisites and permissions must be checked locally. A successful local diagnostic is not an end-to-end public chat test.

## Independent diagnostics

```powershell
npm run doctor
node local/doctor.mjs --local-only
node local/doctor.mjs --public-only
```

`--local-only` warms the exact model and calls the real Ollama `/api/chat` with the current system prompt. `--public-only` reads the deployed Worker's health and explains configuration, profile mismatch, disconnection or network failure. Neither stores visitor messages or prints the private config.

After public readiness passes, reload the app, complete Turnstile and ask a general question and a question about the documented hardware. Responses should be labelled `Ministral 3 14B`; built-in fallbacks must never carry that AI label.

## GitHub deployment boundary

The validation workflow deploys the Worker after successful tests on `main` **only when** the repository has `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets configured. Otherwise it reports deployment skipped, not success. Do not add credentials to source. GitHub cannot restart the owner's PC connector through this workflow. GitHub Pages publication and a green unit-test run alone do not prove live inference has been updated.
