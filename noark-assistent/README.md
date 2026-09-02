# Noark 5-arkivassistent

En statisk, kildebasert søke- og svarassistent for **Noark 5 versjon 6.0** og arkivregelverket som trådte i kraft 1. januar 2026.

Appen er laget for arkivarer, dokumentasjonsforvaltere, systemeiere, løsningsarkitekter og andre som trenger å finne relevante Noark-krav raskt og kontrollere grunnlaget i originalkilden.

## Hva den gjør

- Henter relevante kildeposter med lokal, BM25-lignende rangering.
- Gjenkjenner sentrale spørsmål om Noark-status, systemvalg, integrasjon, journalføring, uttrekk, metadata og arkivforskrifta § 5.
- Setter sammen korte svar bare fra forhåndskontrollerte kildeoppsummeringer.
- Viser kilde, seksjon, side og kravnummer der dette finnes.
- Har et filtrerbart kravbibliotek med kravtypene O, B, V og samleposter med blandede kravtyper.
- Lagrer bare nylige spørsmål lokalt i nettleseren.
- Krever ingen API-nøkkel, server eller konto.

## Hvorfor løsningen er statisk

GitHub Pages kan ikke beskytte en servernøkkel. Denne versjonen bruker derfor RAG-prinsippet — **hent, ranger, sett sammen og siter** — uten å sende spørsmål eller dokumenter til en ekstern språkmodell. Det gjør demoen trygg å åpne, enkel å teste og etterprøvbar. Den frie tekstgenereringen er erstattet med deterministisk kildesyntese for å redusere risikoen for oppdiktede påstander.

## Kildegrunnlag

Kildebasen inneholder 71 kuraterte poster fra ti offisielle kilder, blant annet:

- Noark 5 versjon 6.0 med funksjonelle krav.
- Metadatakatalogen og den objektsorterte metadataoversikten.
- Nasjonalarkivets veiledning om Noark etter regelendringen i 2026.
- Nasjonalarkivets veiledning til funksjonskravene i arkivforskrifta § 5.
- Gjeldende arkivlov, arkivforskrift og bevaringsforskrift hos Lovdata.

Kildepostene er korte, faglige sammendrag. De erstatter ikke originaldokumentene. Appen peker derfor alltid videre til kilden.

## Kjør lokalt

Fra prosjektmappen:

```bash
python3 -m http.server 8000
```

Åpne deretter `http://localhost:8000`.

## Tester

```bash
npm test
npm run check
```

Testene kontrollerer blant annet kildeintegritet, kravnummer, metadataelementer, relevante beslutningsspørsmål, filtre, PDF-sideankere og at spørsmål utenfor grunnlaget avvises.

## Arkitektur

- `data.mjs` — kilder, kuraterte kildeposter, temaer og intensjoner.
- `engine.mjs` — normalisering, synonymutvidelse, rangering, svarsyntese og henvisninger.
- `app.mjs` — brukergrensesnitt, historikk, delingslenker, kildepanel og kravbibliotek.
- `index.html` og `styles.css` — statisk, responsivt grensesnitt uten eksterne avhengigheter.
- `tests/engine.test.mjs` — automatiske domenetester.

## Vedlikehold

Når standarden eller regelverket endres:

1. Oppdater eller legg til kilden i `SOURCES`.
2. Revider berørte poster i `RECORDS` og endre `corpusVersion`.
3. Legg til test for endringen.
4. Kjør `npm run validate`.
5. Kontroller originalkildene manuelt før publisering.

## Avgrensning

Verktøyet er fagstøtte, ikke juridisk rådgivning. Kildegrunnlaget er bredt nok til sentrale spørsmål, men er ikke en fulltekstindeks over hele Noark-standarden eller regelverket.
