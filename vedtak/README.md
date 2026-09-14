# VEDTAK! — Felles sak

Et originalt norsk plattformspill inspirert av 90-tallets plattformeventyr. Kari, en gaupe i rød anorakk, tar stafetten gjennom tre verdener som feirer fellesskap, fagstolthet og de små innsatsene som betyr noe i folks hverdag. Termosen er med.

## Spill

Tre kapitler: Kommunekaia, Arkivverket og Digitaliseringsfjellet. Dobbelthopp, kaffedash, sprelske papirfigurer, bevegelige plattformer, ekspressrør, sjekkpunkter, hemmelige dugnader og en avsluttende boss: Konfettikolossen. Seks stempler slipper feiringen løs!

- Piltaster eller A/D: bevegelse.
- Mellomrom, W eller pil opp: hopp; trykk igjen i lufta for dobbelthopp.
- X eller Shift: kaffedash, også gjennom fiender.
- Escape/P: pause. M: musikk av/på. Lydeffekter har en egen knapp.
- Mobil: skjermknapper. Fullskjerm er tilgjengelig der nettleseren støtter det.
- Samle TILLIT-bokstaver, kaffekopper og glimt som gir fellesskapspoeng. Hver bane gir medaljer for full tillit, skadefri gjennomføring og under 100 sekunder.
- Hvert kapittel har tre valgfrie lagoppdrag, med 300 bonuspoeng per oppdrag. Samle seks merker med 400 bonuspoeng hver per spillrunde, og stig gjennom fem ranger fra God kollega til Fellesskapsstjerne.
- Samling og sprett lader Fellesløft. Når måleren når 30, får du glimtmagnet og doble poeng i syv sekunder.
- Ulåste kapitler, beste poengsum, medaljer, merker og lydvalg lagres bare på enheten. Sjekkpunkter og aktive oppdrag gjelder spilløkten. Tidligere lagret framdrift blir bevart.

Musikken begynner når du trykker Start. Hver verden har et originalt tema med melodi, bass, rytme og akkompagnement, spilt med Web Audio. Musikk og lydeffekter kan slås av hver for seg; innstillingen huskes. Pause og skjult fane pauser musikken. Ingen konto, sporing eller server er nødvendig. Spillgrafikken er original AI-generert kunst; ingen figurer, musikk eller grafikk fra Nintendo brukes.

## Teknisk

HTML, CSS, Canvas 2D og vanlig JavaScript, uten runtime-pakker. Åpne index.html direkte eller server mappen med en lokal statisk webserver. Google Fonts er valgfri; systemfonter brukes uten nett. `npm test` kjører integrasjonstester av spilltilstand og fysikk i en isolert VM. `npm run check` kontrollerer JavaScript-syntaks.

Støtter tastatur, berøring, pause ved fokusbytte og rullbare dialoger. Konfetti, glimt, ekspanderende ringer og fyrverkeri feirer hopp og milepæler. Redusert bevegelse fjerner skjermristing og ringeffekter og reduserer partikkelmengden. Ingen blinkende helskjermseffekter. Dette er et visuelt actionspill; canvas-spillet har ikke et fullverdig alternativ for skjermlesere.
