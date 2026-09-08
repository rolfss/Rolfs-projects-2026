import data from '../cases/benefits.json' with {type:'json'};
import type {Source} from './types';
export const leaderBenefits={...data,sources:data.sources as Source[]};
export const benefitFor=(id:string)=>data.rooms.find(r=>r.caseId===id);
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function benefitCard(id:string){const b=benefitFor(id);return b?`<section class="leader-benefit" aria-label="Gevinst for deg som leder"><p class="benefit-label">DETTE KAN DU VINNE SOM LEDER</p><h3>${esc(b.title)}</h3><p>${esc(b.text)}</p></section>`:'';}
export function benefitsDetail(id?:string){const b=id?benefitFor(id):undefined;return `<div class="benefits-intro"><p class="benefit-label">ARKIVLOVA · OFFENTLEGLOVA · GOD FORVALTNING</p><p class="benefits-statement">${esc(data.title)}</p><p>${esc(data.intro)}</p></div>${b?`${benefitCard(b.caseId)}<p><strong>Et konkret grep:</strong> ${esc(b.action)}</p>`:`<div class="benefits-grid">${data.gains.map((g,i)=>`<article><span class="benefit-number">${String(i+1).padStart(2,'0')}</span><h3>${esc(g.title)}</h3><p>${esc(g.text)}</p></article>`).join('')}</div>`}<p class="benefits-basis">${esc(data.basis)}</p><div class="benefits-sources">${data.sources.map(s=>`<p><q>${esc(s.excerpt)}</q><br><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} · ${esc(s.locator)} ↗</a></p>`).join('')}</div>`;}
// A typographic museum exhibit, rendered as a real surface in the room.
export function benefitCanvas(id?:string,accent='#f3cf86'){
 const c=document.createElement('canvas');c.width=1920;c.height=id?820:1200;const ctx=c.getContext('2d')!;
 const gradient=ctx.createLinearGradient(0,0,1920,c.height);gradient.addColorStop(0,'#163e57');gradient.addColorStop(.65,'#0d253b');gradient.addColorStop(1,'#071928');ctx.fillStyle=gradient;ctx.fillRect(0,0,c.width,c.height);
 ctx.strokeStyle=accent;ctx.lineWidth=3;ctx.strokeRect(34,34,c.width-68,c.height-68);ctx.fillStyle=accent;ctx.fillRect(95,100,100,5);
 ctx.textAlign='center';ctx.fillStyle=accent;ctx.font='500 40px Arial';ctx.fillText('DETTE KAN DU VINNE SOM LEDER',960,152);
 const b=id?benefitFor(id):undefined;ctx.fillStyle='#fff3d6';ctx.font='104px Georgia';
 const wrap=(text:string,y:number,font:string,lineHeight:number,maxWidth=1640)=>{ctx.font=font;let line='';for(const word of text.split(/\s+/)){const next=line?line+' '+word:word;if(ctx.measureText(next).width>maxWidth&&line){ctx.fillText(line,960,y);y+=lineHeight;line=word;}else line=next;}ctx.fillText(line,960,y);return y+lineHeight;};
 if(b){const y=wrap(b.title,315,'108px Georgia',123);ctx.fillStyle='#dceaf0';wrap(b.text,Math.max(y+45,490),'46px Arial',65);ctx.fillStyle=accent;ctx.font='34px Arial';ctx.fillText('Arkivlova · Offentleglova · God forvaltning',960,757);}
 else{ctx.fillText('God dokumentasjon.',960,337);ctx.fillText('Tryggere ledelse.',960,470);ctx.strokeStyle=accent;ctx.beginPath();ctx.moveTo(700,550);ctx.lineTo(1220,550);ctx.stroke();ctx.font='54px Georgia';data.gains.forEach((g,i)=>{ctx.fillStyle=i%2?'#dceaf0':'#fff3d6';ctx.fillText(g.title,960,665+i*100);});ctx.fillStyle=accent;ctx.font='36px Arial';ctx.fillText('Utforsk hva du kan vinne',960,1110);}
 return c;
}
