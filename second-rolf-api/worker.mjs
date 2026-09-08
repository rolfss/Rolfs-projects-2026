// Public edge: deliberately NOT a proxy to the private Hermes API.
const ORIGIN = 'https://rolfss.github.io';
const CONTRACT = 'second-rolf-local-v2';
const BODY_LIMIT = 48_000;

function reply(data,status=200,origin='') {
  return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin',
    ...(origin === ORIGIN ? {'Access-Control-Allow-Origin':origin}: {})}});
}
async function bounded(response,max) {
  if (!response.body) throw new Error('body');
  const reader=response.body.getReader(), parts=[]; let size=0;
  while (true) {
    const {done,value}=await reader.read(); if (done) break;
    size+=value.byteLength; if (size>max) { await reader.cancel(); throw new Error('size'); }
    parts.push(value);
  }
  const bytes=new Uint8Array(size); let offset=0;
  for (const p of parts) { bytes.set(p,offset); offset+=p.byteLength; }
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}
export function configuration(env) {
  try {
    const url=new URL(env.PUBLIC_BRIDGE_ORIGIN);
    return env.PUBLIC_CHAT_ENABLED === 'true' && url.protocol === 'https:' && url.pathname === '/' &&
      !url.username && !url.password && !url.search && !url.hash &&
      /^[a-f\d]{64}$/i.test(env.PUBLIC_BRIDGE_KEY ?? '') &&
      Boolean(env.CF_ACCESS_CLIENT_ID && env.CF_ACCESS_CLIENT_SECRET && env.TURNSTILE_SITE_KEY &&
        env.TURNSTILE_SECRET_KEY && env.SECOND_ROLF_RATE);
  } catch { return false; }
}
async function bridge(path,body,env,fetcher) {
  const response=await fetcher(new URL(path,env.PUBLIC_BRIDGE_ORIGIN),{method:body?'POST':'GET',redirect:'error',
    headers:{Authorization:`Bearer ${env.PUBLIC_BRIDGE_KEY}`,'Content-Type':'application/json',
      'CF-Access-Client-Id':env.CF_ACCESS_CLIENT_ID,'CF-Access-Client-Secret':env.CF_ACCESS_CLIENT_SECRET},
    body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(body?85_000:6500)});
  if (!response.ok) throw new Error('bridge');
  const data=await bounded(response,24_000);
  if (data.contract!==CONTRACT || data.localOnly!==true) throw new Error('contract');
  return data;
}
async function limited(request,env) {
  const ip=request.headers.get('CF-Connecting-IP');
  if (!ip) return true;
  const enc=new TextEncoder();
  const key=await crypto.subtle.importKey('raw',enc.encode(env.PUBLIC_BRIDGE_KEY),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const hash=await crypto.subtle.sign('HMAC',key,enc.encode(`${new Date().toISOString().slice(0,10)}:${ip}`));
  const rateKey=Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('');
  return !(await env.SECOND_ROLF_RATE.limit({key:rateKey})).success;
}
export function cleanBody(data) {
  if (!data || Array.isArray(data) || typeof data!=='object' ||
    Object.keys(data).some(k=>!['question','history','requestId','turnstileToken'].includes(k)) ||
    typeof data.question!=='string' || data.question.trim().length<2 || data.question.length>1200 ||
    typeof data.requestId!=='string' || !/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(data.requestId) ||
    typeof data.turnstileToken!=='string' || !data.turnstileToken || data.turnstileToken.length>2048 ||
    !Array.isArray(data.history) || data.history.length>8 || data.history.length%2) throw new Error('request');
  let size=0;
  for (let i=0;i<data.history.length;i++) {
    const m=data.history[i];
    if (!m || Object.keys(m).some(k=>!['role','content'].includes(k)) || m.role!==(i%2?'assistant':'user') ||
      typeof m.content!=='string' || !m.content.trim() || m.content.length>3000) throw new Error('history');
    size+=m.content.length;
  }
  if (size>10_000) throw new Error('history');
  return {question:data.question.trim(),history:data.history,requestId:data.requestId};
}
export async function handle(request,env,fetcher=fetch) {
  const path=new URL(request.url).pathname, origin=request.headers.get('Origin') ?? '';
  const health=path==='/api/second-rolf/health';
  if (!health && path!=='/api/second-rolf') return reply({error:'not_found'},404,origin);
  if (request.method==='OPTIONS' && origin===ORIGIN) return new Response(null,{status:204,headers:{
    'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Methods':'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600','Vary':'Origin'}});
  if ((health && request.method!=='GET') || (!health && request.method!=='POST')) return reply({error:'method'},405,origin);
  if (!health && origin!==ORIGIN) return reply({error:'origin'},403);
  if (!configuration(env)) return health ? reply({configured:false,ready:false,localOnly:false,mode:'static',contract:CONTRACT},200,origin):
    reply({error:'not_configured',message:'Live-chatten er ikke aktivert. Ingen KI-forespørsel ble sendt.'},503,origin);
  try {
    if (await limited(request,env)) return reply({error:'rate_limit',message:'For mange forespørsler. Prøv senere.'},429,origin);
    if (health) {
      const data=await bridge('/health',null,env,fetcher);
      if (data.ready!==true || data.toolsEnabled!==false) throw new Error('not_ready');
      return reply({...data,configured:true,siteKey:env.TURNSTILE_SITE_KEY},200,origin);
    }
    if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type') ?? '')) return reply({error:'json_required'},415,origin);
    let raw, clean;
    try { raw=await bounded(request,BODY_LIMIT); clean=cleanBody(raw); }
    catch { return reply({error:'invalid_request'},400,origin); }
    const verification=await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({secret:env.TURNSTILE_SECRET_KEY,response:raw.turnstileToken,
        remoteip:request.headers.get('CF-Connecting-IP')}),signal:AbortSignal.timeout(6000),redirect:'error'});
    const result=await bounded(verification,8000);
    if (!verification.ok || result.success!==true || result.hostname!=='rolfss.github.io' || result.action!=='second-rolf-chat')
      return reply({error:'bot_check',message:'Sikkerhetskontrollen må fullføres på nytt.'},403,origin);
    const status=await bridge('/health',null,env,fetcher);
    if (!status.ready || status.toolsEnabled!==false) throw new Error('not_ready');
    const answer=await bridge('/chat',clean,env,fetcher);
    if (!['local-rag','static'].includes(answer.mode) || typeof answer.answer!=='string' || answer.answer.length>5000 ||
      !Array.isArray(answer.citations) || answer.citations.length>4) throw new Error('invalid_answer');
    return reply(answer,200,origin);
  } catch {
    return health ? reply({configured:true,ready:false,localOnly:false,mode:'static',contract:CONTRACT},200,origin):
      reply({error:'local_unavailable',message:'Lokal KI er utilgjengelig. Ingen skymodell kobles inn automatisk.'},503,origin);
  }
}
export default {fetch:handle};
