# Archive Assist

**Innholdsbasert saksdokumenttittel og metadatahjelp for arkivfiler**

[Åpne den publiserte demoen](https://rolfss.github.io/Rolfs-projects-2026/archive-assist/)

Archive Assist er en statisk nettleserapp som leser dokumentinnhold, foreslår saksdokumenttittel og øvrige metadata, og lar saksbehandler eller arkivar kontrollere resultatet før videre overføring eller registrering.

## Saksdokumenttittel

Tittelen kommer ikke lenger bare fra filnavnet. Ved innlasting prioriterer motoren:

1. oppgitt emne eller sak;
2. uttrykkelig tittel i dokumentet;
3. emnefelt i dokumentet eller e-posten;
4. første tydelige overskrift;
5. første meningsbærende setning;
6. filnavnet som reserve.

Forslaget settes direkte i det redigerbare tittelfeltet. Brukeren ser metode, begrunnelse, sikkerhet og kontrollstatus, og kan godkjenne forslaget eller skrive en annen tittel. En menneskeredigert tittel blir ikke overskrevet av en senere AI-analyse.

Når nettleseren støtter en lokal språkmodell gjennom Prompt API, kan appen forbedre tittel, dokumenttype, emne, beskrivelse og andre uttrykkelige metadata på enheten. Funksjonen bruker ingen API-nøkkel og sender ikke dokumentinnhold til Archive Assist. Den deterministiske innholdsanalysen virker også uten denne nettleserfunksjonen.

Se den versjonerte [prompten for saksdokumenttittel](./TITTELPROMPT.md).

## Dette virker i demoen

- Dra inn inntil 50 filer.
- Lokal tekstuttrekking fra tekst, Markdown, CSV, JSON, XML, HTML, EML, PDF, DOCX, PPTX, XLSX, ODT, ODS og ODP.
- Automatisk innholdsbasert forslag til saksdokumenttittel ved innlasting.
- Valgfri forbedring med lokal nettleser-AI der dette støttes.
- Forslag til dokumentdato, dokumenttype, språk, beskrivelse, emne, forfatter, organisasjonsenhet og nøkkelord når grunnlaget finnes.
- Felles metadata for forfatter, organisasjonsenhet, sak, klassifikasjon, tilgang og livsløp.
- Kontroll av obligatoriske felt, betingede krav og menneskelig tittelgjennomgang.
- Indikasjon på mulige e-postadresser, telefonnumre, fødselsnumre og sensitive nøkkelord.
- SHA-256 og duplikatindikasjon.
- Normaliserte filnavn basert på kontrollert saksdokumenttittel.
- Eksport av JSON-manifest, CSV-manifest og ZIP-pakke med dokumenter og JSON-sidecars.
- Kontrollrapport i Markdown med overføringsstatus, tittelgjennomgang, obligatoriske mangler, duplikater og SHA-256.
- Tre syntetiske eksempelfiler for rask testing.
- 27 automatiske tester av tittelregler, promptformat, innholdsuttrekk, metadata og ZIP-bygger.

## Personvern og sikkerhet

Filene behandles lokalt i nettleseren. Appen har ingen backend, innlogging, analyse-API eller sporingskode. Binærfilene endres ikke. Metadata bindes til dokumentene i en eksportpakke.

Dokumentinnhold behandles som ubetrodd data i AI-prompten. Instruksjoner som ligger inne i en fil, skal ikke få endre rollen eller reglene til metadataassistenten.

Bruk likevel ikke demoen som eneste kontroll for reelle personopplysninger, tilgangsvurdering, journalføring, arkivverdi eller bevaring og kassasjon. Skannede PDF-er krever OCR og kan derfor gi et tittelforslag basert på filnavn og tilgjengelige metadata.

## Kjør lokalt

```bash
cd archive-assist
python -m http.server 8080
```

Åpne `http://localhost:8080`.

Tester:

```bash
npm test
npm run check
```

Node.js 20 eller nyere er tilstrekkelig.

## Avgrensning

Archive Assist er Noark-inspirert, men hevder ikke Noark-samsvar og er ikke et sak-/arkivsystem. En produksjonsversjon måtte ha virksomhetsspesifikk metadataprofil, autentisering, serverbasert autorisasjon, uforanderlig hendelseslogg, godkjent AI-behandlingsgrunnlag og konkrete import-/API-integrasjoner.

Se [ARKITEKTUR.md](./ARKITEKTUR.md), [PROSJEKTGRUNNLAG.md](./PROSJEKTGRUNNLAG.md), [TITTELPROMPT.md](./TITTELPROMPT.md) og [SECURITY.md](./SECURITY.md).

## Lisens

MIT.
