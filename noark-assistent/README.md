# Noark 5-arkivassistent

Korte, kildebaserte svar og konkrete henvisninger til Noark 5 versjon 6.0 og arkivregelverket. Formålet er å hjelpe leseren videre til relevant originalmateriale – ikke å skrive lange utredninger.

## To tydelige driftsmoduser

**Lokalt kildesøk** virker uten konto, server eller API-nøkkel. Appen rangerer kuraterte kildeposter og setter sammen forhåndskontrollerte sammendrag.

**GPT-5.6 Luna**, når bakenden er aktivert, er en kostnadseffektiv språkmodell i OpenAIs nano-sjikt med resonneringsnivå `medium`. Den skriver normalt 50–120 ord, støtter oppfølgingsspørsmål og vurderer relevansen til kandidatpostene. Den er ikke GPT-6 eller en ChatGPT Pro-tilkobling. API-bruken faktureres separat.

Modelltilkoblingen er **klargjort, ikke aktivert** i standardkonfigurasjonen. Det tomme `api-config.mjs`-feltet må få adressen til en konfigurert bakende. Grensesnittet viser faktisk modus og faller tilbake til lokalt søk ved feil eller oppbrukt appbudsjett. Se [aktivering av Luna](../noark-api/README.md).

## Prosenttreff og kilder

Prosenten er et **anslag på kildepostens relevans for spørsmålet**, ikke sannsynligheten for at svaret er riktig, og ikke hvor stor del av hele originaldokumentet som svarer på spørsmålet.

- Lokalt: vektet dekning av spørsmålets ord, synonymer og kravnummer, kombinert med BM25-signal. Toppresultatet får ikke automatisk 100 prosent. Kuraterte spørsmål har ikke faste, oppdiktede prosenter.
- Med Luna: semantisk vurdering av hver kandidatpost mot spørsmålet og relevant samtalekontekst. Hvert treff får en kort begrunnelse. Skårene er ikke kalibrert mot menneskelige relevansvurderinger.
- Treff sorteres etter anslått relevans. Henvisninger og kopierte beslutningsnotater oppdateres til samme rekkefølge. Klikk på en eldre svarhenvisning viser kildene til akkurat det svaret.

Bare registrerte kilde-ID-er kan brukes. Lenker, seksjoner, kravnummer og sideankere kommer fra kildebasen, aldri fra modellgenererte nettadresser. Dette hindrer oppdiktede lenker, men beviser ikke at en påstand er korrekt støttet.

## Begrensninger og personvern

Kildebasen består av 71 kuraterte poster fra ti offisielle kilder. Den er ikke en fulltekstindeks, og appen åpner ikke originalkildene i sanntid. KI kan feiltolke både spørsmål, kilder og rettslige skiller. Kontroller ordlyd, dato og gyldighet i originalmaterialet; dette er fagstøtte, ikke juridisk rådgivning. Modelltilkoblingen innebærer ingen ny faglig kvalitetssikring av selve kildebasen.

Ved eksplisitt aktivering av Luna sendes spørsmålet, inntil fire tidligere meldinger og relevante kildeposter via bakenden til OpenAI. Ikke skriv personopplysninger, pasientdata, taushetsbelagt eller intern informasjon. Samtaletekst lagres ikke i bakendens budsjettregister. `store: false` brukes, men dette utelukker ikke leverandørens sikkerhetslogger eller øvrige lovlige oppbevaring. Lokalt søk sender ikke teksten til OpenAI; nylige spørsmål lagres lokalt i nettleseren.

## Kjøring og tester

Fra repository-roten, med Node.js 22 eller nyere:

```sh
cd noark-assistent
npm run validate
python3 -m http.server 8000
```

Åpne `http://localhost:8000`. Lokalkjøringen trenger ingen API-nøkkel. Testene inkluderer søk, kildeintegritet, prosentberegning, kildeomrangering, sitering, samtalekontekst, misbrukskontroll og samtidige budsjettreservasjoner. API-kallene i testene er simulerte; live modellkvalitet må vurderes etter privat aktivering.

## Viktige filer

`engine.mjs` er lokal søkemotor. `rag-shared.mjs` håndterer kontekst, svarformat og kildevalidering. `luna-client.mjs` kobler nettleseren til bakenden uten API-nøkkel. `app.mjs` viser dialog og kildepanel. `../noark-api/worker.mjs` inneholder modellkall, botkontroll og varig budsjettstyring.

Ved regelendringer: kontroller originalkildene, oppdater berørte poster og `corpusVersion`, legg til relevante tester og kjør valideringen før publisering.
