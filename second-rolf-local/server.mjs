import http from 'node:http';
import { readFileSync } from 'node:fs';
import { timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { CONTRACT, LIMITS, digest, validateQuestion, validateCorpus, retrieve,
  buildMessages, validateAnswer, readJsonBounded } from './core.mjs';

const CLOUD_NAME = /(?:^|[:/_-])cloud(?:$|[:/_-])/i;
export function validateModelConfig(config, isolated = false) {
  if (!config || typeof config.model !== 'string' || !config.model.trim() ||
    config.model.length > 150 || CLOUD_NAME.test(config.model) ||
    !/^[a-f\d]{64}$/i.test(config.digest ?? '')) throw new Error('Pin an installed local GGUF model and its SHA-256 digest.');
  const url = new URL(config.origin);
  const safeOrigin = isolated ? url.origin === 'http://model:11434' :
    url.protocol === 'http:' && ['127.0.0.1','[::1]'].includes(url.hostname) && Boolean(url.port);
  if (!safeOrigin || url.username || url.password || url.pathname !== '/' || url.search || url.hash)
    throw new Error('Model endpoint must be the isolated model service or a literal loopback address.');
  return { model:config.model, digest:config.digest.toLowerCase(), origin:url.origin };
}

export function ollamaBackend(config, isolated = false, fetcher = fetch) {
  const cfg = validateModelConfig(config, isolated);
  async function call(path, body, signal) {
    const response = await fetcher(`${cfg.origin}${path}`, {method:body ? 'POST':'GET',
      redirect:'error', headers:body ? {'Content-Type':'application/json'}:{},
      body:body ? JSON.stringify(body):undefined, signal });
    if (!response.ok) throw new Error('Local model server unavailable.');
    return readJsonBounded(response.body, 2_000_000);
  }
  return {
    model: cfg.model,
    async ready(signal) {
      const tags = await call('/api/tags', null, signal);
      const model = tags.models?.find(m => m.name === cfg.model);
      if (!model || model.digest?.replace(/^sha256:/,'').toLowerCase() !== cfg.digest ||
        model.remote_host || model.remote_model || model.details?.format !== 'gguf')
        throw new Error('Local model weights were not verified.');
      const info = await call('/api/show', {model:cfg.model}, signal);
      if (info.remote_host || info.remote_model || info.details?.format !== 'gguf' || !info.model_info)
        throw new Error('Remote or unverified model refused.');
      return true;
    },
    async answer(messages, signal) {
      const data = await call('/api/chat', {model:cfg.model, messages, stream:false, format:'json',
        think:false, keep_alive:'5m', options:{temperature:0.2, num_predict:1400, num_ctx:8192}}, signal);
      if (data.model !== cfg.model || data.message?.tool_calls?.length || typeof data.message?.content !== 'string' ||
          data.message.content.length > 8000) throw new Error('Invalid local-model response.');
      return data.message.content;
    }
  };
}

export function makeServer({key, corpus:rawCorpus, backend, isolated = false}) {
  if (typeof key !== 'string' || !/^[a-f\d]{64}$/i.test(key)) throw new Error('A 32-byte dedicated bridge key is required.');
  const corpus = validateCorpus(rawCorpus);
  const fingerprint = digest(JSON.stringify(corpus));
  let busy = false, day = '', used = 0;
  const recent = new Map();
  const auth = `Bearer ${key}`;
  function send(res, status, data) {
    res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
      'X-Content-Type-Options':'nosniff'});
    res.end(JSON.stringify(data));
  }
  const server = http.createServer(async (req,res) => {
    const header = req.headers.authorization ?? '';
    if (Buffer.byteLength(header) !== Buffer.byteLength(auth) || !timingSafeEqual(Buffer.from(header), Buffer.from(auth)))
      return send(res,401,{error:'unauthorized'});
    // Only the edge may call these routes. There are no admin, tool, import or proxy routes.
    if (!((req.url === '/health' && req.method === 'GET') || (req.url === '/chat' && req.method === 'POST')))
      return send(res,404,{error:'not_found'});
    if (req.method === 'GET') {
      let ready = false;
      try { ready = await backend.ready(AbortSignal.timeout(5000)); } catch {}
      return send(res,200,{contract:CONTRACT,localOnly:isolated,ready:isolated && ready && corpus.chunks.length > 0,
        mode:'local-rag',model:backend.model,corpusHash:fingerprint,chunks:corpus.chunks.length,
        sourceStatus:corpus.sourceStatus ?? [],toolsEnabled:false});
    }
    if (!isolated) return send(res,503,{error:'isolation_not_verified'});
    if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] ?? ''))
      return send(res,415,{error:'json_required'});
    if (busy) return send(res,429,{error:'busy'});
    busy = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 80_000);
    res.on('close', () => { if (!res.writableEnded) controller.abort(); });
    try {
      let request;
      try { request = validateQuestion(await readJsonBounded(req)); }
      catch { return send(res,400,{error:'invalid_request'}); }
      const now = Date.now();
      for (const [id,expires] of recent) if (expires < now) recent.delete(id);
      if (recent.has(request.requestId)) return send(res,409,{error:'duplicate_request'});
      if (recent.size >= 1000) return send(res,429,{error:'capacity'});
      recent.set(request.requestId,now + 300_000);
      const today = new Date().toISOString().slice(0,10);
      if (today !== day) { day = today; used = 0; }
      // Resource cap, NOT a billing ledger. Counters reset on process restart.
      if (used >= 100) return send(res,429,{error:'daily_capacity'});
      const sources = retrieve(corpus,request.question,request.history);
      if (!sources.length) return send(res,200,{contract:CONTRACT,localOnly:true,mode:'static',
        status:'insufficient',answer:'No reviewed source matches this question. / Ingen godkjent kilde dekker spørsmålet.',citations:[]});
      await backend.ready(controller.signal);
      used += 1;
      const raw = await backend.answer(buildMessages(request,sources),controller.signal);
      const answer = validateAnswer(raw,sources);
      return send(res,200,{...answer,contract:CONTRACT,localOnly:true,mode:'local-rag',model:backend.model,corpusHash:fingerprint});
    } catch {
      if (!res.destroyed) send(res,503,{error:'local_model_unavailable'});
    } finally { clearTimeout(timer); busy = false; }
  });
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  server.timeout = 90_000;
  server.maxConnections = 16;
  server.maxHeadersCount = 30;
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const isolated = process.env.ROLF_ISOLATED === 'docker-internal';
    const config = JSON.parse(readFileSync(process.env.ROLF_CONFIG ?? '.local/model.json','utf8'));
    const corpus = JSON.parse(readFileSync(process.env.ROLF_CORPUS ?? '.local/corpus.json','utf8'));
    const key = readFileSync(process.env.ROLF_KEY_FILE ?? '.local/bridge-key','utf8').trim();
    const server = makeServer({key,corpus,backend:ollamaBackend(config,isolated),isolated});
    server.listen(8788,isolated ? '0.0.0.0':'127.0.0.1',() => console.log(`Second Rolf ${CONTRACT}; ${isolated ? 'isolated deployment':'diagnostic mode only'}.`));
    // Never log requests, answers, credentials or caught upstream errors.
  } catch { console.error('Startup refused: check reviewed corpus, model configuration and bridge key.'); process.exitCode=1; }
}
