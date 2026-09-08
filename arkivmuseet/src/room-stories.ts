/** Authored room scripts. Facts refer to the existing, attributed case records.
 * Objects and actions in the investigations are explicitly fictional teaching models. */
export type PuzzleOption={id:string;label:string;feedback:string};
export type Quiz={question:string;options:string[];answer:number;feedback:string[]};
export type RoomStory={
 id:string;title:string;badge:string;opening:string;problem:string;investigation:string;
 prompts:string[];solution:string[];tools:PuzzleOption[];discovery:string;
 moral:string;transfer:string;bridge:string;quiz:Quiz[];
};
export const roomStories:RoomStory[]=[
 {
  id:'osen',title:'Ferdig på innsiden. Usynlig fra utsiden.',badge:'Synlighet',
  opening:'Et dokument kan være ferdig uten at offentligheten finner sporet etter det. I Osen tydet kontrollsøket i 2025 på at 433 ferdigstilte dokumenter, eldre enn tre uker, verken var kvalitetssikret eller journalført. Mange var politiske saksfremlegg. Arbeidet hadde kommet langt. Den siste overgangen var ikke fulgt godt nok opp.',
  problem:'«Ferdigstilt» var blitt stående som endestasjon. Men en ferdig fil og en korrekt journalpost er ikke det samme.',
  investigation:'På bordet ligger én oppdiktet sak. Før journalposten gjennom kontrollene, og prøv deretter om noen utenfor fagmiljøet kan finne den.',
  prompts:['Hva må kontrolleres før denne posten kan journalføres?','Metadataene er kontrollert. Hva mangler før posten kan finnes i journalen?','Posten er journalført. Hvordan vet du at arbeidsflyten faktisk fungerer?'],
  solution:['metadata','journal','search'],
  tools:[
   {id:'search',label:'Prøv et journalsøk',feedback:'Et søk er sluttkontrollen. Først må metadata kontrolleres og posten journalføres.'},
   {id:'metadata',label:'Kontroller type, tittel og skjerming',feedback:'Riktig dokumenttype, forståelig tittel og vurdert skjerming gjør posten klar for journalføring.'},
   {id:'done',label:'Sett saken som ferdig',feedback:'Det var nettopp blindsonen: «ferdig» bekrefter ikke at journalføringen er gjort.'},
   {id:'journal',label:'Journalfør den kontrollerte posten',feedback:'Nå finnes et ordnet spor. Det er ikke det samme som å publisere hele dokumentet uten en innsynsvurdering.'}
  ],
  discovery:'Nå gir søket treff på øvingsposten. Dokumentet ble ikke mer ferdig. Sporet ble mulig å finne.',
  moral:'Ferdig er en arbeidsstatus. Gjenfinnbarhet må kontrolleres.',
  transfer:'Bestill et jevnlig kontrollsøk etter ferdigstilte poster som venter på journalføring. Avtal hvem som følger dem opp.',
  bridge:'Du har gjort et spor synlig. I neste rom finnes filene kanskje fortsatt — men kan noen åpne dem?',
  quiz:[
   {question:'Hva var det sentrale problemet i Osen-saken?',options:['Alle de 433 dokumentene var slettet.','Ferdigstilte dokumenter var ikke fulgt frem til kvalitetssikret journalføring.','Kommunen manglet et sak-/arkivsystem.'],answer:1,feedback:['Rapporten beskrev manglende kvalitetssikring og journalføring, ikke sletting.','Riktig. Bruddet lå i overgangen fra ferdig arbeid til et ordnet, søkbart spor.','Saken gjaldt bruken og oppfølgingen av systemet, ikke at et system manglet.']},
   {question:'Hvilken lederbestilling treffer blindsonen best?',options:['Be alle trykke «ferdig» før helgen.','Publiser alle filer automatisk, også skjermet innhold.','Be om et kontrollsøk og en navngitt ansvarlig for restansene.'],answer:2,feedback:['Ferdigstatus var ikke nok. Bestill kontroll av det neste leddet.','Journalføring og full publisering er forskjellige ting. Skjerming og innsyn må vurderes.','Riktig. Du bestiller et kontrollerbart resultat, ikke bare mer aktivitet.']}
  ]
 },
 {
  id:'tokke',title:'Systemet stenger. Historien må bli.',badge:'Lesbarhet',
  opening:'Et systembytte skal gjøre hverdagen enklere. Men det gamle systemet rommer også det nye ikke nødvendigvis har fått med seg. Tokke avsluttet elevsystemet Oppad i 2019. Ved tilsynet i 2024 var det uklart om databasen fortsatt kunne leses. Noe var overført til ePhorte, men ikke alt. Sikkerhetskopier ble undersøkt.',
  problem:'En kopi kan eksistere uten at noen har vist at informasjonen lar seg hente ut og forstå.',
  investigation:'Du skal godkjenne stenging av et oppdiktet elevsystem. Ikke stol på lampen merket «backup». Prøv det som skal overleve systemet.',
  prompts:['Hva bør du prøve før du godkjenner stenging?','En fil åpnet seg. Hvordan undersøker du om arkivsammenhengen følger med?','Testen er dokumentert. Hvem skal kunne finne materialet etterpå?'],
  solution:['open','context','owner'],
  tools:[
   {id:'off',label:'Slå av systemet nå',feedback:'Da kan du miste muligheten til å kontrollere uttrekket. Hold tilgangen åpen mens bevaring avklares.'},
   {id:'open',label:'Åpne et testuttrekk',feedback:'En lesetest er sterkere bevis enn en melding om at sikkerhetskopieringen kjørte.'},
   {id:'owner',label:'Avtal mottak, ansvar og gjenfinning',feedback:'Noen må overta både materialet og ansvaret. Avtalen erstatter ikke testing av innholdet.'},
   {id:'context',label:'Kontroller innhold og sammenheng',feedback:'Undersøk at dokumenter, metadata og nødvendige koblinger er bevart, ikke bare én tilfeldig fil.'}
  ],
  discovery:'I modellen kan en ny medarbeider nå åpne materialet og følge sammenhengen. Bevaringen er prøvd før stenging — ikke bare lovet.',
  moral:'En sikkerhetskopi er ikke et bevis på brukbar bevaring.',
  transfer:'Gjør dokumentert uttrekk, lesetest og avklart mottaksansvar til vilkår i planen for systemavvikling.',
  bridge:'Et arkiv må kunne åpnes. Men selv lesbare dokumenter kan bli ubrukelige når forbindelsen mellom dem mangler.',
  quiz:[
   {question:'Hva kan vi faktisk si om materialet i Tokke?',options:['Lesbarheten var uavklart ved tilsynet; endelig tap er ikke fastslått.','Alle elevopplysninger var definitivt tapt.','En sikkerhetskopi beviste at alt var bevart.'],answer:0,feedback:['Riktig. Risiko og dokumentert tap må holdes fra hverandre.','Det går lenger enn rapporten. Manglende avklaring er ikke bevis for endelig tap.','En kopi må kunne brukes. Tilsynet beskrev at dette fortsatt ble undersøkt.']},
   {question:'Hva er det sterkeste grunnlaget for å avslutte et system?',options:['Leverandøren sier at backup er tatt.','Et dokumentert, kontrollert uttrekk og avklart ansvar for videre tilgang.','Lisensen utløper på fredag.'],answer:1,feedback:['Det er en opplysning om en kopi, ikke dokumentasjon på et brukbart arkiv.','Riktig. Kontroller innhold, sammenheng og lesbarhet, og avtal videre forvaltning.','En frist gjør avklaringen viktigere; den gjør ikke bevaringen tryggere.']}
  ]
 },
 {
  id:'innsyn',title:'Avslaget finnes. Kan det etterprøves?',badge:'Etterprøvbarhet',
  opening:'Et avslag er ikke slutten på en sak når noen klager. Den som skal kontrollere avgjørelsen, trenger også sporene frem til den. I en sak fra 2008 fikk Sivilombudsmannen ikke oversendt innsynsbegjæringen og det første avslaget. Departementet ga dessuten uriktig informasjon om arkivrutinene. Dokumenter og kunnskap om rutinene fulgte ikke kontrollen slik de skulle.',
  problem:'Kontrollen ble hindret når de nødvendige dokumentene ikke ble funnet frem og oversendt.',
  investigation:'Sett sammen en oppdiktet innsynssak slik at en ny saksbehandler kan følge den. Legg kortene i en meningsfull rekkefølge. Dette er ikke en påstand om journalplikt for alle innsynskrav i dag.',
  prompts:['Hva starter denne saksgangen?','Hva forklarer hvordan kravet ble behandlet?','Hva forteller søkeren utfallet?','Hva utløser en ny kontroll av avgjørelsen?'],
  solution:['request','assessment','decision','appeal'],
  tools:[
   {id:'decision',label:'Avgjørelse med begrunnelse',feedback:'Avgjørelsen gir utfallet. For å forstå den trenger vi først kravet og vurderingen.'},
   {id:'appeal',label:'Klage på avgjørelsen',feedback:'Klagen kommer etter en avgjørelse. En kontrollør trenger også sporene som leder frem til den.'},
   {id:'request',label:'Det opprinnelige innsynskravet',feedback:'Kravet viser hva personen faktisk ba om.'},
   {id:'assessment',label:'Vurdering av kravet',feedback:'Vurderingen knytter spørsmålet til avgjørelsen og gjør behandlingen forståelig.'}
  ],
  discovery:'Nå kan en utenforstående følge kjeden fra spørsmål til klage. Øvelsen bevarer sammenheng — ikke bare enkeltfiler.',
  moral:'Et vedtak er ikke etterprøvbart bare fordi vedtaksfilen finnes.',
  transfer:'Be en medarbeider som ikke kjenner saken, finne frem grunnlaget, avgjørelsen og klagesporet. Kontroller også at rutinene er kjent.',
  bridge:'Her trengte en kontrollør hele saksgangen. I neste rom handler kontrollen om noe som ligger skjult bak en tunnelvegg.',
  quiz:[
   {question:'Hvorfor fikk arkivrutinene betydning for kontrollen i denne saken?',options:['En klage gjør alltid det opprinnelige avslaget ugyldig.','Ombudsmannen trengte bare den nyeste e-posten.','Nødvendige dokumenter ble ikke oversendt, og opplysningene om rutinene var uriktige.'],answer:2,feedback:['Det er ikke det denne saken viser. Spørsmålet her er om behandlingen kunne etterprøves.','Den siste e-posten erstatter ikke det opprinnelige kravet og behandlingen.','Riktig. Både dokumentene og kunnskap om hvordan de finnes, har betydning.']},
   {question:'Hva bør du ta med fra en historisk uttalelse fra 2008?',options:['Etterprøvbarhet er viktig, men dagens konkrete plikter må vurderes etter dagens regler.','Alle innsynssaker er automatisk journalpliktige i dag.','Gamle uttalelser har ingen læringsverdi.'],answer:0,feedback:['Riktig. Lærdommen består uten at gamle paragrafhenvisninger gjøres til dagens rett.','Det kan ikke sluttes fra 2008-saken. Skill mellom arkivplikt, journalplikt og gjeldende unntak.','Historien viser hvorfor sammenheng og kjente rutiner betyr noe, selv når regelverket endres.']}
  ]
 },
 {
  id:'hanekleiv',title:'Bak veggen ligger også et arkiv.',badge:'Kontrollgrunnlag',
  opening:'25. desember 2006 raste deler av Hanekleivtunnelen. Granskningen måtte undersøke både berget, sikringen og hvordan arbeidet var fulgt opp. Dokumentasjon om omfang og plassering av utført sikring var ikke lenger tilgjengelig. Det var ett av flere funn i et sammensatt årsaksbilde — ikke bevis for at arkivtap alene utløste raset.',
  problem:'Overflaten kunne sees. Kunnskapen om det som var gjort bak den, kunne ikke kontrolleres på samme måte når dokumentasjonen manglet.',
  investigation:'Du overtar en oppdiktet teknisk leveranse. Undersøk modellen lag for lag. Hvilke to underlag gir drift et bedre grunnlag for å forstå det som er skjult?',
  prompts:['Hva knytter sikringen til et konkret sted?','Plasseringen er synlig. Hva trengs for å undersøke hva som ble utført og kontrollert?'],
  solution:['map','log'],
  tools:[
   {id:'photo',label:'Et pent bilde av ferdig tunnel',feedback:'Bildet viser overflaten. Det dokumenterer ikke nødvendigvis skjult sikring eller plasseringen av den.'},
   {id:'map',label:'Kart over utført sikring',feedback:'Et kart knytter utført arbeid til et konkret sted. I modellen blir punktene bak veggen synlige.'},
   {id:'log',label:'Utførelses- og kontrollgrunnlag',feedback:'Sammen med plasseringen viser grunnlaget hva som er utført og hvordan det er kontrollert.'},
   {id:'budget',label:'Prosjektets sluttsum',feedback:'En sluttsum sier noe om økonomi, men viser ikke hvor og hvordan sikringen er utført.'}
  ],
  discovery:'Kart og kontrollgrunnlag er nå koblet til modellen. Det gjør kunnskapen synlig; det beviser ikke at en virkelig tunnel er sikker.',
  moral:'Leveransen er også kunnskapen som gjør den mulig å kontrollere.',
  transfer:'Definer dokumentasjon og prøvd gjenfinning som en del av overleveringen — ikke som opprydding etter prosjektet.',
  bridge:'Kunnskap må følge leveransen. I siste rom prøver du hvor mye sammenheng som kan ligge i ett lite datofelt.',
  quiz:[
   {question:'Hvilken konklusjon støtter kilden om Hanekleiv?',options:['Arkivtap alene utløste raset.','Utilgjengelig sikringsdokumentasjon var ett av flere funn i granskningen.','Et komplett arkiv ville garantert ha forhindret raset.'],answer:1,feedback:['Det hevder ikke granskningen. Årsaksbildet var teknisk og sammensatt.','Riktig. Dokumentasjonsfunnet må ikke blåses opp til en eneårsak.','Et arkiv er et kontrollgrunnlag, ikke en garanti for sikkerhet.']},
   {question:'Hva er en god bestilling ved overlevering av en teknisk leveranse?',options:['Be bare om et bilde av sluttresultatet.','Vent med dokumentasjonen til noen trenger den.','Be om dokumentasjon av utførelsen og prøv at mottakeren kan finne og forstå den.'],answer:2,feedback:['Et bilde erstatter ikke nødvendigvis kunnskap om skjulte forhold.','Da kan de som kjenner arbeidet være borte og kontrollgrunnlaget vanskeligere å etablere.','Riktig. Overlever også kunnskapen som drift og kontroll trenger.']}
  ]
 },
 {
  id:'npe',title:'Tre datoer. Tre forskjellige spor.',badge:'Sammenheng',
  opening:'Når mange dokumenter skal finnes og forstås, gjør opplysningene rundt dem en stor del av arbeidet. Ved tilsynet hos Norsk pasientskadeerstatning i 2024 manglet dokumentdato på mange journalposter. Det betyr ikke at dato manglet i selve dokumentene. Arkivverket omtalte arkivholdet som generelt godt og vurderte manglene som løsbare.',
  problem:'Dokumentets dato, mottaksdato og registreringsdato beskriver forskjellige hendelser. Et tomt eller feil felt kan skjule den forskjellen.',
  investigation:'Dette er et oppdiktet brev, ikke en pasientsak. Brevet er datert 20. november, mottatt 22. november og registrert 23. november. Sett riktig dato på riktig hendelse.',
  prompts:['Hvilken dato hører hjemme i «Dokumentdato» for dette daterte brevet?','Hvilken dato beskriver når brevet kom frem?','Hvilken dato beskriver når posten ble registrert?'],
  solution:['20','22','23'],
  tools:[
   {id:'23',label:'23. november',feedback:'Det er registreringsdatoen i øvelsen. Den forteller når posten ble opprettet.'},
   {id:'20',label:'20. november',feedback:'Det er datoen på selve brevet i øvelsen.'},
   {id:'22',label:'22. november',feedback:'Det er mottaksdatoen i øvelsen. Den er forskjellig fra brevets dato.'}
  ],
  discovery:'Nå viser tidslinjen tre hendelser, ikke tre konkurrerende svar på samme spørsmål. Metadataene gir filen sammenheng.',
  moral:'Bevar ikke bare filen. Bevar det som gjør den forståelig.',
  transfer:'Kontroller metadata med stikkprøver, prioriter etter risiko, og bruk funnene til å forbedre arbeidsflyten.',
  bridge:'Du har samlet fem deler av samme svar: finne, lese, etterprøve, kontrollere og forstå. Nå skal du bruke dem sammen.',
  quiz:[
   {question:'Hva viser NPE-saken — og hva viser den ikke?',options:['Manglende dokumentdato på journalposter, ikke dokumenterte feil i erstatningsvedtak.','At alle originaldokumentene var udaterte.','At feil dato hadde ført til uriktige erstatninger.'],answer:0,feedback:['Riktig. Et metadatafunn må ikke gjøres til en udokumentert påstand om skade.','Arkivverket undersøkte ikke om selve dokumentene hadde dato.','Rapporten dokumenterer ikke dette. Hold avvik og påståtte følger fra hverandre.']},
   {question:'Brevet er datert 20., mottatt 22. og registrert 23. november. Hva gjør du?',options:['Bruk 23. november overalt; da blir feltene like.','Registrer datoene som forskjellige hendelser etter hva de faktisk beskriver.','Fjern datoene for å unngå motstrid.'],answer:1,feedback:['Da forsvinner forskjellen mellom hendelsene. Likhet er ikke det samme som kvalitet.','Riktig. Metadata skal forklare dokumentet og saksbehandlingen, ikke bare fylle felter.','Datoene er ikke nødvendigvis motstridende. De beskriver ulike hendelser.']}
  ]
 }
];

export type RoomProgress={phase:number;investigation:string[];choice:number|null;turn:number;answers:(number|null)[];quizIndex:number};
export type RoomOption={protected:boolean;timeline:unknown[]};
export const newProgress=():RoomProgress=>({phase:0,investigation:[],choice:null,turn:0,answers:[null,null],quizIndex:0});
export const investigated=(s:RoomStory,p:RoomProgress)=>p.investigation.length===s.solution.length&&s.solution.every((id,i)=>p.investigation[i]===id);
export function roomComplete(s:RoomStory,p:RoomProgress,options:RoomOption[]){
 const o=p.choice===null?null:options[p.choice];
 return investigated(s,p)&&!!o?.protected&&p.turn===o.timeline.length-1&&s.quiz.every((q,i)=>p.answers[i]===q.answer);
}
/** Restore only a valid prefix. Corrupt storage never skips an investigation or quiz. */
export function restoreRooms(raw:string|null,missions:{id:string;options:RoomOption[]}[]):Record<string,RoomProgress>{
 const result:Record<string,RoomProgress>={};
 try{
  const root=JSON.parse(raw||'null');if(root?.version!==2)return result;
  for(const s of roomStories){
   const a=root.rooms?.[s.id],m=missions.find(m=>m.id===s.id);if(!a||!m)continue;
   const p=newProgress();
   if(Array.isArray(a.investigation))for(let i=0;i<s.solution.length;i++){if(a.investigation[i]!==s.solution[i])break;p.investigation.push(s.solution[i]);}
   if(investigated(s,p)&&Number.isInteger(a.choice)&&a.choice>=0&&a.choice<m.options.length){p.choice=a.choice;p.turn=Number.isInteger(a.turn)?Math.max(0,Math.min(m.options[a.choice].timeline.length-1,a.turn)):0;}
   const ready=p.choice!==null&&m.options[p.choice].protected&&p.turn===m.options[p.choice].timeline.length-1;
   if(ready&&Array.isArray(a.answers))for(let i=0;i<s.quiz.length;i++){if(i&&p.answers[i-1]!==s.quiz[i-1].answer)break;const n=a.answers[i];if(Number.isInteger(n)&&n>=0&&n<s.quiz[i].options.length)p.answers[i]=n;}
   p.quizIndex=p.answers[0]===s.quiz[0].answer&&a.quizIndex===1?1:0;
   const ceiling=roomComplete(s,p,m.options)?5:ready?4:p.choice!==null?3:investigated(s,p)?2:1;
   p.phase=Number.isInteger(a.phase)?Math.max(0,Math.min(ceiling,a.phase)):0;
   result[s.id]=p;
  }
 }catch{/* Private mode, malformed JSON and old saves start safely. */}
 return result;
}

export const finalQuiz:Quiz[]=[
 {question:'Et nytt system er levert, og alle filer er kopiert. Hva mangler du fortsatt bevis på?',options:['At leverandøren har sendt faktura.','At en ny medarbeider kan finne, åpne og forstå en sak med grunnlag, datoer og ansvar.','At alle filene har samme opprettelsesdato.'],answer:1,feedback:['En faktura dokumenterer ikke brukbar dokumentasjon.','Nettopp. De fem rommene møtes i én prøve: Kan noen andre etterprøve arbeidet?','Like datoer er ikke målet. Riktig sammenheng er.']},
 {question:'Hvordan gjør du lærdommen til handling på neste ledermøte?',options:['Velg en konkret arbeidsflyt, avtal ansvar og frist, og be om å få se en utført kontroll.','Send en generell påminnelse om at arkiv er viktig.','Vent til neste tilsyn med å undersøke praksis.'],answer:0,feedback:['Riktig. En bestilling som kan følges opp gir deg mer enn en god intensjon.','En påminnelse kan hjelpe, men viser ikke om dokumentasjonen faktisk fungerer.','Da utsetter du muligheten til å oppdage og rette blindsoner.']}
];
