import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { connect } from '../local/connection.mjs';
import { MODEL, PROFILE_REVISION } from '../protocol.mjs';
const config = { workerUrl: 'https://second-rolf-api.rolfsselas.workers.dev', key: 'synthetic-test-key-'.repeat(4) };
const ready = { available: true, gpu: true, model: MODEL };
const flush = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return { promise, resolve, reject }; };
function harness(t, modelClient) {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 1_000_000 });
  const sockets = [], logs = [];
  class Socket extends EventEmitter {
    readyState = 0; sent = []; autoAck = true;
    constructor() { super(); sockets.push(this); }
    open() { this.readyState = 1; this.emit('open'); }
    send(raw) { const data = JSON.parse(raw); this.sent.push(data); if (data.type === 'health' && this.autoAck) queueMicrotask(() => this.emit('message', JSON.stringify({ type: 'ack', profileRevision: PROFILE_REVISION }))); }
    message(data) { this.emit('message', JSON.stringify(data)); }
    close() { this.readyState = 3; this.emit('close'); }
    terminate() { this.close(); }
  }
  const stop = connect(config, { WebSocketClient: Socket, modelClient, logger: { log: s => logs.push(s), warn: s => logs.push(s) } });
  t.after(stop);
  return { sockets, logs, stop, tick: async ms => { t.mock.timers.tick(ms); await flush(); } };
}

test('a late failed probe from a disconnected socket cannot overwrite the replacement health', async t => {
  const old = deferred(); let calls = 0, oldSignal;
  const h = harness(t, { probeModel: async (_warm, signal) => { if (++calls === 1) { oldSignal = signal; return old.promise; } return ready; }, infer: async () => 'unused' });
  const first = h.sockets[0]; first.open(); await flush(); first.close();
  assert.equal(oldSignal.aborted, true);
  await h.tick(5000); const replacement = h.sockets[1]; replacement.open(); await flush();
  assert.equal(replacement.sent.at(-1).available, true);
  const before = replacement.sent.length; old.reject(new Error('synthetic private details')); await flush();
  assert.equal(replacement.sent.length, before);
  assert.equal(first.sent.length, 0);
  assert.doesNotMatch(h.logs.join('\n'), /synthetic private details|Local model unavailable/);
});

test('old close/message events cannot cancel a new inference or schedule extra reconnects', async t => {
  const answer = deferred(); let signal;
  const h = harness(t, { probeModel: async () => ready, infer: async (_data, s) => { signal=s; return answer.promise; } });
  const first=h.sockets[0]; first.open(); await flush(); first.close(); await h.tick(5000);
  const second=h.sockets[1]; second.open(); await flush();
  second.message({ type:'chat', id:'new', question:'synthetic' });
  first.emit('close'); first.message({ type:'cancel', id:'new' });
  assert.equal(signal.aborted, false);
  answer.resolve('current answer'); await flush();
  assert.equal(second.sent.at(-1).answer, 'current answer');
  await h.tick(15000); assert.equal(h.sockets.length, 2);
  assert.equal(second.sent.at(-1).type, 'health');
});

test('warmup keeps transport alive but excludes concurrent visitor inference', async t => {
  const warm=deferred(); let inferences=0;
  const h=harness(t,{ probeModel: async isWarm => isWarm ? warm.promise : ready, infer:async()=>{inferences++;return 'unused';} });
  const s=h.sockets[0]; s.open(); await flush();
  s.message({type:'chat',id:'visitor'}); assert.equal(s.sent.at(-1).error,'busy');
  for(let i=0;i<5;i++) await h.tick(15000);
  assert.equal(s.readyState,1); assert.equal(s.sent.at(-1).available,false); assert.equal(inferences,0);
  warm.resolve(ready); await flush(); assert.equal(s.sent.at(-1).available,true);
});

test('transport watchdog runs even while a probe is stuck', async t => {
  const stuck=deferred(); const h=harness(t,{probeModel:()=>stuck.promise,infer:async()=>''});
  const s=h.sockets[0]; s.open(); await flush(); await h.tick(75000);
  assert.equal(s.readyState,3); stuck.resolve(ready); await flush(); assert.equal(s.sent.length,0);
});

test('stop aborts probes and ignores late completions and malformed message shapes', async t => {
  const pending=deferred(); let signal;
  const h=harness(t,{probeModel:async(_warm,s)=>{signal=s;return pending.promise;},infer:async()=>''});
  const s=h.sockets[0]; s.open();
  for(const value of [null,[],42,'bad']) s.message(value);
  await flush(); h.stop(); assert.equal(signal.aborted,true);
  pending.resolve(ready); await flush(); await h.tick(100000);
  assert.equal(s.sent.length,0); assert.equal(h.sockets.length,1);
});

test('a disconnected inference still occupies the GPU slot until settled and cannot publish its result', async t => {
  const old=deferred(); let inferences=0, oldSignal;
  const h=harness(t,{probeModel:async()=>ready,infer:async(_data,s)=>{inferences++;oldSignal=s;return old.promise;}});
  const first=h.sockets[0]; first.open(); await flush(); first.message({type:'chat',id:'old'});
  first.close(); assert.equal(oldSignal.aborted,true); await h.tick(5000);
  const second=h.sockets[1]; second.open(); await flush(); second.message({type:'chat',id:'new'});
  assert.equal(second.sent.at(-1).error,'busy'); assert.equal(inferences,1);
  old.resolve('must not appear on replacement'); await flush();
  assert.equal(second.sent.some(m=>m.answer),false);
  await h.tick(15000); assert.equal(second.sent.at(-1).available,true);
});
