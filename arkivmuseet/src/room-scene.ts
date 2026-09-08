import type {RoomStory,RoomProgress} from './room-stories';
export const escapeHtml=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const gold='#f1ce83',mint='#9ce5c8',muted='#adbfd0',paper='#fff3dc';
const text=(x:number,y:number,s:string,size=18,color=paper,extra='')=>`<text x="${x}" y="${y}" fill="${color}" font-size="${size}" ${extra}>${escapeHtml(s)}</text>`;
const rect=(x:number,y:number,w:number,h:number,fill:string,stroke='none',r=8)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
const line=(x:number,y:number,x2:number,y2:number,color=gold)=>`<path d="M${x} ${y}L${x2} ${y2}" fill="none" stroke="${color}" stroke-width="3"/>`;
const dot=(x:number,y:number,on:boolean,label:string)=>`<circle cx="${x}" cy="${y}" r="12" fill="${on?mint:'#253e50'}" stroke="${on?mint:muted}"/>${text(x,y+6,on?'✓':'?',16,'#0b2332','text-anchor="middle"')}${text(x+23,y+6,label,17,on?paper:muted)}`;
/** Same self-contained illustration is shown in the reader and projected into the 3D room.
 * No remote images, arbitrary HTML, or claims about repaired historical cases. */
export function roomScene(s:RoomStory,p:RoomProgress,safe:boolean|null=null){
 const count=p.investigation.length;
 const future=p.phase>=3&&p.choice!==null;
 const activeCount=future?(safe? s.solution.length:Math.max(0,s.solution.length-p.turn-1)):count;
 const bad=future&&safe===false;
 let body='';
 if(s.id==='osen'){
  body=rect(28,66,240,210,paper)+text(49,98,'VEDLIKEHOLD AV',17,'#1b3445')+text(49,122,'SKOLEBYGGET',22,'#1b3445')+line(50,140,241,140,'#aa997a');
  ['Dokumenttype','Tittel og skjerming','Status'].forEach((t,i)=>{body+=text(50,168+i*30,t,16,'#304b5b')+text(242,168+i*30,activeCount>(i===2?1:0)?'✓':'?',18,activeCount>(i===2?1:0)?'#177258':'#936134','text-anchor="end"');});
  body+=line(286,172,334,172,activeCount>=2?mint:muted)+text(310,163,'→',28,gold,'text-anchor="middle"')+rect(348,72,265,194,'#173449',activeCount>=3?mint:'#466075');
  body+=rect(365,93,232,34,'#0b2332')+text(378,116,'SØK: skole',17,muted)+text(480,174,activeCount>=3?'1 KONTROLLERBART SPOR':'INGEN VERIFISERTE TREFF',15,activeCount>=3?mint:gold,'text-anchor="middle"');
  if(activeCount>=3)body+=text(366,209,'Vedlikehold av skolebygget',16)+text(366,236,'Journalpost · vurdert skjerming',14,muted);
  else body+=text(480,223,bad?'Restansen følger saken videre.':'Filen er ferdig. Sporet venter.',15,muted,'text-anchor="middle"');
 }else if(s.id==='tokke'){
  body=rect(38,65,160,218,'#26394e','#607185')+text(118,94,'GAMMELT SYSTEM',15,paper,'text-anchor="middle"');
  for(let i=0;i<4;i++)body+=rect(55,111+i*35,126,25,'#102433')+`<circle cx="165" cy="${124+i*35}" r="4" fill="${bad&&p.turn>0?'#d59478':mint}"/>`+line(67,124+i*35,139,124+i*35,'#3f5b6f');
  body+=line(208,173,267,173,activeCount?mint:muted)+text(237,162,'→',28,gold,'text-anchor="middle"')+rect(280,68,326,212,'#102b3d','#486174')+text(300,99,'BEVARINGSPRØVE',18,gold);
  ['UTTREKKET KAN ÅPNES','INNHOLD OG KOBLINGER','ANSVAR FOR VIDERE TILGANG'].forEach((t,i)=>body+=dot(306,138+i*46,activeCount>i,t));
 }else if(s.id==='innsyn'){
  const labels=[['INNSYNSKRAV','Hva ble spurt om?'],['VURDERING','Hvorfor dette svaret?'],['AVGJØRELSE','Hva ble utfallet?'],['KLAGE','Hva skal kontrolleres?']];
  labels.forEach((l,i)=>{const x=22+i*157,on=activeCount>i;body+=rect(x,102,132,150,on?paper:'#20374b',on?mint:'#567084')+text(x+66,135,on?String(i+1):'?',25,on?'#214434':gold,'text-anchor="middle"')+text(x+66,170,l[0],14,on?'#1b3445':muted,'text-anchor="middle"')+text(x+66,207,l[1],11,on?'#304b5b':muted,'text-anchor="middle"');if(i<3)body+=text(x+146,185,'→',22,activeCount>i+1?mint:muted,'text-anchor="middle"');});
  body+=text(320,285,activeCount===4?'Sammenhengen kan følges fra krav til klage.':'Enkeltfiler er ikke hele saksgangen.',17,activeCount===4?mint:muted,'text-anchor="middle"');
 }else if(s.id==='hanekleiv'){
  body+=`<path d="M54 276V188C54 31 424 31 424 188V276Z" fill="#435066" stroke="#708392" stroke-width="2"/><path d="M113 276V191C113 84 365 84 365 191V276Z" fill="#102433" stroke="#d1b484" stroke-width="4"/>`;
  if(activeCount>0){for(let i=0;i<7;i++){const a=Math.PI+(Math.PI*i/6),x=239+132*Math.cos(a),y=190+115*Math.sin(a);body+=line(x,y,x+30*Math.cos(a),y+30*Math.sin(a),mint)+`<circle cx="${x}" cy="${y}" r="5" fill="${mint}"/>`;}
   body+=text(239,190,'SIKRINGENS PLASSERING',14,mint,'text-anchor="middle"');}
  else body+=text(239,179,'BAK OVERFLATEN: ?',20,gold,'text-anchor="middle"');
  body+=line(150,264,327,264,'#e5ded0')+rect(450,88,165,179,'#19374a','#526b7b')+text(468,121,'KONTROLLBORD',16,gold)+dot(474,159,activeCount>0,'Kart')+dot(474,205,activeCount>1,'Utførelse');
  if(activeCount>1)body+=line(403,176,447,176,mint)+text(239,226,'Kart + kontrollgrunnlag',16,paper,'text-anchor="middle"');
  body+=text(320,302,'Prinsippskisse. Ikke tunnelens faktiske geologi eller sikring.',13,muted,'text-anchor="middle"');
 }else{
  body+=rect(28,62,190,217,paper)+text(46,94,'ET OPPDIKTET BREV',15,'#17374a')+text(46,131,'Datert 20. nov.',19,'#17374a')+line(46,151,195,151,'#bcb096')+text(46,185,'Mottatt: 22. nov.',15,'#17374a')+text(46,215,'Registrert: 23. nov.',15,'#17374a');
  ['Dokumentdato','Mottaksdato','Registrert'].forEach((name,i)=>{body+=rect(255,67+i*73,355,59,'#19374a',activeCount>i?mint:'#496377')+text(271,104+i*73,name,18,paper)+text(590,104+i*73,activeCount>i?`${s.solution[i]}. november`:'?',18,activeCount>i?mint:gold,'text-anchor="end"');});
 }
 const stage= p.phase===0?'HISTORISK SAK · ILLUSTRERT PRINSIPP':future?'TENKT FØLGE AV DITT LEDERVALG':'ARBEIDSBORDET · TENKT ØVELSE';
 const footer=bad?'Sporet svekkes i dette tenkte forløpet.':activeCount===s.solution.length?'Du har gjort sammenhengen synlig.':'Undersøk det som ennå ikke er kontrollert.';
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 352" role="img" aria-label="${escapeHtml(s.badge+'. '+footer)}"><rect width="640" height="352" rx="14" fill="#0b2332"/><g font-family="Arial, sans-serif">${text(26,32,stage,14,gold)}${body}${text(320,333,footer,15,bad?'#ffbc9e':mint,'text-anchor="middle"')}</g></svg>`;
}
export function stampStrip(earned:string[]){return `<div class="memory-keys" aria-label="Dine fem læringsmerker">${['Synlighet','Lesbarhet','Etterprøvbarhet','Kontrollgrunnlag','Sammenheng'].map((s,i)=>`<span class="${earned.includes(['osen','tokke','innsyn','hanekleiv','npe'][i])?'lit':''}"><b aria-hidden="true">${earned.includes(['osen','tokke','innsyn','hanekleiv','npe'][i])?'✓':i+1}</b><small>${s}</small></span>`).join('')}</div>`;}
