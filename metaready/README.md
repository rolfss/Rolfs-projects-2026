# MetaReady

Et lite arbeidsverktøy for informasjonsstyring og KI-beredskap.

Demoen viser hvordan eierskap, metadata, proveniens, tilgang, livsløp, kvalitet og relasjoner kan samles i én arbeidsflate. Organisasjonen og alle dataene er oppdiktet. Løsningen virker uten API-nøkkel, backend eller betalte tjenester.

## Hva prøver prosjektet å løse?

Før informasjon brukes i søk, analyse eller KI, bør noen ganske grunnleggende spørsmål være besvart:

- Hva er dette egentlig?
- Hvem eier og forvalter det?
- Er informasjonen oppdatert og sporbar?
- Hvem skal ha tilgang?
- Hvor lenge skal informasjonen bevares?
- Hvilke andre systemer og rapporter er avhengige av den?
- Er den egnet til akkurat dette KI-brukstilfellet?

MetaReady gjør disse spørsmålene om til konkrete funn og tiltak.

## Det som finnes i demoen

- Søkbar katalog med **24 sammenkoblede, syntetiske informasjonsressurser** fordelt på sju typer.
- En versjonert metadataprofil med **12 regler**.
- Flere separate kvalitetsdimensjoner, med bevis og forklaring.
- KI-vurdering for konkrete brukstilfeller på **13 dimensjoner**.
- Registrering, validering, vurdering, godkjenning og publisering.
- Enkle utbedringer som lager ny versjon og historikkhendelse.
- Relasjonsgraf og tabellvisning.
- Enkel konsekvensanalyse.
- Prioritert tiltakslogg.
- Eksport av styringsnotat og CSV.
- Fem demoroller.
- Lokal lagring og nullstilling.
- Automatiske tester av kjernelogikken.

## Kjør lokalt

```bash
cd metaready
python -m http.server 8080
```

Åpne `http://localhost:8080`.

Tester:

```bash
npm test
```

Node.js 20 eller nyere er nok. Det er ingen andre avhengigheter.

## Oppbygning

Den publiserte versjonen er en statisk nettleserapp:

- `index.html` — appskall og registreringsdialog.
- `styles.css` — responsivt grensesnitt.
- `data.mjs` — syntetisk katalog, relasjoner, tiltak og historikk.
- `engine.mjs` — validering, kvalitet, KI-beredskap, prioritering, versjonering og eksport.
- `views.mjs` — visningene i arbeidsflaten.
- `app.mjs` — tilstand, demoroller, hendelser, lokal lagring og eksport.
- `norsk.mjs` — norske visningsnavn for interne kodeverdier.
- `tests/` — tester av den deterministiske logikken.

Se [ARKITEKTUR](./ARCHITECTURE.md) for litt mer om valgene.

## Standardprofil

DCAT-AP-NO **v3.0.7** er registrert som ekstern referanse. MetaReady implementerer bare en liten intern demoprofil, `INTERNAL_ASSET_MINIMUM_V1`.

Det betyr at prosjektet **ikke** hevder full støtte eller samsvar med DCAT-AP-NO.

Se [standardprofilen](./docs/standards-profile.md).

## En enkel demonstrasjonsrunde

1. Åpne **Informasjonskatalog**.
2. Velg **Eldre prosedyrearkiv**.
3. Se hvilke opplysninger som mangler.
4. Bruk ett foreslått tiltak og se at versjon og historikk endres.
5. Åpne **KI-beredskap** og velg **Kunnskapsassistent med RAG**.
6. Opprett tiltak fra det som blokkerer bruk.
7. Åpne **Linjer og konsekvens** og se hvilke ressurser som henger sammen.

Se [demo-notatene](./docs/demo-script.md) for en litt mer detaljert runde.

## Sikkerhet og personvern

- Bare syntetiske data.
- Ingen eksterne API-kall.
- Demorollene er ikke autentisering.
- Ingen behandling av personopplysninger.
- Eksportverdier behandles for å redusere risiko for regnearkformler.
- Brukertekst escapes før den vises som HTML.

Se [SECURITY.md](./SECURITY.md) og [trusselmodellen](./docs/threat-model.md).

## Begrensninger

- Roller i statisk modus er bare en demonstrasjon av tilgangsstyring.
- `localStorage` er ikke egnet som journal- eller revisjonslager i produksjon.
- Relasjonsgrafen viser direkte relasjoner, ikke full graftraversering.
- Standardkartleggingen er bare delvis.
- KI-vurderingen er en første sortering, ikke juridisk, sikkerhetsmessig eller regulatorisk godkjenning.
- PDF er ikke bygget inn; utskriftsvennlig HTML og Markdown brukes i demoen.

## Hvis dette skulle blitt en produksjonsløsning

Et naturlig neste steg ville vært FastAPI, PostgreSQL, virksomhetsidentitet, serverstyrte roller, mer robust historikk, import med forhåndsvisning, JSON-LD/RDF-eksport og flere integrasjonstester.

## Dokumentasjon

- [Arkitektur](./ARCHITECTURE.md)
- [Prosjektnotat](./CASE_STUDY.md)
- [Modell for KI-beredskap](./docs/ai-readiness-model.md)
- [Standardprofil](./docs/standards-profile.md)
- [Trusselmodell](./docs/threat-model.md)
- [Demo-notater](./docs/demo-script.md)

## Lisens

MIT. Se [LICENSE](./LICENSE).
