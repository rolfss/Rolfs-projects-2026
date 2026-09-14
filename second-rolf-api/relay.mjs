import { DurableObject } from 'cloudflare:workers';
import { MODEL, PROFILE_REVISION, MAX_ANSWER, cleanConversation } from './protocol.mjs';

// One object coordinates one physical GPU. Chat text is intentionally transient.
export class LocalRelay extends DurableObject {
  constructor(ctx, env) { super(ctx, env); this.pending = new Map(); }

  async fetch() {
    for (const old of this.ctx.getWebSockets()) old.close(1000, 'Reconnected');
    this.finishAll();
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ available: false, gpu: false, checkedAt: 0, profileRevision: '' });
    return new Response(null, { status: 101, webSocket: client });
  }

  health() {
    const socket = this.ctx.getWebSockets().find(s => s.readyState === 1);
    const state = socket?.deserializeAttachment();
    const current = state?.profileRevision === PROFILE_REVISION;
    const available = Boolean(current && state?.available && Date.now() - state.checkedAt < 45_000);
    return { available, gpu: Boolean(available && state?.gpu), busy: this.pending.size > 0, profileRevision: current ? PROFILE_REVISION : '' };
  }

  async chat(data) {
    const conversation = cleanConversation(data);
    if (!this.health().available) return { error: 'local_model_unavailable' };
    if (this.pending.size) return { error: 'busy' };
    const socket = this.ctx.getWebSockets().find(s => s.readyState === 1);
    const id = crypto.randomUUID();
    return new Promise(resolve => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        if (socket.readyState === 1) socket.send(JSON.stringify({ type: 'cancel', id }));
        resolve({ error: 'local_model_unavailable' });
      }, 90_000);
      this.pending.set(id, { resolve, timer, socket });
      try { socket.send(JSON.stringify({ type: 'chat', id, ...conversation, profileRevision: PROFILE_REVISION })); }
      catch { this.finish(id, { error: 'local_model_unavailable' }); }
    });
  }

  webSocketMessage(socket, raw) {
    if (typeof raw !== 'string' || raw.length > 40_000) { socket.close(1009, 'Message too large'); return; }
    let data;
    try { data = JSON.parse(raw); } catch { socket.close(1003, 'Invalid JSON'); return; }
    if (data.type === 'health') {
      const current = data.profileRevision === PROFILE_REVISION;
      const available = current && data.available === true && data.model === MODEL;
      socket.serializeAttachment({ available, gpu: available && data.gpu === true, checkedAt: Date.now(), profileRevision: current ? PROFILE_REVISION : '' });
      if (!available) this.finishAll(socket);
      socket.send(JSON.stringify({ type: 'ack' }));
      return;
    }
    if (data.type === 'answer' && this.pending.get(data.id)?.socket === socket) {
      const current = data.profileRevision === PROFILE_REVISION && socket.deserializeAttachment()?.profileRevision === PROFILE_REVISION;
      const answer = current && typeof data.answer === 'string' ? data.answer.trim().slice(0, MAX_ANSWER) : '';
      if (!answer) socket.serializeAttachment({ available: false, gpu: false, checkedAt: Date.now(), profileRevision: '' });
      this.finish(data.id, answer ? { answer } : { error: 'local_model_unavailable' });
    }
  }

  finish(id, result) {
    const request = this.pending.get(id);
    if (!request) return;
    clearTimeout(request.timer); this.pending.delete(id); request.resolve(result);
  }
  finishAll(socket) {
    for (const [id, request] of this.pending) if (!socket || request.socket === socket) this.finish(id, { error: 'local_model_unavailable' });
  }
  webSocketClose(socket) { this.finishAll(socket); }
  webSocketError(socket) { this.finishAll(socket); }
}
