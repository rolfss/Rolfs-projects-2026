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
    const answer = await infer({ question: 'What is 2 + 2? Answer with only the digit 4.', history: [], profileRevision: PROFILE_REVISION }, new AbortController().signal);
    if (answer.trim() !== '4') throw new Error('The model failed the arithmetic check.');
    console.log(`PASS: local /v1/chat/completions returned a completed ${MODEL} answer with the current public prompt.`);
    console.log(`Verified full GPU layer offload and live NVIDIA compute process: ${local.gpu}.`);
    if (!local.gpu) { failed = true; console.error('FAIL: GPU readiness could not be verified from the runtime status and live NVIDIA process.'); }
    console.log('This tests local inference, not the browser/Turnstile path or answer quality.');
  } catch {
    failed = true;
    console.error(`FAIL: local ${MODEL} inference is not ready. Start the Second Rolf Bonsai runtime on 127.0.0.1:8099 and set SECOND_ROLF_MODEL_STATUS to its private runtime status file.`);
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
