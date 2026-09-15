import { MODEL, PROFILE_REVISION } from '../protocol.mjs';
import { probeModel, infer } from './connector.mjs';
import { getStatus, statusDescription } from '../../site/second-rolf/status.js';

// Deliberately prints no private configuration, connector key or visitor conversation.
const localOnly = process.argv.includes('--local-only');
const publicOnly = process.argv.includes('--public-only');
if (localOnly && publicOnly) throw new Error('Choose either --local-only or --public-only.');
let failed = false;
if (!publicOnly) {
  try {
    const local = await probeModel(true);
    if (!local.available) throw new Error('The expected model is not loaded.');
    await infer({ question: 'What is 2 + 2? Answer briefly.', history: [], profileRevision: PROFILE_REVISION }, new AbortController().signal);
    console.log(`PASS: local /api/chat returned a completed ${MODEL} answer with the current public prompt.`);
    console.log(`Ollama reports GPU memory in use: ${local.gpu}.`);
    console.log('This tests local inference, not the browser/Turnstile path or answer quality.');
  } catch {
    failed = true;
    console.error(`FAIL: local ${MODEL} inference is not ready. Start Ollama on 127.0.0.1:11434 and ensure this model is installed.`);
  }
}
if (!localOnly) {
  const status = await getStatus();
  console.log(JSON.stringify({ model: status.model || null, modelOnline: status.modelOnline === true, chatAvailable: status.available === true, gpu: status.gpu === true, expectedProfile: PROFILE_REVISION, workerProfile: status.profileRevision || null, connectorProfile: status.connectorRevision || null, reason: status.reason }, null, 2));
  console.log(statusDescription(status));
  console.log('Public health is a readiness check, not an end-to-end browser chat test.');
  if (!status.available) failed = true;
}
process.exitCode = failed ? 1 : 0;
