export type Mission = {
  id:string; badge:string; title:string; brief:string; task:string;
  clues:{id:string;title:string;detail:string;relevant:boolean;feedback:string}[];
  decision:string; options:{title:string;tradeoff:string;protected:boolean;timeline:{when:string;title:string;text:string}[]}[];
  action:string; proof:string;
};
export type Attempt = {selected:string[];checked:boolean;choice:number|null;turn:number;completed:boolean};
export type PlanItem = {selected:boolean;owner:string;due:string};
export type JourneyState = {version:1;attempts:Record<string,Attempt>;plan:Record<string,PlanItem>};
export const emptyAttempt=():Attempt=>({selected:[],checked:false,choice:null,turn:0,completed:false});
export const emptyJourney=():JourneyState=>({version:1,attempts:{},plan:{}});
export function evidenceCorrect(m:Mission,selected:string[]){
  const relevant=m.clues.filter(c=>c.relevant).map(c=>c.id);
  return selected.length===relevant.length&&new Set(selected).size===selected.length&&relevant.every(id=>selected.includes(id));
}
export function canComplete(m:Mission,a:Attempt){
  const option=a.choice===null?undefined:m.options[a.choice];
  return a.checked&&evidenceCorrect(m,a.selected)&&!!option?.protected&&a.turn===option.timeline.length-1;
}
export function restoreJourney(raw:string|null,missions:Mission[]):JourneyState{
  const state=emptyJourney();
  try{
    const value=JSON.parse(raw||'null');if(value?.version!==1)return state;
    for(const m of missions){
      const a=value.attempts?.[m.id];
      if(a&&typeof a==='object'){
        const next=emptyAttempt();
        next.selected=Array.isArray(a.selected)?[...new Set<string>(a.selected.filter((id:unknown):id is string=>typeof id==='string'&&m.clues.some(c=>c.id===id)))]:[];
        next.checked=a.checked===true&&evidenceCorrect(m,next.selected);
        next.choice=next.checked&&Number.isInteger(a.choice)&&a.choice>=0&&a.choice<m.options.length?a.choice:null;
        const last=next.choice===null?0:m.options[next.choice].timeline.length-1;
        next.turn=Number.isInteger(a.turn)?Math.max(0,Math.min(last,a.turn)):0;
        next.completed=a.completed===true&&canComplete(m,next);
        state.attempts[m.id]=next;
      }
      const p=value.plan?.[m.id];
      if(p&&typeof p==='object')state.plan[m.id]={selected:p.selected===true,owner:typeof p.owner==='string'?p.owner.slice(0,100):'',due:typeof p.due==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(p.due)?p.due:''};
    }
  }catch{/* Damaged or unavailable browser storage must never prevent a visit. */}
  return state;
}
export function planText(missions:Mission[],state:JourneyState){
  const selected=missions.filter(m=>state.plan[m.id]?.selected);
  return ['ARKIVMUSEET · MIN LEDERBESTILLING','Ta med til neste ledermøte. Tiltakene må tilpasses virksomheten.','',
    ...selected.flatMap((m,i)=>[`${i+1}. ${m.badge}`,`Bestilling: ${m.action}`,`Ansvarlig rolle: ${state.plan[m.id].owner||'Avklares i ledermøtet'}`,`Oppfølging: ${state.plan[m.id].due||'Avklares i ledermøtet'}`,`Be om å få se: ${m.proof}`,'']),
    'Første møte: Velg en konkret sak eller leveranse. Avtal hvem som prøver gjenfinning, når dere følger opp, og hvordan avvik lukkes.',
    'Læringsøvelse, ikke en vurdering av virksomhetens etterlevelse. Ingen faktiske saksopplysninger er nødvendige.'].join('\n');
}
