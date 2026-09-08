import {galleryRooms,itemsForCase} from './gallery';
import type {GalleryItem} from './gallery';
import type {MuseumCase} from './types';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
type Hooks={focus:(caseId:string,itemId:string|null)=>void;detail:(item:GalleryItem)=>void;mission:(id:string)=>void;next:(id:string)=>void;free:()=>void;announce:(text:string)=>void};

// A visitor advances each exhibit deliberately. There is no timer or forced camera movement.
export class GalleryTour{
  current:MuseumCase|null=null;index=-1;visible=false;
  constructor(private cases:MuseumCase[],private hooks:Hooks,private host:HTMLElement){}
  open(c:MuseumCase){this.current=c;this.index=-1;this.visible=true;this.host.hidden=false;document.body.classList.add('gallery-mode');this.render();this.host.querySelector<HTMLHeadingElement>('h2')?.focus();}
  close(){this.visible=false;this.host.hidden=true;document.body.classList.remove('gallery-mode');}
  private move(index:number){this.index=index;this.render();const item=itemsForCase(this.current!)[index];this.hooks.focus(this.current!.id,item?.id??null);this.hooks.announce(item?.title??galleryRooms.find(r=>r.caseId===this.current!.id)!.name);this.host.querySelector<HTMLButtonElement>('#gallery-next')?.focus();}
  private render(){
    const c=this.current!,room=galleryRooms.find(r=>r.caseId===c.id)!,items=itemsForCase(c),item=items[this.index],number=this.cases.indexOf(c)+1;
    document.body.style.setProperty('--gallery-accent',room.accent);document.body.style.setProperty('--gallery-wall',room.wall);
    const image=item?.image??(!item?items.find(i=>i.image)?.image:undefined),imageItem=item??items.find(i=>i.image);
    this.host.innerHTML=`<div class="gallery-flat-art" aria-hidden="true">${image?`<img src="${import.meta.env.BASE_URL+esc(image)}" alt="">`:`<div class="gallery-flat-panel"><small>${esc(item?.kicker??'ARKIVMUSEET')}</small><p>${esc(item?.title??room.name)}</p><span>${esc(item?.text??room.introduction)}</span></div>`}</div><div class="gallery-plaque"><div class="gallery-heading"><p class="eyebrow">ROM ${number} / 5 · ${item?`VERK ${this.index+1} / ${items.length}`:'VELKOMMEN INN'}</p><button id="gallery-free" aria-label="Lukk omvisningen og gå fritt">Gå fritt ↗</button></div><h2 tabindex="-1">${esc(item?.title??room.name)}</h2><p class="gallery-caption">${esc(item?(item.kind==='photo'?item.caption:item.text):room.introduction)}</p>${item?`<button id="gallery-detail" class="gallery-source">${item.image?'Se bildet i stort format':'Les hele veggpanelet'} · Kilde og bildetekst ↗</button>`:`<p class="gallery-invitation">Historien, øvelsen og romprøven hører sammen. Veggbildene kan utforskes før eller etterpå.</p>`}<nav class="gallery-navigation" aria-label="Omvisning"><button id="gallery-prev" aria-label="Forrige verk" ${this.index<0?'disabled':''}>←</button><button id="gallery-next" class="primary">${this.index<0?'Start rommets historie':this.index<items.length-1?'Neste verk':'Undersøk saken selv'} <span>→</span></button><button id="gallery-mission">${this.index<0?'Se veggbildene først ↗':'Til romoppdraget ↗'}</button></nav><p class="gallery-footer">${esc(item?item.kicker:room.name)}${imageItem?.image&&item?` · ${esc(imageItem.credit)}`:''}</p></div>`;
    this.host.querySelector<HTMLButtonElement>('#gallery-prev')!.onclick=()=>this.move(this.index-1);
    this.host.querySelector<HTMLButtonElement>('#gallery-next')!.onclick=()=>{if(this.index<0||this.index===items.length-1)this.hooks.mission(c.id);else this.move(this.index+1);};
    this.host.querySelector<HTMLButtonElement>('#gallery-free')!.onclick=()=>this.hooks.free();
    this.host.querySelector<HTMLButtonElement>('#gallery-mission')!.onclick=()=>{if(this.index<0)this.move(0);else this.hooks.mission(c.id);};
    const detail=this.host.querySelector<HTMLButtonElement>('#gallery-detail');if(detail)detail.onclick=()=>this.hooks.detail(item);
  }
}

export function galleryDetail(item:GalleryItem){return `<p class="eyebrow">${esc(item.kicker)}</p>${item.image?`<figure class="gallery-detail-image"><a href="${import.meta.env.BASE_URL+esc(item.image)}" target="_blank" rel="noopener noreferrer" aria-label="Åpne bildet i full størrelse"><img src="${import.meta.env.BASE_URL+esc(item.image)}" alt="${esc(item.caption)}" width="${item.imageWidth}" height="${item.imageHeight}"></a><figcaption>${esc(item.caption)}</figcaption></figure>`:`<div class="gallery-press ${item.kind==='press'?'press-paper':''}"><p>${esc(item.title)}</p><span>${esc(item.text)}</span></div><p>${esc(item.caption)}</p>`}<p>${item.image?esc(item.text):''}</p><p class="gallery-credit">${esc(item.credit)}${item.license?` · <a href="${esc(item.licenseUrl!)}" target="_blank" rel="noopener noreferrer">${esc(item.license)}</a>`:''}</p><a class="button primary" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">Åpne originalkilden ↗</a>`;}
