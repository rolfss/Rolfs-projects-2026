import data from '../cases/gallery.json' with {type:'json'};
import type {MuseumCase} from './types';
import type {WallSlot} from './gallery-layout';
export type GalleryItem={id:string;caseId:string;kind:'photo'|'document'|'press'|'finding'|'benefit';title:string;kicker:string;text:string;caption:string;credit:string;url:string;image?:string;imageWidth?:number;imageHeight?:number;license?:string;licenseUrl?:string;slot:WallSlot};
export const galleryRooms=data.rooms;
export function itemsForCase(c:MuseumCase):GalleryItem[]{
  const result:GalleryItem[]=[];
  const photo=c.galleryPhoto??(c.image?.kind==='photo'?c.image:undefined);
  const document=c.galleryDocument??(c.image?.kind==='facsimile'?c.image:undefined);
  if(photo)result.push({id:c.id+'-photo',caseId:c.id,kind:'photo',title:c.location,kicker:'FOTOGRAFI · VIRKELIG STED',text:c.shortNarrative.text,caption:photo.caption,credit:photo.credit,url:photo.sourceUrl,image:photo.src,imageWidth:photo.width,imageHeight:photo.height,license:photo.license,licenseUrl:photo.licenseUrl,slot:'back-left'});
  if(document)result.push({id:c.id+'-document',caseId:c.id,kind:'document',title:'Se rapporten selv',kicker:'PRIMÆRKILDE · FAKSIMILE',text:c.documentedFacts[0].text,caption:document.caption,credit:document.credit,url:document.sourceUrl,image:document.src,imageWidth:document.width,imageHeight:document.height,license:document.license,licenseUrl:document.licenseUrl,slot:photo?'back-right':'back-left'});
  const press=data.press.filter(p=>p.caseId===c.id);
  for(const [i,p] of press.entries())result.push({id:p.id,caseId:c.id,kind:'press',title:p.headline,kicker:p.publisher+' · '+p.date,text:p.context,caption:p.note,credit:p.publisher,url:p.url,slot:i===0?'left':'right'});
  result.push({id:c.id+'-finding',caseId:c.id,kind:'finding',title:c.quotes[0].text,kicker:'FRA KILDEN · '+c.sources[0].institution,text:c.consequence[0].text,caption:'Kort sitat fra originalkilden. '+c.sources[0].locator,credit:c.sources[0].institution,url:c.sources[0].url,slot:press.length?'back-right':photo&&document?'left':document?'back-right':'back-left'});
  if(c.id==='innsyn')result.push({id:'innsyn-perspective',caseId:c.id,kind:'finding',title:'Et svar trenger et spor.',kicker:'MUSEETS REFLEKSJON',text:c.leadershipLesson,caption:'Faglig refleksjon. Historien gjelder 2008; dagens regler er beskrevet i fordypningen.',credit:c.sources[0].institution,url:c.sources[0].url,slot:'back-right'});
  return result;
}

function wrap(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,width:number,lineHeight:number,maxLines:number){
  const words=text.split(/\s+/);let line='',row=0;
  for(let i=0;i<words.length;i++){
    const next=line?line+' '+words[i]:words[i];
    if(ctx.measureText(next).width>width&&line){
      if(row===maxLines-1){ctx.fillText(line+' …',x,y+row*lineHeight,width);return y+(row+1)*lineHeight;}
      ctx.fillText(line,x,y+row*lineHeight,width);row++;line=words[i];
    }else line=next;
  }
  if(row<maxLines)ctx.fillText(line,x,y+row*lineHeight,width);
  return y+(row+1)*lineHeight;
}
// An explicitly curated press panel, not a simulated newspaper screenshot.
export function panelCanvas(item:GalleryItem,accent:string){
  const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=980;const ctx=canvas.getContext('2d')!;
  ctx.fillStyle=item.kind==='press'?'#f7f0dd':'#152536';ctx.fillRect(0,0,1536,980);
  ctx.fillStyle=accent;ctx.fillRect(0,0,1536,30);
  const ink=item.kind==='press'?'#1a2731':'#fff3ce';ctx.fillStyle=ink;
  ctx.font='600 34px Arial';wrap(ctx,item.kind==='press'?'PRESSEOMTALE · KURATERT UTDRAG':item.kicker,95,105,1346,45,2);
  ctx.fillStyle=item.kind==='press'?'#4e6272':accent;ctx.font='34px Arial';if(item.kind==='press')wrap(ctx,item.kicker,95,175,1346,42,2);
  ctx.fillStyle=ink;ctx.font='bold 82px Georgia';const end=wrap(ctx,item.kind==='press'||item.kicker==='MUSEETS REFLEKSJON'?item.title:'«'+item.title+'»',95,item.kind==='press'?310:255,1346,103,4);
  ctx.fillStyle=item.kind==='press'?'#324859':'#d6e1e5';ctx.font='37px Arial';const summaryY=Math.max(end+30,625);wrap(ctx,item.text,95,summaryY,1346,51,Math.max(1,Math.floor((880-summaryY)/51)+1));
  ctx.fillStyle=item.kind==='press'?'#49616e':'#b9cfd4';ctx.font='28px Arial';ctx.fillText('ARKIVMUSEET · Åpne panelet for originalkilde og avgrensning',95,922,1346);
  return canvas;
}
