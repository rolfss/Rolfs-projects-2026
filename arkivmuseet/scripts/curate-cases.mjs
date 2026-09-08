// Editorial source of the checked JSON. No generated claims or runtime AI.
import {writeFileSync} from 'node:fs';
const checked='2026-09-08';
const src=(id,title,institution,date,url,locator,excerpt='')=>({id,title,institution,date,url,locator,excerpt,type:'primary'});
const claim=(text,id,locator,kind='fact')=>({text,sourceIds:[id],locator,kind});
const base='https://www.nasjonalarkivet.no/content/uploads/2026/02/';
const legalSources=[
src('law26','Lov om dokumentasjon og arkiv (arkivlova)','Lovdata','2025-06-20','https://lovdata.no/dokument/NL/lov/2025-06-20-96','§§ 5 og 8'),
src('reg26','Forskrift om dokumentasjon og arkiv (arkivforskrifta)','Lovdata','2025-12-17','https://lovdata.no/dokument/SF/forskrift/2025-12-17-2647','§§ 5–7, 13–15'),
src('annual24','Årsrapport for tilsyn 2024','Arkivverket','2025-09-23','https://www.nasjonalarkivet.no/content/uploads/2025/11/Arsrapport-for-tilsyn-2024-1.pdf','Side 2 og 5','Innbyggere får ikke innsyn i viktig rettighetsdokumentasjon om seg selv.')
];
const records=[
{id:'osen',title:'Ferdig er ikke synlig',question:'Kan offentligheten finne et dokument den ikke vet finnes?',organization:'Osen kommune',eventDate:'2022–2025',inspectionDate:'2025-04-24',location:'Osen, Trøndelag',wing:'I · Det som ikke ble journalført',position:[-19,9],accent:'#d6b675',visualConcept:'journal',
source:src('osen25','Endelig tilsynsrapport og pålegg – Osen kommune','Arkivverket','2025-05-30',base+'Tilsynsrapport-Osen-kommune-24.04.2025.pdf','Side 3–4, pålegg 2','433 dokumenter i status F verken er kvalitetssikret eller journalførte.'),
narrative:'I april 2025 undersøkte Arkivverket journalføringen i Osen. Kontrollsøket tydet på at 433 ferdigstilte dokumenter eldre enn tre uker ikke var kvalitetssikret eller journalført.',
fact:'Dokumentene var i stor grad politiske saksfremlegg. Noen eksternt mottatte dokumenter var feilaktig registrert som interne x-notater.',
consequence:'Manglene svekket journalens funksjon som inngang til dokumentene. Rapporten dokumenterer ikke at alle dokumentene var utilgjengelige gjennom andre kanaler.',
finding:'Kommunen fikk pålegg om å følge opp journalføring og korrekt registrering, og gjøre rutinene kjent for saksbehandlere og ledere.',
then:'Tilsynet anvendte arkivforskriften fra 2017, blant annet § 9. Henvisningen gjelder 2025, ikke dagens paragrafnummer.',
now:claim('Nå regulerer arkivforskrifta §§ 14–15 journalplikt og løpende registrering av metadata.','reg26','§§ 14–15'),
lesson:'Følg opp overgangen fra ferdigstilt dokument til kvalitetssikret journalpost.',
uncertain:['Dette er tilstanden ved tilsynet i 2025. Senere retting er ikke undersøkt.','Rapportens henvisning til «1999 nr. 126» er en skrivefeil; den tidligere arkivloven er fra 1992.']},
{id:'tokke',title:'Når systemet slås av',question:'Er informasjonen bevart hvis ingen vet om den kan leses?',organization:'Tokke kommune',eventDate:'2019–2024',inspectionDate:'2024-03-18',location:'Tokke, Telemark',wing:'II · Det som forsvant',position:[19,9],accent:'#86b4b7',visualConcept:'server',
source:src('tokke24','Endeleg tilsynsrapport og pålegg om utbetring – Tokke kommune','Arkivverket','2024-04-24',base+'Tilsynsrapport-Tokke-kommune-18.03.2024.pdf','Side 7, pålegg 4','Etter avslutning er det uklart om basa er leseleg.'),
narrative:'Tokke avsluttet elevsystemet Oppad i 2019. Ved tilsynet i 2024 var det uklart om databasen fortsatt kunne leses.',
fact:'Noe var overført til ePhorte, men ikke alt. Driftssenteret undersøkte sikkerhetskopier for å se om et uttrekk var mulig.',
consequence:'Tilgangen til gjenværende elevinformasjon var uavklart. Rapporten fastslår ikke at alt innhold var tapt.',
finding:'Kommunen måtte planlegge et godkjent uttrekk og kartlegge eventuelle tap. Arkivverket understreket at manglende gjenfinning ville innebære uhjemlet kassasjon.',
then:'Pålegget bygget på arkivforskriften fra 2017 og Riksarkivarens forskrift om uttrekk og bevaring.',
now:claim('Arkivforskrifta §§ 5–7 gjelder systemfunksjoner, systembeskrivelser og vedlikehold av digitale arkiv.','reg26','§§ 5–7'),
lesson:'Avslutt ikke systemavtalen før bevaring og lesbarhet er prøvd i praksis.',
uncertain:['Dette er en dokumentert bevaringsrisiko, ikke bevis for endelig tap. Senere gjenfinning eller retting er ikke undersøkt.']},
{id:'innsyn',title:'Hvem kontrollerer avslaget?',question:'Hvordan etterprøver man et avslag når sporene ikke følger saken?',organization:'Arbeids- og inkluderingsdepartementet',eventDate:'2008',inspectionDate:'2008-04-08',location:'Oslo',wing:'III · Innsyn',position:[-19,27],accent:'#d7b08d',visualConcept:'desk',
source:src('ombud08','Arkivering og journalføring i saker om dokumentinnsyn – 2008/171','Sivilombudsmannen (nå Sivilombudet)','2008-04-08','https://www.sivilombudet.no/uttalelser/arkivering-og-journalforing-i-saker-om-dokumentinnsyn/','Oppsummering og ombudsmannens uttalelse','i strid med gjeldende regelverk'),
narrative:'Departementet journalførte ikke dokumenter knyttet til førstegangsbehandlingen av innsynssaker. Dette kom frem da ombudsmannen behandlet en klage.',
fact:'Departementet ga også uriktige opplysninger om sine arkivrutiner.',
consequence:'Ombudsmannen fikk ikke dokumentene og opplysningene han hadde krav på.',
finding:'Ombudsmannen kritiserte både journalføringen og at arkivrutinene ikke var godt nok kjent blant de ansatte.',
then:'Uttalelsen anvendte daværende arkivforskrift § 2-6. Vurderingen gjelder reglene i 2008.',
now:claim('I 2026 unntar arkivforskrifta § 14 tredje ledd vanlige innsynssaker fra journalplikt, med unntak blant annet for nærmere begrunnelse, klage, betaling og hvordan innsyn gis. Arkivplikt må vurderes særskilt.','reg26','§ 14 tredje ledd'),
lesson:'Sørg for at en klageinstans kan følge både avgjørelsen og saksbehandlingen.',
uncertain:['2008-uttalelsen kan ikke brukes som påstand om at alle innsynskrav er journalpliktige i dag.']},
{id:'hanekleiv',title:'Fjellet og sporene',question:'Hvordan kontrollere det som ligger skjult bak overflaten?',organization:'Statens vegvesen',eventDate:'2006-12-25',inspectionDate:'2007-02-15',location:'Hanekleivtunnelen, Vestfold',wing:'IV · Når dokumentasjon blir sikkerhet',position:[19,27],accent:'#a8bdb1',visualConcept:'tunnel',
source:src('tunnel07','St.prp. nr. 68 (2006–2007), kapittel 3.13','Samferdselsdepartementet','2007-05-15','https://www.regjeringen.no/no/dokumenter/stprp-nr-68-2006-2007-/id467021/?ch=3','Kapittel 3.13, undersøkingsgruppa sine konklusjonar, punkt 6','denne dokumentasjonen er ikkje lenger tilgjengeleg'),
narrative:'Hanekleivtunnelen raste 25. desember 2006. En undersøkelsesgruppe gransket årsakene og leverte rapport i februar 2007.',
fact:'Departementets gjengivelse av granskningen sier at ingeniørgeologiske forhold ikke var systematisk kartlagt. Dokumentasjon om omfang og plassering av utført sikring var ikke lenger tilgjengelig.',
consequence:'Granskningen avdekket mangler i sikring og kontroll. Utilgjengelig dokumentasjon var ett av flere funn; den fastslår ikke at arkivtap alene utløste raset.',
finding:'Oppfølgingen omfattet strengere krav til dokumentasjon og kvalitetssikring ved tunnelanlegg.',
then:'Dette er en teknisk granskningshistorie. Utstillingen hevder ikke at det forelå et brudd på arkivloven.',
now:claim('Arkivlova § 5 understreker sikring av informasjon, opphav og sammenheng. Koblingen til sikker overlevering her er museets faglige tolkning.','law26','§ 5','interpretation'),
lesson:'En leveranse er også kunnskapen som gjør den mulig å kontrollere og vedlikeholde.',
uncertain:['Vi bygger på departementets publiserte gjengivelse av undersøkelsesgruppens funn.','Modellen er abstrakt og viser ikke tunnelens faktiske geologi eller sikring.']},
{id:'npe',title:'En dato er et spor',question:'Hva mister en tidslinje når datoene mangler?',organization:'Norsk pasientskadeerstatning',eventDate:'2024',inspectionDate:'2024-11-19',location:'Oslo',wing:'I · Journalens detaljer',position:[-19,45],accent:'#b8c39c',visualConcept:'timeline',
source:src('npe24','Endelig tilsynsrapport og pålegg om utbedring – Norsk pasientskadeerstatning','Arkivverket','2025-01-22',base+'Tilsynsrapport-Norsk-Pasientskadeerstatning-19.11.2024-1.pdf','Side 1–3 og 6–7, pålegg 2','Manglene vi fant er løsbare.'),
narrative:'Ved tilsynet i 2024 manglet dokumentdato på mange journalposter hos Norsk pasientskadeerstatning.',
fact:'Kontrollsøket fant 10 490 slike poster i fagsaker, 11 035 i administrasjon og 268 i personell. Arkivverket undersøkte ikke om selve dokumentene hadde dato.',
consequence:'Arkivverket vurderte det som mindre sannsynlig at manglende dokumentdato vesentlig forringet arkivkvaliteten. Rapporten dokumenterer ikke feil i erstatningsvedtak.',
finding:'Arkivverket krevde korrekt registrering av daterte dokumenter. Etter NPEs innvendinger fikk virksomheten vurdere behovet for etterregistrering. Arkivholdet ble omtalt som generelt godt.',
then:'Vurderingen bygget blant annet på arkivforskriften fra 2017 § 10 bokstav e.',
now:claim('Arkivforskrifta § 15 regulerer metadata i journalen, inkludert dokumentdato eller dato for sending/mottak og tidspunkt for registrering.','reg26','§ 15'),
lesson:'Kontroller kvaliteten på opplysningene rundt dokumentene, ikke bare om filene er lagret.',
uncertain:['Manglende dato på journalposten er ikke det samme som et udatert originaldokument.','Dette er historiske funn. Status for senere utbedring er ikke undersøkt.']}
];
const cases=records.map(r=>({id:r.id,title:r.title,question:r.question,organization:r.organization,eventDate:r.eventDate,inspectionDate:r.inspectionDate,location:r.location,wing:r.wing,position:r.position,accent:r.accent,visualConcept:r.visualConcept,shortNarrative:claim(r.narrative,r.source.id,r.source.locator),documentedFacts:[claim(r.fact,r.source.id,r.source.locator)],consequence:[claim(r.consequence,r.source.id,r.source.locator,r.id==='tokke'?'risk':'fact')],authorityFindings:[claim(r.finding,r.source.id,r.source.locator)],legalFrameworkAtTime:[claim(r.then,r.source.id,r.source.locator)],currentLegalRelevance:[r.now],leadershipLesson:r.lesson,sources:[r.source],quotes:[{text:r.source.excerpt,sourceId:r.source.id}],disputedOrUncertainClaims:r.uncertain,confidence:'Høy for de avgrensede kildefunnene; forbehold er oppgitt.',sourceCheckedDate:checked}));
cases.find(c=>c.id==='osen').displayMetric={value:'433',label:'Ferdigstilte dokumenter i kontrollsøket',sourceIds:['osen25'],locator:'Side 3, pålegg 2'};
writeFileSync('cases/cases.json',JSON.stringify(cases,null,2)+'\n');
writeFileSync('cases/legal-sources.json',JSON.stringify(legalSources,null,2)+'\n');
