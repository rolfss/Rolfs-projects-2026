# VEDTAK! — Jakten på samfunnsnytten

Et originalt norsk plattformspill inspirert av 90-tallets plattformeventyr. Kari, en gaupe i rød anorakk, hopper gjennom byråkratiet for å få offentlige tjenester helt fram til innbyggerne.

## Spill

Tre kapitler: Kommunekaia, Arkivverket og Digitaliseringsfjellet. Dobbelthopp, kaffedash, papirfiender, bevegelige plattformer, ekspressrør, sjekkpunkter, hemmelige dugnader og en avsluttende boss: Saksbehandlingskøen.

- Piltaster eller A/D: bevegelse.
- Mellomrom, W eller pil opp: hopp; trykk igjen i lufta for dobbelthopp.
- X eller Shift: kaffedash, også gjennom fiender.
- Escape/P: pause. M: lyd av/på.
- Mobil: skjermknapper. Fullskjerm er tilgjengelig der nettleseren støtter det.
- Samle TILLIT-bokstaver, kaffekopper og samfunnsnytte. Hver bane gir medaljer for full tillit, skadefri gjennomføring og under 100 sekunder.
- Ulåste kapitler, beste poengsum og beste medaljer lagres bare på enheten. Sjekkpunkter gjelder den aktive spilløkten.

Lyd er av til spilleren velger den. Original syntetisert musikk og lydeffekter med Web Audio. Ingen konto, sporing eller server er nødvendig. Spillgrafikken er original AI-generert kunst; ingen figurer, musikk eller grafikk fra Nintendo brukes.

## Teknisk

HTML, CSS, Canvas 2D og vanlig JavaScript, uten runtime-pakker. Åpne index.html direkte eller server mappen med en lokal statisk webserver. Google Fonts er valgfri; systemfonter brukes uten nett. `npm test` kjører integrasjonstester av spilltilstand og fysikk i en isolert VM. `npm run check` kontrollerer JavaScript-syntaks.

Støtter tastatur, berøring, pause ved fokusbytte, rullbare dialoger og redusert skjermristing ved redusert bevegelse. Dette er et visuelt actionspill; canvas-spillet har ikke et fullverdig alternativ for skjermlesere.
