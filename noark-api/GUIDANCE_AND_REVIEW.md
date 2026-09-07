# Veiledere og privat kvalitetsgjennomgang – 7. september 2026

## Leveranse og utrulling

Kildegrunnlaget er utvidet fra 71 poster / 10 kilder til **154 poster / 17 kilder**:
18 nye, korte veiledningsposter og 65 faktiske formatoppføringer. Modellen er fortsatt
`gpt-5.6-luna`, medium, med samme maksimum for input/utdata og samme prisforutsetninger.

**En GitHub Pages-publisering oppdaterer ikke Cloudflare Worker automatisk.**
Kjør eksisterende utrullingsløype på oppdatert `main` fra `noark-api`:

```sh
npx wrangler@4 deploy
```

Behold Worker-navnet `noark-luna-api`, `LUNA_GATE` / `LunaGate`, migreringen `v1`
og objektidentiteten `noark-global-budget-v1`. Eksisterende kredittregnskap må ikke
slettes, kopieres til en ny instans eller nullstilles. Migreringen `v2-question-review`
oppretter **bare en separat QuestionLog**. Eksisterende OpenAI-/Turnstile-hemmeligheter
og dashboardets offentlige Turnstile-variabel skal beholdes.

Etter utrulling skal `/api/health` vise `corpusVersion: "2026-09-07"`,
`dailyBudgetUsd: 2`, `monthlyBudgetUsd: 6`, `trialBudgetUsd: 6` og
`questionLogging: { enabled: true, policy: "2026-09-review-v1", retentionDays: 30, text: "opt-in" }`.
Helsekontrollen er konfigurasjonskontroll, ikke bevis på fungerende betalt modelltilgang.
Test ett kort spørsmål fra den virkelige appen med ordinær Turnstile.

I overgangsperioden godtar den nye klienten kun den kjente eldre korpusversjonen
`2026-09-02`. Gammelt Luna-svar merkes med dette grunnlaget, og kilde-ID-ene må tilhøre
den uendrede gamle katalogen. Spørsmål der nye kilder er blant de tre sterkeste
kandidatene, besvares lokalt med oppdaterte kilder i stedet. Ingen vilkårlige eller
ukjente korpusversjoner godtas. Fjern overgangsstøtten etter bekreftet koordinert utrulling.

## Kildene

Alle nye poster har offisiell URL, seksjonsnavn, virkeområde, kildetype og kontrolltidspunkt.
Formatoppføringene bevarer filendelser, PRONOM PUID-er og eksplisitte versjoner fra
Nasjonalarkivets tabell. Tomt versjonsfelt er ikke omskrevet til aksept for alle versjoner.
Dette er en lenket, kuratert kunnskapsbase, ikke en fulltekstkopi eller et løpende nettsøk.

Katalogen er dokumentert i `noark-assistent/guidance-data.mjs` og omfatter:

- Aksepterte filformater for avlevering til Nasjonalarkivet.
- Internkontroll, inkludert dokumentfangst fra Teams, SharePoint, SMS og e-post.
- Systemkartlegging og vurdering av dokumentasjon som skal forvaltes som arkiv.
- Bevaringskriteriene i arkivforskrifta § 2.
- Mediekonvertering, metadata, kvalitetssikring og vilkår for destruksjon.
- Søknader om kassasjon av enkeltopplysninger.
- Arkades formatanalyse, pakking og dokumenterte PDF/A-begrensning.

Formataksept gjelder den oppgitte mottakeren og er ikke det samme som godkjenning av
hele avleveringen. Fravær fra listen tolkes ikke som et generelt forbud. For andre depot
må krav avklares særskilt. Eldre avleverings-/fotoveiledere merket «ikke oppdatert» ble
ikke gjort til gjeldende regelgrunnlag. Arkades eldre forskriftshenvisninger overstyrer
ikke den nye formatlisten.

Søk normaliserer PDF/A-varianter og flere norske bøyningsformer. SIARD-versjoner får
ikke automatisk kravnummerbonus. Relevansprosentene er fortsatt heuristikker eller
modellanslag, ikke kalibrerte sannsynligheter. Formatkandidater får med avtalekonteksten
til modellen uten oppblåste søkeskårer. Nye spørsmålstester kontrollerer topptreff,
versjoner, virkeområde og siteringsintegritet; de beviser ikke modellens juridiske riktighet.

## Hva registreres?

Når `QUESTION_LOG_ENABLED = "true"`, registreres én privat gjennomgangspost for hver
backendforespørsel som har passert Turnstile og den sentrale reservasjonen/forespørselsgrensen.
Også godkjente spørsmål uten kildekandidater registreres, uten betalt modellkall.
Botforsøk, ugyldige/avviste forespørsler, duplikater og rent lokale søk registreres ikke
som spørsmål. Loggfeil må ikke utløse nytt betalt kall; ved driftsfeil eller kapasitetsgrense
kan loggposter derfor mangle. Dette er kvalitetsdiagnostikk, ikke et komplett revisjonsspor.

Uten separat samtykke lagres bare dag, korpusversjon, kilde-ID-er, treffskårer og utfall.
**Spørsmålstekst krever en egen, ikke forhåndsavkrysset avkrysning.** Samtykkets policyversjon
kontrolleres av bakenden. Modellsvar, samtalehistorikk, rå IP-adresser, brukeragenter,
Turnstile-token og API-nøkler lagres ikke i gjennomgangsloggen. Det eksisterende,
separate misbruksvernet bruker fortsatt daglig saltede IP-avtrykk.

Samtykket tekst avkortes til 350 tegn. Vanlige identifikatorer og mulige navn forsøkes
fjernet. Enkelte sensitive mønstre fører til at teksten utelates helt. **Dette er ikke
garantert anonymisering**: oppføringer kan fortsatt være personopplysninger og må
behandles konfidensielt. Ikke markedsfør løsningen som egnet for pasientinformasjon,
taushetsbelagt innhold eller konkrete personalsaker.

Aktive oppføringer utløper etter 30 dager. Durable Object-alarmer rydder selv om ingen
nye spørsmål kommer inn; utløpte data skjules også ved eksport. Maksimum er 5 000 poster.
Cloudflares gjenopprettingskopier kan ha egen levetid; en gjenopprettet database må
fortsatt håndheve opprinnelig utløpstid. Lokale eksportfiler må slettes separat.

Eier må vurdere behandlingsgrunnlag, informasjon til brukere, databehandleravtaler,
leverandørvilkår, tilgangsstyring og eventuelle overføringer. Koden alene er ingen
personvernrettslig godkjenning. Tekstsamtykke er ikke nødvendig for å få svar.

## Privat tilgang og faktisk forbedringsarbeid

Ingen spørsmål publiseres på GitHub Pages, i repositoryet eller gjennom et offentlig
analyseendepunkt. `GET /api/admin/questions` og `DELETE /api/admin/questions` krever
`Authorization: Bearer ...` med en separat `QUESTION_REVIEW_KEY` på minst 32 tegn.
Endepunktet er stengt hvis hemmeligheten mangler; tekstinnsamling krever ikke at dette
leseendepunktet åpnes. Ingen CORS-tilgang gis. Nøkkelen må ikke legges i URL, frontend
eller kildekode.

Opprett ved behov en kryptografisk tilfeldig gjennomgangsnøkkel i en passordbehandler.
Lagre den i Cloudflare som **Secret** med navnet `QUESTION_REVIEW_KEY`, ikke i chat.
Kjør deretter lokalt:

```sh
node noark-api/review-questions.mjs
```

Skriptet ber om gjennomgangsnøkkelen i et skjult terminalfelt. Det sender den bare til
den fast kontrollerte Worker-adressen, følger ikke omdirigeringer og skriver en privat
rapport til den git-ignorerte mappen `noark-api/private-review/`. Terminalen viser bare
antall. Rapporten grupperer samtykkede spørsmål og prioriterer svake/ubesvarte tilfeller.
Ikke last opp rapporten eller rå spørsmål til et offentlig issue eller en commit.

Gjennomgangen er **menneskestyrt**: kontroller behovet, finn en autoritativ kilde,
parafraser og generaliser spørsmålet slik at person-/virksomhetsopplysninger fjernes,
lag en ny test med forventede kilde-ID-er, og revider katalog/synonymer gjennom vanlig
kodegjennomgang. Logger sendes ikke til Luna, blir ikke automatisk RAG-kilder og
re-trener ikke modellen. Hyppig stilte spørsmål beviser ikke at en påstand er riktig.
Ingen periodisk gjennomgang er aktivert av denne endringen.

`QUESTION_LOG_ENABLED = "false"` stopper nye gjennomgangsposter. For en varig endring
må også Wrangler-konfigurasjonen oppdateres; verdier definert i filen kan overstyre
dashboardet ved senere deploy. Eksisterende poster utløper fortsatt. Autentisert DELETE
sletter bare gjennomgangsloggen, **aldri budsjettregisteret**.

## Kontroller

```sh
cd noark-assistent
npm run validate
```

Testene inkluderer både opprinnelige tester og nye tilfeller for formatvarianter,
relevans, kompatibilitet, opt-in, redigering, autentisering, utløp, lagringsgrenser og
bevaring av budsjett. Modell- og Turnstile-kall i enhetstestene er simulerte.

Offisielle tekniske/personvernkilder:
- https://developers.cloudflare.com/durable-objects/api/alarms/
- https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/
- https://www.datatilsynet.no/rettigheter-og-plikter/personvernprinsippene/
