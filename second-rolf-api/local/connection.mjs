import { MODEL, PROFILE_REVISION } from '../protocol.mjs';

// One GPU job globally, but health, timers and acknowledgements belong to the
// socket that started them. Late callbacks may never act on its replacement.
export function connect(config, { WebSocketClient, logger = console, modelClient } = {}) {
  const url = new URL(config.workerUrl);
  if (url.protocol !== 'https:' || url.hostname !== 'second-rolf-api.rolfsselas.workers.dev' || url.username || url.password) throw new Error('Unexpected Worker address');
  if (typeof config.key !== 'string' || config.key.length < 40) throw new Error('Missing connector key');
  url.protocol = 'wss:'; url.pathname = '/api/local/connect'; url.search = ''; url.hash = '';
  let stopping = false, current, reconnectTimer, active, warming;
  function open() {
    if (stopping) return;
    const ws = new WebSocketClient(url, { headers: { Authorization: `Bearer ${config.key}` }, handshakeTimeout: 15_000, maxPayload: 48_000 });
    const session = { ws, closed: false, probing: false, lastAck: 0, verifiedAt: 0,
      warnedRevision: false, modelReady: null, controller: new AbortController(), timer: undefined };
    current = session;
    const live = () => !stopping && current === session && !session.closed && ws.readyState === 1;
    const send = data => {
      if (!live()) return;
      try { ws.send(JSON.stringify(data)); } catch { ws.terminate(); }
    };
    function report(available, gpu = false) {
      if (!live() || session.modelReady === available) return;
      session.modelReady = available;
      if (available) logger.log('Local model ready: ' + MODEL + (gpu ? ' (GPU).' : '.'));
      else logger.warn('Local model unavailable. Start the Second Rolf Bonsai runtime and check its status file. The connector will retry automatically.');
    }
    const unavailable = () => send({ type: 'health', available: false, gpu: false, model: MODEL, profileRevision: PROFILE_REVISION });
    async function heartbeat() {
      if (!live()) return;
      // A hung model probe must not suppress the transport watchdog.
      if (Date.now() - session.lastAck > 60_000) { ws.terminate(); return; }
      if (session.probing) {
        // Keep the connection alive during a bounded warmup, without claiming
        // the model is ready or accepting a competing visitor inference.
        if (warming?.session === session) unavailable();
        return;
      }
      session.probing = true;
      try {
        let status = await modelClient.probeModel(false, session.controller.signal);
        if (!live()) return;
        if (!active && !warming && (!status.available || Date.now() - session.verifiedAt > 300_000)) {
          const job = { session }; warming = job;
          try { status = await modelClient.probeModel(true, session.controller.signal); }
          finally { if (warming === job) warming = undefined; }
          if (!live()) return;
          session.verifiedAt = status.available ? Date.now() : 0;
        }
        if (!status.available) session.verifiedAt = 0;
        const available = status.available && session.verifiedAt > 0;
        send({ type: 'health', ...status, profileRevision: PROFILE_REVISION, available });
        report(available, status.gpu);
      } catch {
        if (!live()) return;
        session.verifiedAt = 0; unavailable(); report(false);
      } finally { session.probing = false; }
    }
    ws.on('open', () => {
      if (!live()) return;
      session.lastAck = Date.now();
      logger.log('Cloudflare connection established; checking local Bonsai model.');
      void heartbeat(); session.timer = setInterval(() => { void heartbeat(); }, 15_000);
    });
    ws.on('message', async raw => {
      if (!live()) return;
      let data;
      try { data = JSON.parse(raw.toString()); } catch { return; }
      if (!data || typeof data !== 'object' || Array.isArray(data)) return;
      if (data.type === 'ack') {
        session.lastAck = Date.now();
        if (data.profileRevision !== PROFILE_REVISION && !session.warnedRevision) {
          session.warnedRevision = true;
          logger.warn('Worker/profile version mismatch. Update the checkout, deploy the Worker and restart this connector. A PC reboot is not required.');
        }
        return;
      }
      if (data.type === 'cancel' && active?.session === session && active.id === data.id) { active.controller.abort(); return; }
      if (data.type !== 'chat' || typeof data.id !== 'string') return;
      if (active || warming) { send({ type: 'answer', id: data.id, error: 'busy', profileRevision: PROFILE_REVISION }); return; }
      const job = { id: data.id, controller: new AbortController(), session }; active = job;
      try {
        const answer = await modelClient.infer(data, job.controller.signal);
        if (!live() || job.controller.signal.aborted) return;
        session.verifiedAt = Date.now();
        send({ type: 'answer', id: data.id, answer, profileRevision: PROFILE_REVISION });
      } catch {
        if (!live()) return;
        if (!job.controller.signal.aborted) session.verifiedAt = 0;
        send({ type: 'answer', id: data.id, error: 'local_model_unavailable', profileRevision: PROFILE_REVISION });
      } finally { if (active === job) active = undefined; }
    });
    ws.on('error', () => {}); // Never log credentials, prompts or answers.
    ws.on('close', () => {
      if (session.closed) return;
      session.closed = true;
      clearInterval(session.timer); session.controller.abort();
      if (active?.session === session) active.controller.abort();
      if (current !== session) return;
      current = undefined;
      if (!stopping) { logger.log('Connection closed; retrying.'); reconnectTimer = setTimeout(open, 5000); }
    });
  }
  open();
  return () => {
    stopping = true; clearTimeout(reconnectTimer);
    if (current) { clearInterval(current.timer); current.controller.abort(); }
    active?.controller.abort(); current?.ws.close();
  };
}
