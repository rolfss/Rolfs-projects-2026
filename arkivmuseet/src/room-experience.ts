import {benefitCard} from './benefits';
import type {Journey} from './journey';
import type {MuseumCase} from './types';
import {roomStories,newProgress,investigated,roomComplete,finalQuiz} from './room-stories';
import {roomScene,stampStrip,escapeHtml as esc} from './room-scene';
import './room-experience.css';
const $=<E extends HTMLElement>(s:string)=>document.querySelector<E>(s)!;
const phases=['Saken','Undersøk','Velg','Se følgene','Romprøven','Merket ditt'];
const earned=(j:Journey)=>roomStories.filter(s=>j.completed(s.id)).map(s=>s.id);
const button=(id:string,label:string,disabled=false)=>`<button id="${id}" class="primary" ${disabled?'disabled':''}>${label} <span aria-hidden="true">→</span></button>`;
function focusTitle(){const title=$('#mission-title');$('#story-content').scrollTop=0;title?.focus({preventScroll:true});}
export function renderRoom(j:Journey,c:MuseumCase,focus=false){
 const s=roomStories.find(s=>s.id===c.id)!,m=j.mission(c.id),p=j.rooms[c.id]??=newProgress(),done=investigated(s,p);
 const o=p.choice===null?null:m.options[p.choice],safe=o?.protected??null;
 j.sync(c.id);
 document.body.classList.add('room-experience');document.body.classList.remove('finale-mode');
 const svg=roomScene(s,p,p.phase>=3?safe:null);
 document.dispatchEvent(new CustomEvent('museum-story-stage',{detail:{id:c.id,p:structuredClone(p),safe:p.phase>=3?safe:null}}));
 j.hooks.stage(c.id,p.phase>=3?safe:null);
 $('#story-kicker').textContent=`ROM ${roomStories.indexOf(s)+1} / 5 · ${s.badge.toUpperCase()}`;
 let body='',nav='';
 const source=`<p class="room-source"><a href="${esc(c.sources[0].url)}" target="_blank" rel="noopener noreferrer">${esc(c.sources[0].institution)} · ${esc(c.sources[0].locator)} ↗</a></p>`;
 const scene=`<figure class="chapter-scene">${svg}<figcaption>${p.phase===0?'Illustrasjonen forklarer problemet. Den er ikke et originaldokument.':'Øvingsmodell. Handlingene dine endrer ikke den historiske saken.'}</figcaption></figure>`;
 const moral=`<div class="room-moral"><span>DETTE ER LÆRDOMMEN</span><p>${esc(s.moral)}</p><small>Museets faglige tolkning.</small></div>`;
 if(p.phase===0){
  body=`<p class="case-meta">${esc(c.organization)} · ${esc(c.eventDate)} · Historisk sak</p><h2 id="mission-title" tabindex="-1">${esc(s.title)}</h2>${benefitCard(c.id)}<p class="story-prose">${esc(s.opening)}</p><div class="room-problem"><strong>Det som sviktet</strong><p>${esc(s.problem)}</p></div>${scene}${source}<p class="room-boundary">${esc(c.consequence[0].text)}</p><p class="room-contract">Du skal undersøke et spor, prøve et ledervalg og svare på to spørsmål. Da får du rommets læringsmerke.</p>`;
  nav=`<span>Virkelig sak → tenkt øvelse</span>${button('step-next','Undersøk selv')}`;
 }else if(p.phase===1){
  body=`<p class="simulation-label">DIN TUR · TENKT ØVELSE</p><h2 id="mission-title" tabindex="-1">${s.id==='osen'?'Få sporet frem i lyset':s.id==='tokke'?'Prøv før du stenger':s.id==='innsyn'?'Bygg saksgangen':s.id==='hanekleiv'?'Se bak tunnelveggen':'Sett datoene på plass'}</h2><p class="story-prose">${esc(s.investigation)}</p>${scene}<div class="investigation-progress" aria-label="${p.investigation.length} av ${s.solution.length} kontroller utført">${s.solution.map((id,i)=>`<span class="${i<p.investigation.length?'solved':i===p.investigation.length?'active':''}">${i<p.investigation.length?'✓':i+1}</span>`).join('')}</div>${done?`<div class="room-feedback success" role="status"><strong>Du fant det avgjørende sporet.</strong><p>${esc(s.discovery)}</p></div>`:`<h3 class="puzzle-prompt">${esc(s.prompts[p.investigation.length])}</h3>${s.id==='osen'&&p.investigation.length===2?'<label class="journal-query">Søk etter et ord fra øvingspostens tittel<input id="journal-query" type="search" autocomplete="off" placeholder="Skriv et søkeord" maxlength="60"></label>':''}<div class="puzzle-tools puzzle-${s.id}">${s.tools.map(t=>`<button data-tool="${t.id}" ${p.investigation.includes(t.id)?'disabled':''}><span aria-hidden="true">${p.investigation.includes(t.id)?'✓':s.id==='npe'?'▦':s.id==='innsyn'?'▤':'↗'}</span>${esc(t.label)}</button>`).join('')}</div><p id="puzzle-feedback" class="room-feedback" role="status">${j.feedback[c.id]?esc(j.feedback[c.id]):'Prøv deg frem. Et feilspor koster ingenting.'}</p>`}`;
  nav=`<button id="case-recap">Les saken igjen</button>${button('step-next','Ta ledervalget',!done)}`;
 }else if(p.phase===2){
  body=`<p class="simulation-label">TENKT LEDERSITUASJON</p><h2 id="mission-title" tabindex="-1">${esc(m.decision)}</h2><p class="story-prose">${esc(m.brief)}</p>${scene}<p>Du har undersøkt problemet. Nå skal du velge hva virksomheten skal gjøre. Også de fristende snarveiene kan prøves.</p><div class="decision-options">${m.options.map((option,i)=>`<button data-decision="${i}"><span class="option-letter">${String.fromCharCode(65+i)}</span><span><strong>${esc(option.title)}</strong><small>${esc(option.tradeoff)}</small></span></button>`).join('')}</div>`;
  nav='<button id="case-recap">Les saken igjen</button><span>Velg et handlingsforløp.</span>';
 }else if(p.phase===3&&o){
  const e=o.timeline[p.turn],last=p.turn===o.timeline.length-1;
  body=`<p class="simulation-label">MULIG FØLGE · IKKE ET HISTORISK HENDELSESFORLØP</p><h2 id="mission-title" tabindex="-1">${esc(e.title)}</h2><p class="chosen-summary"><strong>Ditt valg:</strong> ${esc(o.title)}</p><div class="time-rail">${o.timeline.map((e,i)=>`<span class="${i<=p.turn?'passed':''}">${i+1}<small>${esc(e.when)}</small></span>`).join('')}</div>${scene}<p class="story-prose">${esc(e.text)}</p>${last?`${moral}<p>${esc(s.transfer)}</p><button id="compare-paths">Sammenlign to forløp ↔</button>`:''}`;
  nav=`<button id="retry-choice">Prøv et annet valg</button>${button('step-next',last?(safe?'Prøv det du har lært':'Velg et mer robust grep'):'Spol frem')}`;
 }else if(p.phase===4){
  const q=s.quiz[p.quizIndex],answer=p.answers[p.quizIndex],correct=answer===q.answer;
  body=`<p class="simulation-label">ROMPRØVEN · ${p.quizIndex+1} AV ${s.quiz.length}</p><h2 id="mission-title" tabindex="-1">${esc(q.question)}</h2><p class="quiz-invitation">Bruk det du nettopp undersøkte. Du kan lese saken og prøve igjen uten å miste fremdrift.</p><div class="quiz-options" role="group" aria-label="Svaralternativer">${q.options.map((a,i)=>`<button data-answer="${i}" class="${answer===i?(correct?'correct':'incorrect'):''}" aria-pressed="${answer===i}" ${correct?'disabled':''}><span>${String.fromCharCode(65+i)}</span>${esc(a)}</button>`).join('')}</div><div class="room-feedback ${correct?'success':''}" role="status">${answer!==null?`<strong>${correct?'✓ Det stemmer.':'Se nærmere på dette.'}</strong><p>${esc(q.feedback[answer])}</p>`:'Velg svaret du mener kilden og øvelsen gir grunnlag for.'}</div>${correct&&p.quizIndex===s.quiz.length-1?moral:''}`;
  nav=`<button id="case-recap">Les saken igjen</button>${button('step-next',p.quizIndex<s.quiz.length-1?'Neste spørsmål':'Samle læringsmerket',!correct)}`;
 }else{
  body=`<div class="earned-emblem" aria-hidden="true">✓</div><p class="simulation-label">LÆRINGSMERKE ${j.count()} / 5</p><h2 id="mission-title" tabindex="-1">${esc(s.badge)}</h2>${benefitCard(c.id)}${moral}${stampStrip(earned(j))}<p class="story-prose">${j.count()===5?'Alle fem rom er løst. Nå kan du åpne sluttrommet og bruke lærdommene sammen.':esc(s.bridge)}</p><div class="takeaway"><h3>Ta det med tilbake</h3><p>${esc(s.transfer)}</p><button id="room-add">${j.state.plan[c.id]?.selected?'✓ Lagt i lederbestillingen':'Legg til min lederbestilling + '}</button></div>`;
  nav=`<button id="case-recap">Saken og kildene</button>${button('step-next',j.count()===5?'Åpne sluttrommet':'Neste uløste rom')}`;
 }
 $('#story-content').innerHTML=`<div class="room-topline"><ol class="chapter-steps" aria-label="Romreisen">${phases.map((name,i)=>`<li ${i===p.phase?'aria-current="step"':''} class="${i<p.phase?'done':''}">${i<p.phase?'✓ ':''}${name}</li>`).join('')}</ol><button id="room-sources" aria-label="Kilder for dette rommet">Kilder ↗</button></div>${body}<p class="save-note">${j.storageAvailable?'Reisen lagres bare i denne nettleseren.':'Lagring er blokkert. Reisen beholdes så lenge siden er åpen.'}</p>`;
 $('#story-nav').innerHTML=nav;
 $('#room-sources').onclick=()=>j.hooks.sources(c);
 document.querySelector<HTMLButtonElement>('#case-recap')?.addEventListener('click',()=>j.recap(c));
 const rerender=()=>{j.save();renderRoom(j,c,true);};
 document.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach(b=>b.onclick=()=>{
  const t=s.tools.find(t=>t.id===b.dataset.tool)!;let correct=t.id===s.solution[p.investigation.length];
  if(correct&&s.id==='osen'&&t.id==='search'){
   const query=$<HTMLInputElement>('#journal-query').value.trim().toLocaleLowerCase('nb-NO');
   if(query.length<3||!('vedlikehold av skolebygget'.includes(query))){$('#puzzle-feedback').textContent='Skriv minst tre bokstaver fra tittelen på dokumentet, for eksempel «skole». Ingen treff er kontrollert ennå.';$('#journal-query').focus();return;}
  }
  if(correct){
   const scroll=$('#story-content').scrollTop;
   p.investigation.push(t.id);j.feedback[c.id]=t.feedback;j.save();renderRoom(j,c);
   $('#story-content').scrollTop=scroll;
   const prompt=document.querySelector<HTMLElement>('.puzzle-prompt,.room-feedback.success');
   if(prompt){prompt.tabIndex=-1;prompt.focus({preventScroll:true});prompt.scrollIntoView({block:'nearest'});}
   j.hooks.announce(t.feedback);
  }
  else{j.feedback[c.id]=t.feedback;$('#puzzle-feedback').textContent=t.feedback;j.hooks.announce(t.feedback);}
 });
 document.querySelector<HTMLInputElement>('#journal-query')?.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();document.querySelector<HTMLButtonElement>('[data-tool="search"]')?.click();}});
 document.querySelectorAll<HTMLButtonElement>('[data-decision]').forEach(b=>b.onclick=()=>{p.choice=Number(b.dataset.decision);p.turn=0;p.phase=3;rerender();});
 document.querySelector<HTMLButtonElement>('#retry-choice')?.addEventListener('click',()=>{p.choice=null;p.turn=0;p.phase=2;rerender();});
 document.querySelector<HTMLButtonElement>('#compare-paths')?.addEventListener('click',()=>j.compare(m,p.choice!));
 document.querySelectorAll<HTMLButtonElement>('[data-answer]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.answer),q=s.quiz[p.quizIndex];p.answers[p.quizIndex]=i;j.save();renderRoom(j,c);j.hooks.announce(q.feedback[i]);(i===q.answer?$('#step-next'):$(`[data-answer="${i}"]`)).focus();});
 document.querySelector<HTMLButtonElement>('#room-add')?.addEventListener('click',()=>{const item=j.state.plan[c.id]??={selected:false,owner:'',due:''};item.selected=!item.selected;j.save();renderRoom(j,c);$('#room-add').focus();});
 document.querySelector<HTMLButtonElement>('#step-next')?.addEventListener('click',()=>{
  if(p.phase===0)p.phase=1;
  else if(p.phase===1&&done)p.phase=2;
  else if(p.phase===3&&o){if(p.turn<o.timeline.length-1)p.turn++;else if(o.protected)p.phase=4;else{p.choice=null;p.turn=0;p.phase=2;}}
  else if(p.phase===4&&p.answers[p.quizIndex]===s.quiz[p.quizIndex].answer){if(p.quizIndex<s.quiz.length-1)p.quizIndex++;else if(roomComplete(s,p,m.options)){p.phase=5;j.hooks.announce(`Læringsmerke samlet: ${s.badge}.`);}}
  else if(p.phase===5){j.hooks.next(j.nextId());return;}
  rerender();
 });
 j.updateHud();if(focus)focusTitle();
}
export function renderFinale(j:Journey){
 document.body.classList.add('room-experience','finale-mode');$('#story-kicker').textContent='SLUTTROMMET · BRUK DET DU HAR LÆRT';
 const count=j.count(),all=count===5,complete=all&&finalQuiz.every((q,i)=>j.finalAnswers[i]===q.answer);
 const index=j.finalAnswers[0]===finalQuiz[0].answer?1:0,q=finalQuiz[index],answer=j.finalAnswers[index];
 $('#story-content').innerHTML=`<h2 id="mission-title" tabindex="-1">${complete?'Et arkiv er et løfte til den neste.':all?'Kan den neste finne svaret?':'Fem rom. Ett samlet ansvar.'}</h2>${stampStrip(earned(j))}${!all?`<p class="story-prose">${count} av 5 læringsmerker er samlet. Hvert rom gir deg en del av svaret. Løs de gjenværende romprøvene for å åpne sluttoppdraget.</p><p>Du kan fortsatt lese kildene og lage en lederbestilling.</p>`:complete?`<div class="earned-emblem" aria-hidden="true">✓</div><p class="story-prose">Du har gjort et spor synlig, prøvd at materialet kan leses, fulgt en saksgang, åpnet kontrollgrunnlaget og satt datoer i sammenheng.</p><div class="room-moral"><span>SPØRSMÅLET DU TAR MED DEG</span><p>Hvis vi må forklare denne beslutningen om fem år — finnes sporene?</p></div><p>Velg én arbeidsflyt i din virksomhet. Bestill en praktisk kontroll, avtal ansvar og følg opp det dere finner.</p><p class="room-boundary">Gjennomført museumsreise. Dette er et læringsmerke, ikke en sertifisering eller juridisk vurdering.</p>`:`<p class="simulation-label">SLUTTOPPDRAG · ${index+1} AV 2</p><p>En kollega som ikke var med, skal overta en viktig sak. Du har fem lærdommer å bruke.</p><h3>${esc(q.question)}</h3><div class="quiz-options">${q.options.map((a,i)=>`<button data-final-answer="${i}" class="${answer===i?'incorrect':''}" aria-pressed="${answer===i}"><span>${String.fromCharCode(65+i)}</span>${esc(a)}</button>`).join('')}</div><p class="room-feedback" role="status">${j.finalMessage?esc(j.finalMessage):answer!==null?esc(q.feedback[answer]):'Velg et svar. Sluttoppdraget lagres også underveis.'}</p>`}<p class="save-note">${j.storageAvailable?'Fremdriften lagres lokalt.':'Lagring er blokkert. Ikke lukk siden før du er ferdig.'}</p>`;
 $('#story-nav').innerHTML=`<button id="final-passport">Reisepasset</button>${button('final-next',!all?'Til neste uløste rom':complete?'Lag min lederbestilling':'Se lederbestillingen')}`;
 $('#final-next').onclick=()=>all?j.plan():j.hooks.next(j.nextId());$('#final-passport').onclick=()=>j.passport();
 document.querySelectorAll<HTMLButtonElement>('[data-final-answer]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.finalAnswer);j.finalAnswers[index]=i;j.finalMessage=q.feedback[i];j.save();renderFinale(j);j.hooks.announce(q.feedback[i]);});
 j.updateHud();focusTitle();
}
