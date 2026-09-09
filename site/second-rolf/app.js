import {BACKEND,ready,trimHistory,validateResponse,safeLink} from './client.mjs';
const $=s=>document.querySelector(s);
const messages=$('#messages'), input=$('#question'), status=$('#status b');
let history=[], active=null, generation=0, live=false, token='', widget=null;
const buttons=[...document.querySelectorAll('[data-prompt]'),$('#send')];
function badge(value) { live=value;$('#status').classList.toggle('live',value);status.textContent=value?'Lokal modell tilgjengelig':'Statisk profil · KI ikke tilkoblet'; }
function append(role,text,citations=[],mode='static') {
  const article=document.createElement('article');article.className=`message ${role}`;
  const avatar=document.createElement('div');avatar.className='avatar';avatar.textContent=role==='user'?'DU':'R2';
  const bubble=document.createElement('div'),label=document.createElement('span'),p=document.createElement('p');
  label.className='speaker';label.textContent=role==='user'?'Du':mode==='local-rag'?'Second Rolf · lokal KI':'Second Rolf · statisk informasjon';
  p.textContent=text;bubble.append(label,p);
  citations.forEach((c,i)=>{
    const box=document.createElement('details'),title=document.createElement('summary'),quote=document.createElement('p');
    box.className='sources';title.textContent=`[${i+1}] ${c.title}${c.page?` · PDF-side ${c.page}`:''}`;
    quote.textContent=`«${c.quote}»`;box.append(title,quote);
    const link=safeLink(c.url);if(link){const a=document.createElement('a');a.href=link;a.rel='noreferrer noopener';a.target='_blank';a.textContent='Åpne originalkilden';box.append(a);}
    if(c.kind==='repost'){const note=document.createElement('p');note.textContent=`Delt innlegg fra ${c.originalAuthor||'en annen forfatter'}. Deling er ikke dokumentasjon på tilslutning.`;box.append(note);}
    bubble.append(box);
  });
  article.append(avatar,bubble);messages.append(article);messages.scrollTop=messages.scrollHeight;
}
function staticAnswer(q) {
  if(/master|teresa|avila|bachelor|julian|norwich|thesis|oppgav/i.test(q)) return 'Oppgavene er lokalisert, men fullteksten er ikke lastet inn i denne statiske profilen. Jeg kan ikke uttale meg om innholdet uten kilder. Se kildestatusen nedenfor.';
  if(/cv|experience|erfaring|jobb|twitter|retweet|repost|polit/i.test(q)) return 'CV og utvalgte offentlige innlegg venter på kildeimport og gjennomgang. Jeg vil ikke fylle hullene med antakelser om Rolf.';
  if(/arkivmuse/i.test(q)) return 'Arkivmuseet er porteføljens digitale museum om dokumentasjon, offentlighet og etterprøvbarhet. Dette er forhåndsskrevet prosjektinformasjon, ikke et KI-generert svar.';
  if(/archive|metadata|metaready/i.test(q)) return 'Archive Assist hjelper med dokumenttitler og metadata; MetaReady viser informasjonskvalitet og forbedringstiltak. Se originalprosjektene fra porteføljesiden.';
  return 'Lokal KI er ikke tilkoblet. Denne statiske profilen kan vise prosjektinformasjon, men kan ikke føre en fri samtale eller lese oppgavene. Full Hermes-tilgang er for eieren, ikke offentlige besøkende.';
}
async function check() {
  $('#connect').disabled=true;
  try {
    const response=await fetch(`${BACKEND}/api/second-rolf/health`,{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(9000)});
    const data=await response.json();if(!response.ok||!ready(data))throw new Error('offline');
    if(!window.turnstile) await new Promise((resolve,reject)=>{
      const s=document.createElement('script');s.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';s.async=true;
      const timer=setTimeout(()=>reject(new Error('timeout')),10000);s.onload=()=>{clearTimeout(timer);resolve();};s.onerror=()=>{clearTimeout(timer);reject(new Error('load'));};document.head.append(s);
    });
    $('#turnstile').hidden=false;
    if(widget!==null)window.turnstile.remove(widget);
    token='';widget=window.turnstile.render($('#turnstile'),{sitekey:data.siteKey,action:'second-rolf-chat',theme:'light',
      callback:value=>{token=value;},'expired-callback':()=>{token='';},'error-callback':()=>{token='';return true;}});
    badge(true);
    const names={portfolio:'Portefølje',master:'Masteroppgave',bachelor:'Bacheloroppgave',cv:'CV',social:'Offentlige innlegg'};
    $('#source-status').textContent=(Array.isArray(data.sourceStatus)?data.sourceStatus:[]).slice(0,10)
      .map(s=>`${names[s.id]||s.id}: ${s.status==='indexed'?`${s.chunks} kildeutdrag lastet inn`:'ikke lastet inn'}`).join(' · ');
  } catch {badge(false);$('#notice').textContent='Ingen verifisert tilkobling til lokal KI. Ingen KI-spørsmål er sendt.';}
  finally {$('#connect').disabled=false;}
}
async function submit(question) {
  if(active)return;
  const q=question.trim();if(q.length<2||q.length>1200)return;
  if(live&&!token){$('#notice').textContent='Fullfør sikkerhetskontrollen før du sender.';return;}
  const current=++generation;active=new AbortController();buttons.forEach(b=>b.disabled=true);
  append('user',q);input.value='';$('#notice').textContent=live?'Den lokale modellen arbeider …':'';
  try {
    let data;
    if(live){
      const response=await fetch(`${BACKEND}/api/second-rolf`,{method:'POST',credentials:'omit',cache:'no-store',
        headers:{'Content-Type':'application/json'},body:JSON.stringify({question:q,history:trimHistory(history),requestId:crypto.randomUUID(),turnstileToken:token}),
        signal:AbortSignal.any([active.signal,AbortSignal.timeout(95000)])});
      if(!response.ok)throw new Error('unavailable');data=validateResponse(await response.json());
    } else data={answer:staticAnswer(q),citations:[],mode:'static'};
    if(current!==generation)return;
    append('assistant',data.answer,data.citations,data.mode);
    // Keep only actual generated complete turns; never present static text as previous model output.
    if(data.mode==='local-rag')history=trimHistory([...history,{role:'user',content:q},{role:'assistant',content:data.answer}]);
    $('#notice').textContent='';
  } catch {
    if(current!==generation)return;badge(false);
    append('assistant','Lokal KI svarte ikke med et kontrollerbart svar. Ingen skymodell kobles inn automatisk. Prøv tilkoblingen igjen eller bruk prosjektlenkene.');
    $('#notice').textContent='Svaret ble ikke fullført.';
  } finally {
    if(current===generation){active=null;buttons.forEach(b=>b.disabled=false);token='';if(widget!==null&&window.turnstile)window.turnstile.reset(widget);input.focus();}
  }
}
$('#composer').addEventListener('submit',e=>{e.preventDefault();submit(input.value);});
input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();submit(input.value);}});
document.querySelectorAll('[data-prompt]').forEach(b=>b.addEventListener('click',()=>submit(b.dataset.prompt)));
$('#clear').addEventListener('click',()=>{generation++;active?.abort();active=null;history=[];messages.replaceChildren();buttons.forEach(b=>b.disabled=false);input.value='';$('#notice').textContent='Samtalen er tømt fra denne fanen.';input.focus();});
$('#connect').addEventListener('click',check);
badge(false);
// No external connection or bot-check script loads until the visitor opts in.
