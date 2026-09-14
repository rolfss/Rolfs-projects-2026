import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import WebSocket from 'ws';
import { MODEL, modelRequest, MAX_ANSWER, readJsonBounded } from '../protocol.mjs';

const OLLAMA = 'http://127.0.0.1:11434';

export async function infer(conversation, signal) {
  const response = await fetch(`${OLLAMA}/api/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(modelRequest(conversation)),
    signal: AbortSignal.any([signal, AbortSignal.timeout(85_000)])
  });
  if (!response.ok) throw new Error('Local inference failed');
  const data = await readJsonBounded(response, 100_000);
  if (data.model !== MODEL || data.done !== true || typeof data.message?.content !== 'string' || !data.message.content.trim()) throw new Error('Invalid local reply');
  return data.message.content.trim().slice(0, MAX_ANSWER);
}

export async function probeModel(warm = false) {
  if (warm) {
    const response = await fetch(`${OLLAMA}/api/generate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, prompt: 'Reply OK.', stream: false, keep_alive: '10m', options: { num_ctx: 8192, num_predict: 2 } }),
      signal: AbortSignal.timeout(85_000)
    });
    if (!response.ok) throw new Error('Warmup failed');
    const result = await readJsonBounded(response, 8000);
    if (!result.done || !result.response?.trim()) throw new Error('Model did not answer');
  }
  const response = await fetch(`${OLLAMA}/api/ps`, { signal: AbortSignal.timeout(4000) });
  if (!response.ok) throw new Error('Ollama unavailable');
  const data = await readJsonBounded(response, 16000);
  const model = data.models?.find(m => m.name === MODEL);
  return { available: Boolean(model), gpu: Boolean(model?.size_vram > 0), model: MODEL };
}

export function connect(config) {
  const url = new URL(config.workerUrl);
  if (url.protocol !== 'https:' || url.hostname !== 'second-rolf-api.rolfsselas.workers.dev' || url.username || url.password) throw new Error('Unexpected Worker address');
  if (typeof config.key !== 'string' || config.key.length < 40) throw new Error('Missing connector key');
  url.protocol = 'wss:'; url.pathname = '/api/local/connect'; url.search = ''; url.hash = '';
  let stopping = false, socket, timer, reconnectTimer, active, probing = false, lastAck = 0, verifiedAt = 0;
  const send = data => { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(data)); };
  async function heartbeat() {
    if (probing || socket?.readyState !== WebSocket.OPEN) return;
    if (lastAck && Date.now() - lastAck > 60_000) { socket.terminate(); return; }
    probing = true;
    try {
      let status = await probeModel(false);
      if (!active && (!status.available || Date.now() - verifiedAt > 300_000)) {
        status = await probeModel(true); verifiedAt = Date.now();
      }
      send({ type: 'health', ...status, available: status.available && verifiedAt > 0 });
    } catch { verifiedAt = 0; send({ type: 'health', available: false, gpu: false, model: MODEL }); }
    finally { probing = false; }
  }
  function open() {
    if (stopping) return;
    const ws = new WebSocket(url, { headers: { Authorization: `Bearer ${config.key}` }, handshakeTimeout: 15_000, maxPayload: 48_000 });
    socket = ws;
    ws.on('open', () => {
      lastAck = Date.now(); console.log('Second Rolf connected. Model: ' + MODEL);
      void heartbeat(); timer = setInterval(() => { void heartbeat(); }, 15_000);
    });
    ws.on('message', async raw => {
      let data;
      try { data = JSON.parse(raw.toString()); } catch { return; }
      if (data.type === 'ack') { lastAck = Date.now(); return; }
      if (data.type === 'cancel' && active?.id === data.id) { active.controller.abort(); return; }
      if (data.type !== 'chat' || typeof data.id !== 'string') return;
      if (active) { ws.send(JSON.stringify({ type: 'answer', id: data.id, error: 'busy' })); return; }
      const controller = new AbortController();
      active = { id: data.id, controller };
      try {
        const answer = await infer(data, controller.signal);
        verifiedAt = Date.now();
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'answer', id: data.id, answer }));
      } catch {
        verifiedAt = 0;
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'answer', id: data.id, error: 'local_model_unavailable' }));
      } finally { if (active?.controller === controller) active = null; }
    });
    ws.on('error', () => {}); // No credentials, prompts or answers are written to logs.
    ws.on('close', () => {
      clearInterval(timer); active?.controller.abort();
      if (!stopping) { console.log('Connection closed; retrying.'); reconnectTimer = setTimeout(open, 5000); }
    });
  }
  open();
  return () => { stopping = true; clearTimeout(reconnectTimer); clearInterval(timer); active?.controller.abort(); socket?.close(); };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const configFile = process.env.SECOND_ROLF_CONFIG || process.argv[2];
  if (!configFile) throw new Error('Provide the private connector configuration file.');
  const stop = connect(JSON.parse(fs.readFileSync(configFile, 'utf8')));
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
}
