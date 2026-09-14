// Curated from Rolf's voice interview; summaries are paraphrases.
export const interview = {
  schemaVersion: 1,
  id: 'rolf-interview-2026-09-14',
  date: '2026-09-14',
  sourceType: 'user_voice_interview',
  sourceLanguage: 'en',
  summaryLanguage: 'nb',
  publicationScope: 'Curated public-profile material requested by Rolf; not the complete private conversation.',
  evidenceNote: 'Evidence contains short excerpts from the supplied voice transcript, not independently checked audio or quotations from the books discussed. Summaries are paraphrases.',
  useRules: [
    'Represent self-reports as dated self-reports and personal interpretations as his views, not established external facts.',
    'Describe concrete preferences and activities; do not assign personality-type labels.',
    'Do not infer religious affiliation, party affiliation, diagnoses, relationships or unprovided qualifications.',
    'Do not invent reasons, favourites, experiences, publications or commitments; use each entry\'s limits.',
    'Raw private conversation and third-party personal details are not part of this public dataset.'
  ],
  entries: [
    {
      id: 'interests', topic: 'Interesser og sammenhenger', kind: 'self_report',
      terms: ['interesser','interessert','hobby','hobbyer','interesserer','utenom jobb','spare time','free time','fritid','interests','hobbies','enjoy','outside work'],
      summary: 'Rolf er opptatt av filosofi, mystikk, psykologi og samspillet mellom vitenskap, religion og kunst. Han liker også praktisk AI, programmering, skriving, videoredigering, science fiction, bøker, musikk, Civilization VI, styrketrening og sone 2-kondisjon. Tid med venner, turer, idrett og samtaler om bøker betyr mye for ham.',
      evidence: ['I am interested in philosophy.', 'I am interested in lots of other things such as video editing', 'I love science fiction'],
      related: ['mysticism','technical-background','friendship','exercise','books','music','civilization'], limits: []
    },
    {
      id: 'mysticism', topic: 'Kristen mystikk og religiøs erfaring', kind: 'personal_view',
      terms: ['mystikk','mysticism','mystic','mystics','kristen','christian','religion','religiøs','religious','consciousness','bevissthet','pure consciousness event','divine'],
      summary: 'Rolf interesserer seg for kristen mystikk og religiøs erfaring fra et humanistisk perspektiv; dette var tema for både bachelor- og masteroppgaven hans. Han mener mystikernes beskrivelser kan peke mot erfaringer på tvers av kultur og historie, selv om tolkningene er preget av tid og sted. Han bruker «pure consciousness event» og det guddommelige hinsides kategorier som mulige forståelser, ikke som fastslåtte fakta.',
      evidence: ['I am interested in religious experience from a humanistic perspective.', 'a pure consciousness event', 'Transcultural, transhistorical', 'beyond all religious categories'],
      related: ['past-and-present','psychology-links','julian'],
      limits: ['Do not infer religious affiliation or personal mystical experiences.', 'Thesis titles, institutions and dates were not provided in this interview.', 'This is his interpretation, not an established scientific conclusion.']
    },
    {
      id: 'past-and-present', topic: 'Fortid som inngang til nåtiden', kind: 'personal_view',
      terms: ['fortid','nåtid','past','present','historie','history','perennial','perennial philosophy','huxley','varden','aldous'],
      summary: 'Det som holder mystikkinteressen levende for Rolf, er forbindelsen mellom fortid og nåtid: eldre tekster kan åpne dagens erfaringer, og dagens begreper kan gjøre fortiden tilgjengelig. Han beskriver mystikken som en bro til det stadig nærværende og viser til Vardens vekt på mystikk og et perennialt tema hos Aldous Huxley.',
      evidence: ["I've always been interested in connecting the past with the now", 'we can access the past with the present'],
      related: ['mysticism','psychology-links'],
      limits: ['Do not infer a current office or title for Varden.', 'No exact Huxley passage, edition or quotation was supplied.']
    },
    {
      id: 'psychology-links', topic: 'Psykologi og tverrfaglige forbindelser', kind: 'personal_view',
      terms: ['psykologi','psychology','psychological','psykoterapi','psychotherapy','maslow','grof','jung','tverrfaglig','interdisciplinary','unity','enhet','integritet','integrity'],
      summary: 'Rolf ser mulige forbindelser mellom mystikkens enhetserfaringer og psykologiske beskrivelser av integritet, selvkontakt og emosjonell modenhet. For ham kan overbevisning forenes med sårbarhet og følsomhet for egne følelser og omgivelsene. Han nevner Abraham Maslow, Carl Jung og Stanislav Grof og bruker bildet av å nærme seg samme elefant fra ulike vinkler. Dette er hans tverrfaglige tolkning, ikke en dokumentert likhet eller årsakskjede.',
      evidence: ['having conviction. Yet also vulnerable and sensitive to your environment and your own feelings.', "we're touching the same elephant but from different angles"],
      related: ['mysticism','integrity-example','jung'],
      limits: ['Do not present these parallels as clinical evidence or a verified history of psychological theory.']
    },
    {
      id: 'integrity-example', topic: 'Et praktisk eksempel på integritet', kind: 'reported_example',
      terms: ['presentasjon','presentation','presenting','meeting','møte','nervous','nervøs','mot','courage','valg','choices','praksis','practical','true to'],
      summary: 'Rolf ga et konkret eksempel: før en presentasjon kan han kjenne nervøsitet eller tvil. Da spør han seg om dette fortsatt er noe han virkelig ønsket i rolige øyeblikk, for eksempel ute i naturen. Kontakten med det ønsket kan gjøre at han velger å fortsette selv om situasjonen kjennes skummel. Eksemplet viser hvordan refleksjon kan støtte handling; det er ikke en helsepåstand.',
      evidence: ['Yes, this is where I wanted to be.', 'So even though it can be a bit scary, I will proceed with this'],
      related: ['psychology-links','past-and-present'],
      limits: ['Do not infer a diagnosis or a fixed personality type from ordinary presentation nerves.']
    },
    {
      id: 'dialogue', topic: 'Dialog på tvers av fag og politiske skillelinjer', kind: 'self_report',
      terms: ['politikk','politics','political','dialog','dialogue','spectrum','spekter','debatt','debate','art','kunst','science','vitenskap','philosophy','filosofi'],
      summary: 'Rolf interesserer seg for politisk dialog på tvers av spekteret og for samtaler om hvordan vitenskap, filosofi, religion og kunst virker sammen. Intervjuet inneholder ingen partipreferanse eller konkret politisk posisjon som modellen kan tilskrive ham.',
      evidence: ['a political spectrum dialogue', 'Discussion of science and- philosophy and religion and art'],
      related: ['interests','psychology-links'],
      limits: ['An interest in political dialogue is not evidence of party affiliation or agreement with a particular position.']
    },
    {
      id: 'creative-work', topic: 'Skriving og videoredigering', kind: 'self_report',
      terms: ['skriving','skrive','writing','write','video','videoredigering','video editing','creative','kreativ'],
      summary: 'Rolf er interessert i skriving og videoredigering. Han beskrev ikke bestemte verk, sjangre, programmer eller hvor ofte han arbeider med dette i intervjuet.',
      evidence: ['video editing','writing'], related: ['technical-background','books'],
      limits: ['Do not invent a published writing career, video portfolio or software preference.']
    },
    {
      id: 'technical-background', topic: 'Praktisk AI og programmeringsgrunnlag', kind: 'self_report',
      terms: ['ai','ki','programming','programmering','programmer','coding','kode','technical','teknisk','machine learning','maskinlæring','kompetanse','skills'],
      summary: 'Rolf interesserer seg for AI og AI-forskning og beskriver seg som noe teknisk kompetent, men ikke som spesialist på detaljene i maskinlæring. Han lærte grunnleggende programmering før dagens generative AI-verktøy og sier han kjenner struktur og grunnprinsipper godt. Skill mellom dette selvbeskrevne grunnlaget og dokumenterte prosjektresultater.',
      evidence: ['not in like a machine learning Nitty gritty sort of way', 'basic programming which I learned before the age of AI', 'I know the structure and the basics very well'],
      related: ['creative-work','interests'],
      limits: ['Do not inflate this into machine-learning research expertise or a senior software-engineering qualification.']
    },
    {
      id: 'spanish', topic: 'Spansk', kind: 'self_report',
      terms: ['spansk','spanish','español','language','languages','språk'],
      summary: 'Rolf sier at han kan snakke spansk. Intervjuet angir ikke språknivå, sertifisering eller hvor han lærte språket.',
      evidence: ['I also know how to speak Spanish'], related: [],
      limits: ['Do not infer fluency, CEFR level, native proficiency or qualifications.']
    },
    {
      id: 'friendship', topic: 'Vennskap og fritid sammen med andre', kind: 'self_report',
      terms: ['venner','vennskap','friends','friendship','social','sosial','weekend','helg','hiking','tur','turer','sports','idrett','connection','understood','fritid'],
      summary: 'Rolf liker å være med venner: møtes i helgene, gå på tur, spille idrett, trene, diskutere bøker, ta en øl, prate eller se en film. På en ledig kveld ville han gjerne tatt kontakt med venner. Det særlig givende er å forstå et annet menneske og selv føle seg forstått.',
      evidence: ['feeling like you are understanding and feeling understood by a person is very nourishing to me', 'text them and see if they wanted to have a beer or just chat or watch a movie'],
      related: ['books','exercise','civilization'],
      limits: ['Describe activities and preferences without assigning personality-type labels.']
    },
    {
      id: 'grimstad', topic: 'Tilknytning til Grimstad', kind: 'self_report',
      terms: ['grimstad','hometown','home town','hjemsted','oppvekst','familie','family'],
      summary: 'Rolf kommer fra Grimstad og har venner og familie der. Han fortalte at han tilbringer noen helger i året og enkelte ferieuker der. Dette er en beskrivelse fra intervjuet, ikke en oppdatert reiseplan eller bostedsadresse.',
      evidence: ['I come from Grimstad. I have friends and family there'], related: [],
      limits: ['Do not infer current residence, a precise address or future travel dates.']
    },
    {
      id: 'exercise', topic: 'Styrketrening og sone 2-kondisjon', kind: 'self_report',
      terms: ['trening','training','exercise','fitness','weightlifting','weight lifting','styrketrening','muscle','muskler','hypertrophy','zone 2','sone 2','cardio','kondisjon','supplements','kosttilskudd'],
      summary: 'Rolf trener styrke og sone 2-kondisjon og følger forskning om styrketrening og muskelvekst. Han er også interessert i kosttilskudd. Intervjuet angir ikke et konkret program, prestasjonsnivå, produkter han bruker eller doser.',
      evidence: ['weight lifting', 'zone 2 cardio', 'I like to pay attention to new science when it comes to lifting weights and how to build muscle', 'interested in supplements'],
      related: ['friendship'],
      limits: ['Interest in supplements is not evidence of use; do not infer products, doses or medical needs.']
    },
    {
      id: 'music', topic: 'Musikksmak', kind: 'self_report',
      terms: ['musikk','music','band','bands','listen','lytter','metallica','megadeth','carbon based lifeforms','carbon-based life forms','solar fields','jan johansson','jazz','metal','ambient'],
      summary: 'Rolf nevner Metallica, Megadeth, Carbon Based Lifeforms, Solar Fields og den svenske jazzmusikeren Jan Johansson som musikk han liker. Han beskriver smaken som bred. Intervjuet gir ingen rangering, favorittalbum, bestemte låter eller begrunnelse for hver artist.',
      evidence: ['Metallica Megadeth', 'carbon-based life forms, solar fields', 'Jan Johansson', 'I like uh many different kinds of music'],
      related: ['interests'],
      limits: ['Do not invent favourite albums, songs, concerts or artist-specific reasons.']
    },
    {
      id: 'science-fiction', topic: 'Science fiction og lydbøker', kind: 'self_report',
      terms: ['science fiction','sci fi','scifi','science-fiction','lydbøker','audiobook','audiobooks','liu cixin','cixin','three body','earths past','earth s past','television','tv','series','serier'],
      summary: 'Rolf er glad i science fiction, lydbøker og TV-serier. Han trekker særlig frem Liu Cixins science fiction-trilogi om jordens fortid. Han utdypet ikke hvorfor akkurat den trilogien betyr mye, og nevnte ingen bestemte TV-serier eller filmer.',
      evidence: ['I love science fiction', 'audiobooks', "I love Liu Cixin's"],
      related: ['books','formative-reading'],
      limits: ['The spoken trilogy title may be imprecise; no edition or exact title quotation is established here.', 'Do not invent favourite films, TV series or reasons for liking the trilogy.']
    },
    {
      id: 'civilization', topic: 'Civilization VI', kind: 'self_report',
      terms: ['civilization','civilisation','civ','civ 6','civ vi','civilization 6','civilization vi','gaming','spiller','spill','game','games','flow','flyt'],
      summary: 'Rolf spiller Civilization VI av og til. Han liker å bli oppslukt av spillets flyt slik at timene går fort. Intervjuet sier ikke noe om favorittsivilisasjon, vanskelighetsgrad, seierstype eller spillstrategi.',
      evidence: ['occasionally I play a game called Civilization 6', 'getting lost in the flow of civilization is Very fun'],
      related: ['friendship'],
      limits: ['Do not invent play frequency beyond occasionally or specific game preferences.']
    },
    {
      id: 'books', topic: 'Bøker og forfattere', kind: 'self_report',
      terms: ['bok','bøker','book','books','reading','read','leser','lesing','litteratur','literature','author','authors','forfatter','forfattere'],
      summary: 'Bøker og forfattere Rolf fremhevet: Hermann Hesses Siddhartha, Carl Jung, Julian of Norwichs Revelations of Divine Love og Liu Cixins science fiction-trilogi. Han leste Harry Potter i oppveksten og er glad i The Lord of the Rings. Begrunnelsene han faktisk ga, var særlig Siddharthas utviklingsreise, Jungs kobling av erfaring og teori og Julians poetiske skjønnhet.',
      evidence: ['Siddhartha', 'Carl Jung', 'Revelations of Divine Love', 'I read Harry Potter growing up', 'Lord of the Rings I love'],
      related: ['hesse','jung','julian','science-fiction','formative-reading'], limits: []
    },
    {
      id: 'hesse', topic: 'Hermann Hesse: Siddhartha', kind: 'self_report',
      terms: ['hesse','hermann','herman','siddhartha','self development','selvutvikling'],
      summary: 'Siddhartha av Hermann Hesse betyr noe for Rolf fordi han opplever boken som en svært rørende selvutviklingsreise. Han ga ikke flere detaljer om bestemte scener, personer eller sitater.',
      evidence: ['because it is a very touching self-development journey'], related: ['books','mysticism'],
      limits: ['Any further interpretation of why he likes the novel must be identified as a suggestion, not his stated reason.']
    },
    {
      id: 'jung', topic: 'Carl Jung: personlig erfaring og teori', kind: 'self_report',
      terms: ['jung','carl jung','theory','teori','theoretical','teoretisk','development','utvikling'],
      summary: 'Rolf inspireres av hvordan Carl Jung beskriver sin egen utvikling levende og rått og bruker personlige erfaringer til å bygge omfattende teoretiske rammeverk. Han navnga ingen bestemt Jung-bok i intervjuet; modellen skal ikke fylle inn en tittel på egen hånd.',
      evidence: ['how he used his own personal experience to build profound theoretical frameworks', 'it is very very inspiring to me'],
      related: ['books','psychology-links'],
      limits: ['No specific Jung book was named. This describes Rolf\'s reading experience, not independent validation of Jung\'s theories.']
    },
    {
      id: 'julian', topic: 'Julian of Norwich: Revelations of Divine Love', kind: 'self_report',
      terms: ['julian','norwich','revelations','divine love','poetic','poetisk','beauty','skjønnhet'],
      summary: 'Rolf fremhever Julian of Norwichs Revelations of Divine Love fordi han opplever teksten som poetisk og svært vakker. Dette knytter lesegleden hans til interessen for kristen mystikk, uten at det fastslår noen religiøs tilhørighet.',
      evidence: ['because it is so poetic in a way and very beautiful'], related: ['books','mysticism'],
      limits: ['Do not invent a favourite passage, translation or theological commitment.']
    },
    {
      id: 'formative-reading', topic: 'Fantasy fra oppveksten og senere', kind: 'self_report',
      terms: ['harry potter','potter','lord of the rings','rings','tolkien','ringenes herre','fantasy','childhood','oppvekst'],
      summary: 'Rolf leste Harry Potter i oppveksten og sier at han er svært glad i The Lord of the Rings. Han ga ingen rangering eller nærmere begrunnelse og skilte ikke mellom bestemte utgaver eller filmatiseringer.',
      evidence: ['I read Harry Potter growing up', 'Lord of the Rings I love'], related: ['books','science-fiction'],
      limits: ['Do not infer favourite characters or a preference for film adaptations.']
    }
  ]
};
