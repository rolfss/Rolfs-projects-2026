# Det manglende grunnlaget — valgfri etterforskning

«Det manglende grunnlaget» er en valgfri, fiktiv etterforskning ved siden av de fem kildebaserte utstillingene. Aurora-dokumentene, replikkene og følgene er oppdiktet. De må aldri brukes som dokumentasjon av de virkelige virksomhetene.

Navnet «Sak 17» var et fiktivt saksnummer i den første implementeringen. Det forklarte ikke besøket og ble gjentatt for ofte i grensesnittet. Offentlige etiketter bruker nå «Etterforskning» og «Det manglende grunnlaget»; Aurora identifiserer dokumentene. «Det ordner vi senere» beholdes som fortellingens motiv. Dokumentnavnet, `case17-*`-ID-er, lagringsnøkkelen og `sak17.html` beholdes av hensyn til kompatibilitet. Den gamle tekstlenken gir samme fullstendige innhold som `etterforskning.html`.

## Opplevelsen

Besøket starter fortsatt i den store hovedhallen. Etterforskningen kan åpnes fra besøksplanen eller menyen, fra undersøkelsesbord i rommene eller med F ved et rom. Rom og historiske kilder låses ikke bak fremdrift.

- Ti dokumenter i fem rom. Sporet må åpnes og samles før det vises i tidslinjen.
- Seks oppgaver på dokumentbordet; fire innsynsoppgaver med faktisk markering av fiktiv tekst for sladding.
- Seks ledervalg med etterfølgende, uttrykkelig tenkte konsekvenser. Runden er uten tidspress som standard; 30-sekundersklokken er valgfri og tar aldri valg for besøkende.
- Bevismappe, begrunnet sluttkonklusjon, oppsummering som tekstfil og ett valgfritt notat i skuff 00. Avslutningen fører tilbake til museets felles lederbestilling; etterforskningen er ingen portvakt for hovedreisen.
- Egne undersøkelsesbord med telefon, kalender, penn, lagringsmedium og dokumenter. Hallens ti lys viser innsamlede spor; seks markører viser ledervalgene. Utstillingenes eksisterende geometri og utfall beholdes.

## Tilgjengelighet og personvern

Alle handlinger har vanlige knapper og tastaturtilgang, også fysiske funn og sladding. Ingen oppgave krever en tidsfrist eller hørsel. Klokken pauses ved lukking, fokusbytte og skjult side. Vanlig avslutning med Escape beholdes. Funnene kan undersøkes uten 3D, og `etterforskning.html` inneholder alt materiale og alle vurderinger uten JavaScript.

Replikkene kan leses opp med en lokal norsk nettleserstemme dersom en slik er installert. Det brukes ikke ekstern tale-API eller nedlastede lydopptak. Opplesning må startes med et klikk. Korte, syntetiske handlingslyder følger museets eksisterende lydvalg og volum.

Fremdrift bruker bare `arkivmuseet-case17-v1` i lokal lagring. Feil eller blokkert lagring varsles og hindrer ikke besøk. Nullstilling av etterforskningen endrer ikke reisepass, lederbestilling eller innstillinger. Ingen personopplysninger, analyseverktøy, nye nettjenester eller KI-kall er lagt til.

## Faglige grenser

Sortering er en arbeidsøvelse, ikke et automatisk vedtak om journalføring, bevaring eller kassasjon. Sladding gjelder oppdiktede, uttrykkelig avgrensede opplysninger; dette er ikke et verktøy for å sladde faktiske dokumenter. Juridisk hjemmel og konkret vurdering må håndteres i virkelige saker. Sluttkonklusjonen skiller manglende bekreftelse fra bevist fravær eller endelig tap.

## Vedlikehold og kontroll

Innhold: `cases/investigation.json`. Tilstand og validering: `src/investigation-state.ts`. Dialoger: `src/investigation.ts`. Tillegg til 3D-rommet: `src/investigation-world.ts`. Det er ikke gjort endringer i de eksisterende historiske saksdataene.

`npm test` kjører tilstandstester og eksisterende regresjonstester. `npm run build` lager også tekstversjonen. Med forhåndsvisning på port 4196 kjører `npm run test:investigation` nettlesertester og lagrer skjermbilder/resultater i `qa-investigation/`. `npm run test:browser` kontrollerer den opprinnelige museumsopplevelsen. Valideringsjobben i GitHub Actions kjører begge.
