import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { connect, createModelClient, awaitBridgeOwnership } from '../local/connector.mjs';
import { MODEL, PROFILE_REVISION } from '../protocol.mjs';

const config = { workerUrl: 'https://second-rolf-api.rolfsselas.workers.dev', key: 'private-test-connector-key-'.repeat(3) };
const flush = () => new Promise(resolve => setImmediate(resolve));

test('a supervised connector waits for its exact saved identity before opening a relay connection', async () => {
  const executable = 'C:\\Program Files\\nodejs\\node.exe';
  const scriptFile = 'C:\\SecondRolf\\releases\\bonsai-test\\second-rolf-api\\local\\connector.mjs';
  const configFile = 'C:\\SecondRolf\\.private\\config.json';
  const status = { processId: 1234, executable, startTicks: '639254412341234567', connectorPath: scriptFile, configPath: configFile };
  const options = { statusFile: 'C:\\SecondRolf\\.private\\bridge-status.json', scriptFile, processId: 1234, executable,
    identify: async () => status, attempts: 1, delay: async () => {}, readStatus: async () => status };
  await awaitBridgeOwnership(configFile, options);
  for (const saved of [null, { processId: 0 }, { ...status, processId: 5678 }, { ...status, startTicks: '639254412341234568' },
    { ...status, executable: 'C:\\Other\\node.exe' }, { ...status, connectorPath: 'C:\\unrelated.mjs' }, { ...status, configPath: 'C:\\other-config.json' }]) {
    await assert.rejects(awaitBridgeOwnership(configFile, { ...options, readStatus: async () => saved }), /refusing an untracked connection/);
  }
  let reads = 0;
  await awaitBridgeOwnership(configFile, { ...options, attempts: 3, readStatus: async () => ++reads === 1 ? { processId: 0 } : status });
  assert.equal(reads, 2, 'a record committed just after spawn releases the child');
});

function harness(t, modelClient) {
  const lines = [], sockets = [];
  class FakeWebSocket extends EventEmitter {
    readyState = 0;
    sent = [];
    constructor() { super(); sockets.push(this); }
    open() { this.readyState = 1; this.emit('open'); }
    send(raw) {
      const data = JSON.parse(raw);
      this.sent.push(data);
      if (data.type === 'health') queueMicrotask(() => this.emit('message', JSON.stringify({ type: 'ack', profileRevision: PROFILE_REVISION })));
    }
    close() { this.readyState = 3; this.emit('close'); }
    terminate() { this.close(); }
  }
  t.mock.timers.enable({ apis: ['setInterval'] });
  const stop = connect(config, { WebSocketClient: FakeWebSocket, modelClient, logger: {
    log: text => lines.push({ level: 'log', text }), warn: text => lines.push({ level: 'warn', text })
  } });
  t.after(stop);
  return { lines, socket: sockets[0], stop, tick: async () => { t.mock.timers.tick(15_000); await flush(); } };
}

function runtime() {
  const state = { online: false, statusPresent: true, answer: '4', identity: MODEL, warmups: 0 };
  const status = { model: MODEL, processId: 1234, executable: 'C:\\Bonsai\\llama-server.exe', startTicks: '639254412341234567', gpuLayers: 65, totalLayers: 65 };
  const client = createModelClient({
    readRuntimeStatus: async () => state.statusPresent ? status : null,
    inspectProcess: async () => ({ ...status, listenerPort: 8099 }),
    gpuProcesses: async () => [1234],
    fetchImpl: async (url, options) => {
      if (!state.online) throw new Error('Connection refused; private details: ' + config.key);
      if (url.endsWith('/health')) return Response.json({ status: 'ok' });
      if (url.endsWith('/v1/models')) return Response.json({ data: [{ id: MODEL }] });
      assert.equal(url, 'http://127.0.0.1:8099/v1/chat/completions');
      assert.equal(JSON.parse(options.body).model, MODEL);
      state.warmups++;
      return Response.json({ model: state.identity, object: 'chat.completion', choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: JSON.stringify({ answer: state.answer, source_ids: [] }) } }] });
    }
  });
  return { state, client };
}

test('relay reports missing Bonsai, recovers, and reports subsequent loss without repeated warnings', async t => {
  const { state, client } = runtime();
  const h = harness(t, client);
  h.socket.open();
  assert.deepEqual(h.lines, [{ level: 'log', text: 'Cloudflare connection established; checking local Bonsai model.' }]);
  await flush();
  assert.equal(h.socket.sent.at(-1).available, false);
  assert.match(h.lines.at(-1).text, /Local model unavailable\. Start the Second Rolf Bonsai runtime/);
  assert.equal(h.lines.at(-1).level, 'warn');
  assert.doesNotMatch(h.lines.map(line => line.text).join('\n'), /General chat enabled|private-test|Connection refused/);
  await h.tick();
  assert.equal(h.lines.length, 2);
  assert.equal(h.socket.sent.length, 2, 'offline health continues even without another warning');
  state.online = true;
  await h.tick();
  assert.equal(state.warmups, 1, 'recovery verifies a real answer before reporting readiness');
  assert.equal(h.socket.sent.at(-1).available, true);
  assert.equal(h.socket.sent.at(-1).profileRevision, PROFILE_REVISION);
  assert.equal(h.socket.sent.at(-1).model, MODEL);
  assert.equal(h.socket.sent.at(-1).gpu, true);
  assert.match(h.lines.at(-1).text, /Local model ready: .* \(GPU\)/);
  await h.tick();
  assert.equal(h.lines.length, 3);
  assert.equal(state.warmups, 1, 'ready checks avoid unnecessary repeated inference');
  state.online = false;
  await h.tick();
  assert.equal(h.socket.sent.at(-1).available, false);
  assert.equal(h.lines.length, 4);
  assert.match(h.lines.at(-1).text, /Local model unavailable/);
});

test('incorrect warmup identity stays unavailable and profile mismatch warnings remain explicit', async t => {
  const { state, client } = runtime();
  state.online = true; state.identity = 'different-model';
  const h = harness(t, client);
  h.socket.open();
  await flush();
  assert.equal(h.socket.sent.at(-1).available, false);
  assert.doesNotMatch(h.lines.map(line => line.text).join('\n'), /Local model ready|General chat enabled/);
  for (let i = 0; i < 2; i++) h.socket.emit('message', JSON.stringify({ type: 'ack', profileRevision: 'old-profile' }));
  assert.equal(h.lines.filter(line => /Worker\/profile version mismatch/.test(line.text)).length, 1);
});

test('loss of runtime ownership stops readiness and recovery performs a new answer check', async t => {
  const { state, client } = runtime();
  state.online = true;
  const h = harness(t, client);
  h.socket.open();
  await flush();
  assert.equal(h.socket.sent.at(-1).available, true);
  state.statusPresent = false;
  await h.tick();
  assert.equal(h.socket.sent.at(-1).available, false);
  assert.equal(h.socket.sent.at(-1).gpu, false);
  state.statusPresent = true;
  await h.tick();
  assert.equal(h.socket.sent.at(-1).available, true);
  assert.equal(state.warmups, 2);
});

test('busy and cancellation retain single-request behavior without logging conversation content', async t => {
  let capturedSignal;
  const client = {
    probeModel: async () => ({ available: true, gpu: true, model: MODEL }),
    infer: async (_data, signal) => {
      capturedSignal = signal;
      return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('private conversation')), { once: true }));
    }
  };
  const h = harness(t, client);
  h.socket.open();
  await flush();
  h.socket.emit('message', JSON.stringify({ type: 'chat', id: 'first', profileRevision: PROFILE_REVISION, question: 'private conversation' }));
  h.socket.emit('message', JSON.stringify({ type: 'chat', id: 'second', profileRevision: PROFILE_REVISION, question: 'another visitor' }));
  assert.equal(h.socket.sent.at(-1).error, 'busy');
  h.socket.emit('message', JSON.stringify({ type: 'cancel', id: 'first' }));
  await flush();
  assert.equal(capturedSignal.aborted, true);
  assert.equal(h.socket.sent.at(-1).error, 'local_model_unavailable');
  assert.doesNotMatch(h.lines.map(line => line.text).join('\n'), /private conversation|another visitor/);
});

