export const CONTRACT='second-rolf-local-v2';
export const BACKEND='https://second-rolf-api.rolfsselas.workers.dev';
export function safeLink(value) {
  try { const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password ? u.href:null; } catch { return null; }
}
export function ready(data) {
  return data?.contract===CONTRACT && data.ready===true && data.localOnly===true && data.toolsEnabled===false &&
    data.mode==='local-rag' && typeof data.siteKey==='string' && Boolean(data.siteKey);
}
export function trimHistory(history) {
  const result=history.slice(-8).map(m=>({role:m.role,content:m.content.slice(0,3000)}));
  while (result.reduce((n,m)=>n+m.content.length,0)>10000) result.splice(0,2);
  return result;
}
export function validateResponse(data) {
  if (data?.contract!==CONTRACT || data.localOnly!==true || !['local-rag','static'].includes(data.mode) ||
    typeof data.answer!=='string' || !data.answer.trim() || data.answer.length>5000 || !Array.isArray(data.citations) || data.citations.length>4)
    throw new Error('Ugyldig svarformat.');
  for (const c of data.citations) if (typeof c.title!=='string' || c.title.length>250 ||
    typeof c.quote!=='string' || c.quote.length>240 || (c.url!==null && !safeLink(c.url))) throw new Error('Ugyldig kilde.');
  return data;
}
