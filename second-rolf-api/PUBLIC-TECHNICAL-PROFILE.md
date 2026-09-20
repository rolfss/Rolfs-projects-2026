# Second Rolf: public technical self-description

The public knowledge records `ai`, `ai-model`, `ai-hardware`, `ai-knowledge` and `ai-privacy` in `site/second-rolf/knowledge.js` describe the documented application and its boundaries.

- **Model:** PrismML Bonsai 2 27B, PQ2_0 variant, pinned alias `Bonsai-2-27B-PQ2_0`. The runtime uses an 8,192-token context; the application permits at most 1,000 new tokens per reply.
- **Runtime:** PrismML's llama.cpp release `prism-b10683-d8f26ee`, Windows CUDA 12.4. The PQ2_0 weights require the PrismML runtime. Inference runs locally without a cloud-model fallback.
- **Documented workstation:** Windows, NVIDIA GeForce RTX 5070 Ti with 16 GB VRAM, AMD Ryzen 7 9800X3D, 32 GB RAM. Configuration documentation is not live hardware telemetry.
- **Architecture:** HTML/CSS/JavaScript on GitHub Pages → Cloudflare Worker / Durable Object → authenticated outbound WebSocket from the PC → Node.js connector → loopback PrismML llama-server → local inference. Public messages pass through Cloudflare.
- **Grounding:** the bounded public professional dataset is supplied as system context with limited conversation history. No fine-tuning on Rolf, embedding retrieval or vector database is implemented. Profile mode selects written facts by keyword; it is not model inference.
- **Privacy:** private owner notes are excluded from public model context, frontend assets and public repository. The public model has no file, shell or browsing tools. Instructions prohibit disclosure or invention of private or embarrassing claims. These controls do not eliminate the possibility of hallucinated statements.

## Applying this revision

The browser, Worker and local connector must agree on `2026-09-20-bonsai-private-notes` and the exact Bonsai alias. Browser modules use cache version `20260920-bonsai-private-notes`. Publishing GitHub Pages updates the visible page and built-in profile answers; it does not redeploy Cloudflare or update a running Windows process.

Before publishing, validate the installed Bonsai model through the application request path, including general chat, professional source grounding and privacy probes. Then update the PC connector, Worker and Pages from the same tested revision, preserving the existing private connector credentials. Until all components agree, the site uses current profile-mode answers. See [README.md](./README.md) and [CONNECTION-REPAIR.md](./CONNECTION-REPAIR.md).

## Evidence and limits

The September 19 local setup test loaded all 65/65 layers on the GPU at 8,192 context tokens, with an approximately 8.27 GiB increase in VRAM usage. One short warmed Norwegian response generated approximately 79 tokens/second. This was a local chat setup measurement, not an application benchmark, a comparison against the previous model or a guarantee of public request latency. Longer prompts, concurrent GPU activity and initial model loading affect performance.

September 20 application controls used the actual public profile and JSON response schema. Six bounded controls with the selected non-thinking settings generated about 77 tokens/second and completed in about 1.2–1.9 seconds. The settings follow [PrismML's model guidance](https://huggingface.co/prism-ml/Ternary-Bonsai-2-27B-gguf#best-practices) and avoided the repetition observed with the initial low-temperature configuration in this evaluation. A separate local Worker-to-GPU check returned arithmetic and cited Norwegian profile answers through the real connector and Durable Object; its Turnstile verifier was simulated. Neither check is a general quality benchmark or proof of deployed browser behavior.

Implementation: [protocol.mjs](./protocol.mjs), [local/connector.mjs](./local/connector.mjs), [the browser app](../site/second-rolf/app.js) and [privacy scope](./INTERVIEW.md).

Model and runtime references: [PrismML model repository](https://huggingface.co/prism-ml/Ternary-Bonsai-2-27B-gguf) and [pinned PrismML llama.cpp release](https://github.com/PrismML-Eng/llama.cpp/releases/tag/prism-b10683-d8f26ee). These identify the distribution, not the current state of the workstation.
