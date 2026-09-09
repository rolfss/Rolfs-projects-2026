# Arkivmuseet

**Sporene staten ikke hadde råd til å miste.** Et museum i sanntids-3D om offentlig dokumentasjon, offentlighet og etterprøvbarhet.

[Besøk museet](https://rolfss.github.io/Rolfs-projects-2026/arkivmuseet/) · [Full tekstversjon](https://rolfss.github.io/Rolfs-projects-2026/arkivmuseet/tekst.html)

Fem kildebelagte utstillinger: Osen kommune, Tokke kommune, Sivilombudsmannens sak 2008/171, Hanekleivtunnelen og Norsk pasientskadeerstatning. Fem interaktive lederoppdrag knytter kildefunnene til hverdagen: undersøk dokumentasjon, velg handling, spol frem til mulige følger og prøv igjen. Reisepasset viser fem læringsmerker; merkene måler bare gjennomførte øvelser. Lederens rom har også de fire opprinnelige scenarioene. Ingen konto, server, analyseverktøy eller runtime-KI.

## Besøket

- **Gå inn i museet:** besøket starter i den store hovedhallen med fri bevegelse, også når du har lagret fremdrift. Gå gjennom portalene eller velg et rom fra romoversikten. Åpne utstillingen når du er klar til å lese og prøve et oppdrag. Omvisning velges inne i museet.
- **Utforsk rommene:** fem oppdrag med 20 undersøkbare sporkort og 15 ulike handlingsforløp. Konsekvensene er tydelig merket som tenkte; historiske funn og forbehold finnes ved siden av.
- **Prøv valgene:** hvert forløp har tre tidspunkt. Spol frem, sammenlign med et alternativ og gå tilbake. Ingen tidsfrist eller poeng for fart.
- **Reisepass:** fremdrift og valg lagres bare i denne nettleseren. Skadet eller utilgjengelig lagring blokkerer ikke besøket. Reisen kan nullstilles etter bekreftelse.
- **Min lederbestilling:** velg tiltak, ansvarlig rolle og oppfølgingsdato. Last ned tekst eller skriv ut / lagre PDF. Ingen opplysninger sendes til en server.
- **Spill uten 3D:** alle oppdrag og lederbestillingen kan brukes uten WebGL. Den fullstendige tekstversjonen har også oppdrag, alle alternativer, bilder og kilder uten JavaScript.
- Fotografier fra Hanekleivtunnelen og Dalen i Tokke og faksimiler fra Osen- og NPE-rapportene er inkludert lokalt. Stedsbilder er merket som stedsbilder. Se `public/assets/cases/credits.json`.

- WASD: gå. Dra på rommet: se. Piltaster: gå/snu. E eller klikk på installasjonen: åpne.
- Dobbeltklikk: valgfri låsing av musepeker. Escape: meny og pause.
- Guidet visning eller romoversikt: flytt direkte til en utstilling uten førstepersonskontroller.
- Berøring: egne bevegelsesknapper og dra for å se.
- Menyen har redusert bevegelse, følsomhet, volum, tekststørrelse og lavere bildekvalitet. Lokale preferanser lagres i nettleseren.
- Lyden er valgfri. Ingen faglig informasjon formidles bare gjennom lyd. Tekst beskriver romlyd og fottrinn.
- Tekstversjonen virker uten WebGL og JavaScript og har alle historier, kildeavgrensninger, regler og lederscenarioer.

## Utvikling

Node 22.12+ eller 24+, pnpm 11.19.0. Installer med `pnpm install --frozen-lockfile`. Start med `pnpm dev`. Kjør `pnpm test` og `pnpm build`. Produksjonen kan prøves med `pnpm preview`.

Basepath er `/Rolfs-projects-2026/arkivmuseet/`. GitHub Pages-arbeidsflyten installerer avhengigheter fra låsefil, tester, bygger og kopierer bare `dist/` til `_site/arkivmuseet/`. De øvrige prosjektene beholder sine vanlige løp.

## Innhold og nye utstillinger

`cases/cases.json` er publiseringsgrunnlaget. Påstander har kilde-ID, lokalisering og type (`fact`, `risk`, `interpretation`). `cases/legal-sources.json` inneholder felles rettskilder. `cases/leader-scenarios.json` har de opprinnelige fiktive ledervalgene. `cases/missions.json` beskriver de fem nye oppdragene; `src/journey-state.ts` håndterer validerbar fremdrift, bevisvurdering og eksport. `src/journey.ts` kobler oppdragene til museumsreisen.

`scripts/validate-cases.mjs` stanser bygging ved manglende kilder, usporbare påstander, avvikende sitater, dupliserte ID-er eller ufullstendige saksdata. Valideringen beviser strukturell sporbarhet, ikke at en tolkning er riktig. Kildekritikk må fortsatt gjøres redaksjonelt.

Legg til data etter samme skjema, velg en installasjonstype og angi romposisjon. De seks eksisterende romposisjonene er forhåndsbygget. Flere fysiske fløyer krever utvidelse av romoppsettet og navigasjonsgrensene i `src/world.ts`; innholdet kan utvides uten å modellere nye gjenstander. `scripts/curate-cases.mjs` er et redaksjonelt engangsverktøy for de første fem sakene og kjøres ikke automatisk ved bygging. Endre JSON direkte ved senere kuratering.

## 3D og ytelse

Én motor: Three.js, TypeScript og Vite. Modulære Blender-modeller eksporteres med `blender --background --factory-startup --python scripts/make-assets.py`. Ferdig GLB er inkludert; Blender trengs ikke i Pages-byggingen.

Modellpakken er ca. 582 kB ukomprimert. 3D-koden lastes som separat modul; samlet komprimert JavaScript er ca. 180 kB. Kolonner og gulv er instansierte; statisk geometri slås sammen per materiale. Rominstallasjoner bygges ved nærhet og skjules på avstand. Bildeoppløsning begrenses; skygger kan slås av med lavere bildekvalitet. Materialdetaljer og lyd genereres lokalt. De fire bildene er lokale WebP-filer på til sammen omtrent 750 kB. Ingen bilde-CDN eller ekstern forespørsel trengs under besøket. Fototeksturer lastes ved rombesøk.

Automatisk maskinvaremåling er ikke en garanti for alle telefoner. Første utgave ble testet i berøringsemulering; den nye oppdragsreisen er ikke nettlesertestet i denne endringen; fysisk iOS/Safari er ikke sertifisert. Full tekst gir et varig alternativ ved manglende grafikkstøtte.

Se [SOURCES.md](./SOURCES.md), [LEGAL-NOTES.md](./LEGAL-NOTES.md), [CREDITS.md](./CREDITS.md) og [VALIDATION.md](./VALIDATION.md).
