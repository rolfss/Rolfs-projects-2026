# Second Rolf: public technical self-description

The public knowledge records `ai`, `ai-model`, `ai-hardware`, `ai-knowledge` and `ai-privacy` in `site/second-rolf/knowledge.js` describe the actual documented application, not hypothetical features of the underlying model.

- **Model:** Ministral 3 14B, Ollama ID `ministral-3:14b`, documented Q4_K_M variant. The application requests 8,192 context tokens and at most 1,000 new tokens.
- **Documented workstation:** Windows, NVIDIA GeForce RTX 5070 Ti with 16 GB VRAM, AMD Ryzen 7 9800X3D, 32 GB RAM. This is configuration documentation, not live hardware telemetry.
- **Architecture:** HTML/CSS/JavaScript on GitHub Pages → Cloudflare Worker / Durable Object → authenticated outbound WebSocket from the PC → Node.js connector → loopback Ollama → local inference.
- **Grounding:** the complete bounded public professional dataset is supplied as system context, with limited conversation history. No fine-tuning on Rolf, embedding retrieval or vector database is implemented. Profile mode is keyword-based selection of written facts, not model inference.
- **Boundary:** public messages pass through Cloudflare. No paid cloud-model fallback, model tools, private file access, shell or browsing. The existing professional-only profile and generic civic wording remain unchanged.

## Applying this knowledge revision

The browser, Worker and local connector must agree on `2026-09-15-technical-self-description`. Publishing GitHub Pages updates the visible page and built-in profile answers, but does not redeploy Cloudflare or update a running Windows process.

For live model answers, update the PC checkout to the merged commit and restart the existing connector using its existing private configuration. Deploy the Worker from that same revision following [README.md](./README.md#deploy-the-public-backend). No model retraining, model download or full PC reboot is needed for this content change. Do not replace or publish secrets. Until all components match, the page deliberately uses current profile-mode answers rather than an older model context.

## Evidence

Implementation and workstation documentation: [README.md](./README.md), [protocol.mjs](./protocol.mjs), [local/connector.mjs](./local/connector.mjs), and [the browser app](../site/second-rolf/app.js).

Model references checked September 15, 2026: [Mistral model card](https://docs.mistral.ai/models/ministral-3-14b-25-12) and [Ollama model entry](https://ollama.com/library/ministral-3:14b). These establish the model variant, not the current state of the workstation.
