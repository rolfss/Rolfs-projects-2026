# Arkivmuseet 1.2 — den sammenhengende romreisen

Hvert rom følger én fortelling: saken → undersøkelse → ledervalg → mulige følger → to spørsmål → læringsmerke. Ingen tidspress, straffepoeng eller påstand om at spilleren reparerer en virkelig historisk sak.

## Fem forskjellige undersøkelser

- Osen: kontroller metadata, journalfør øvingsposten og skriv et søkeord som faktisk gir treff.
- Tokke: prøv uttrekket, kontroller innhold og sammenheng, avtal videre ansvar før systemstenging.
- Innsyn: bygg en saksgang av krav, vurdering, avgjørelse og klage.
- Hanekleiv: avdekk plassering av skjult sikring, og knytt utførelses- og kontrollgrunnlag til modellen.
- NPE: skill dokumentdato, mottaksdato og registreringsdato i et oppdiktet brev.

Undersøkelsene endrer en egen SVG-prinsippskisse som også brukes som tekstur i den fysiske 3D-installasjonen. Innstillinger for redusert bevegelse respekteres. Hele historien og alle kontroller finnes også uten WebGL. Fotografier, faksimiler, krediteringer og kildevisning er beholdt.

## Fremdrift

`arkivmuseet-narrative-v2` lagrer romfase, en validert undersøkelsessekvens, ledervalg, tidslinje og quizsvar lokalt. Fem læringsmerker åpner sluttrommets to sammenfattende spørsmål. Den tidligere lederbestillingen i `arkivmuseet-journey-v1` beholdes. Gamle merker omgår ikke de nye romprøvene. Sletting av reisen krever eksplisitt bekreftelse. Ingen data sendes til en server.

## Forfatterkilder

`src/room-stories.ts` er det redaksjonelle manuskriptet. Historiske påstander bygger på de eksisterende, kildehenviste saksdataene. Tokke er ikke presentert som fastslått arkivtap, Hanekleiv-funnet er ikke en eneårsak til raset, og NPEs metadataavvik er ikke presentert som feil erstatningsvedtak. Historiske regler gjøres ikke automatisk til dagens rett.

`public/tekst.html` og `SOURCES.md` genereres ved bygging. Den genererte tekstversjonen har samme nye fortellinger, moralske poenger, øvelser og spørsmål som den interaktive reisen. Kildevalidering ved bygging er ikke en ny ekstern faktakontroll.

## Kontroller

Kjør `pnpm test` og `pnpm build`. Kjør deretter `pnpm exec playwright install --with-deps chromium` og `pnpm test:browser`.

Nettlesertesten starter sin egen forhåndsvisning, spiller alle fem rom med både svake og beskyttende valg, prøver gale og riktige quizsvar, kontrollerer lagring, sluttrom, kilder, handlingsplan og skjermbredder ned til 320 piksler. Den undersøker at den faktiske 3D-installasjonen mottar spillerens fremdrift. Resultater og skjermbilder skrives til `experience-artifacts/` og publiseres som et kortvarig GitHub Actions-artefakt, ikke til produksjon.

Teknisk gjennomspilling erstatter ikke observasjon av målgruppen. Påstander om læringseffekt eller opplevd moro krever brukertesting.
