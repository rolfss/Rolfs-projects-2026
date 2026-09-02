# Archive Assist

**Metadatahjelp for arkivfiler**

[Åpne den publiserte demoen](https://rolfss.github.io/Rolfs-projects-2026/archive-assist/)

Archive Assist er en statisk nettleserapp som hjelper brukeren å beskrive, kontrollere og pakke filer med strukturert metadata før videre overføring eller registrering.

## Dette virker i demoen

- Dra inn inntil 50 filer.
- Lokal analyse av filnavn, dato, filtype, størrelse, MIME-type og SHA-256.
- Enkel innholdsanalyse for tekst, Markdown, CSV, JSON, XML, HTML og andre tekstbaserte formater.
- Forslag til tittel, dokumentdato, dokumenttype, språk, beskrivelse og nøkkelord.
- Felles metadata for forfatter, organisasjonsenhet, sak, klassifikasjon, tilgang og livsløp.
- Kontroll av obligatoriske felt og betingede krav.
- Indikasjon på mulige e-postadresser, telefonnumre, fødselsnumre og sensitive nøkkelord.
- Duplikatindikasjon basert på identisk SHA-256.
- Normaliserte filnavn.
- Eksport av JSON-manifest, CSV-manifest og ZIP-pakke med dokumenter og JSON-sidecars.
- Tre syntetiske eksempelfiler for rask testing.
- Automatiske tester av domenelogikken og ZIP-byggeren.

## Personvern og sikkerhet

Filene behandles lokalt i nettleseren. Appen har ingen backend, innlogging, analyse-API eller sporingskode. Binærfilene endres ikke. Metadata bindes til dokumentene i en eksportpakke.

Bruk likevel ikke demoen som eneste kontroll for reelle personopplysninger, tilgangsvurdering, journalføring eller bevaring og kassasjon.

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

Archive Assist er Noark-inspirert, men hevder ikke Noark-samsvar og er ikke et sak-/arkivsystem. En produksjonsversjon måtte ha virksomhetsspesifikk metadataprofil, autentisering, serverbasert autorisasjon, uforanderlig hendelseslogg og konkrete import-/API-integrasjoner.

Se [ARKITEKTUR.md](./ARKITEKTUR.md), [PROSJEKTGRUNNLAG.md](./PROSJEKTGRUNNLAG.md) og [SECURITY.md](./SECURITY.md).

## Lisens

MIT.
