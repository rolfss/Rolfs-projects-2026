export function loadProgress(raw={},records={}){
 const p={completed:[false,false,false],stars:[0,0,0],mastered:[],dodges:0,...raw};
 p.completed=[0,1,2].map(i=>!!p.completed?.[i]);p.stars=[0,1,2].map(i=>Math.max(0,Math.min(3,Number(p.stars?.[i])||0)));
 p.mastered=[...new Set(Array.isArray(p.mastered)?p.mastered.filter(x=>typeof x==='string'):[])];p.dodges=Math.max(0,Number(p.dodges)||0);
 // Respect courses already completed in the original local version.
 if(!raw.completed)['fjord','pass','aurora'].forEach((id,i)=>{if(Object.keys(records).some(k=>k.startsWith(id+'-')&&records[k]?.time>0))p.completed[i]=true;});
 return p;
}
export function unlocked(p,i){return i===0||p.completed[i]||p.completed[i-1];}
export function rank(p){const stars=p.stars.reduce((a,b)=>a+b,0);return stars===9&&p.mastered.length>=12?'Riksarkivar på hjul':p.completed.every(Boolean)?'Fjellarkivar':p.completed[0]?'Dokumentjeger':'Arkivlærling';}
export function completeStage(p,index,medal,answers,dodges){
 const newly=!p.completed[index];p.completed[index]=true;p.stars[index]=Math.max(p.stars[index],3-medal);
 for(const a of answers)if(a.q.mascot&&a.choice===a.q.correct&&!p.mastered.includes(a.q.id))p.mastered.push(a.q.id);
 p.dodges+=dodges;return newly&&index<2;
}
