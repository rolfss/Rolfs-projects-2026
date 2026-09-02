# MetaReady

**Arbeidsflate for informasjonsstyring og AI-beredskap**

MetaReady er en statisk nettleserapp som viser hvordan en virksomhet kan få bedre kontroll på informasjon før den deles, analyseres eller brukes i AI-løsninger.

Virksomheten i demoen er oppdiktet, og alle data er syntetiske. Appen trenger verken API-nøkkel, backend eller betalte tjenester.

## Hva problemet er

Det er lett å starte et søke-, analyse- eller AI-prosjekt før noen har ryddet i grunnlaget. Da dukker ganske enkle spørsmål opp:

- Hva er denne informasjonsressursen egentlig?
- Hvem eier og vedlikeholder den?
- Er den oppdatert og sporbar?
- Hvem skal ha tilgang?
- Hvor lenge skal innholdet bevares?
- Hvilke andre systemer og rapporter er avhengige av den?
- Er den egnet til akkurat dette AI-bruksområdet?

MetaReady gjør disse spørsmålene til en arbeidsflyt i stedet for et dokument som blir liggende i en mappe.

## Det som er bygget

- Søkbar katalog med **24 sammenkoblede, syntetiske informasjonsressurser** fordelt på sju typer.
- En versjonert metadataprofil med **12 forklarbare regler**.
- Egne kvalitetsdimensjoner med poeng, bevis og begrunnelse.
- Vurdering av AI-beredskap på **13 dimensjoner**.
- Registrering, validering, vurdering, godkjenning og publisering.
- Foreslåtte utbedringer som lager ny versjon og hendelse i revisjonssporet.
- Relasjonsoversikt med tabell som tilgjengelig alternativ.
- Enkel konsekvensanalyse.
- Prioritert tiltakslogg med synlig formel.
- Eksport av styringsnotat i Markdown og tiltak i CSV.
- Demoroller for leser, informasjonsforvalter, informasjonsarkitekt, godkjenner og administrator.
- Lokal lagring og enkel nullstilling.
- Automatiske tester av validering, poengberegning, versjonering, måltall og eksport.

## Kjør lokalt

```bash
cd metaready
python -m http.server 8080
```

Åpne `http://localhost:8080`.

Kjør testene:

```bash
npm test
```

Node.js 20 eller nyere er nok for testene.

## Arkitektur

Den publiserte versjonen er en statisk app uten eksterne avhengigheter:

- `index.html` — appskall og registreringsdialog.
- `styles.css` — responsivt grensesnitt.
- `data.mjs` — syntetisk katalog, relasjoner, tiltak og revisjonsspor.
- `engine.mjs` — validering, kvalitet, AI-beredskap, prioritering, versjonering og eksport.
- `views.mjs` — visningene i appen.
- `app.mjs` — tilstand, demoroller, hendelser, lokal lagring og eksport.
- `tests/` — tester av den deterministiske domenelogikken.

Se [ARKITEKTUR.md](./ARKITEKTUR.md) for mer om valgene.

## Standardprofil

MetaReady bruker DCAT-AP-NO **v3.0.7** som ekstern referanse. Den interne profilen i demoen er med vilje mye mindre og gjelder også dokumenter, modeller, begreper og rapporter.

Appen hevder **ikke** full samsvar med DCAT-AP-NO og er ingen sertifiseringsløsning.

Se [docs/standardprofil.md](./docs/standardprofil.md).

## En kort runde gjennom demoen

1. Åpne **Informasjonskatalog**.
2. Velg **Eldre prosedyrearkiv**.
3. Se hva som mangler av eierskap, proveniens, revisjon, tilgang og livsløp.
4. Bruk ett foreslått tiltak og se at versjon og revisjonsspor endres.
5. Åpne **AI-beredskap**, velg **Kunnskapsassistent med RAG**, og gå gjennom bevisene.
6. Opprett tiltak fra sperrene.
7. Åpne **Linjer og konsekvens**, se relasjonene og eksporter et styringsnotat.

Se [docs/demoflyt.md](./docs/demoflyt.md) for en litt mer detaljert gjennomgang.

## Sikkerhet og personvern

- Bare syntetisk innhold.
- Ingen eksterne API-kall.
- Rollevelgeren er en demonstrasjon, ikke autentisering.
- Ingen behandling av personopplysninger.
- CSV-eksport nøytraliserer farlige første tegn for å redusere risiko for formelinjeksjon.
- Tekst som brukeren skriver inn, escapes før den vises som HTML.

Se [SECURITY.md](./SECURITY.md) og [docs/trusselmodell.md](./docs/trusselmodell.md).

## Begrensninger

- Demorollene håndheves bare i nettleseren.
- `localStorage` er ikke et egnet arkiv- eller revisjonssystem for produksjon.
- Relasjonsvisningen viser direkte relasjoner, ikke vilkårlig graftraversering.
- Standardkartleggingen er delvis.
- AI-vurderingen er beslutningsstøtte, ikke juridisk godkjenning eller sikkerhetsakkreditering.
- Utskriftsvennlig HTML og Markdown brukes i stedet for en egen PDF-tjeneste.

## Videre arbeid

En produksjonspilot kunne fått FastAPI, PostgreSQL, virksomhetsidentitet, serverhåndhevede roller, uforanderlig hendelseslogg, import med forhåndsvisning, JSON-LD/RDF-eksport og flere integrasjonstester.

## Dokumentasjon

- [Arkitektur](./ARKITEKTUR.md)
- [Prosjekteksempel](./PROSJEKTEKSEMPEL.md)
- [AI-beredskapsmodell](./docs/ai-beredskap.md)
- [Standardprofil](./docs/standardprofil.md)
- [Trusselmodell](./docs/trusselmodell.md)
- [Demoflyt](./docs/demoflyt.md)
- [Prosjektnotater](./PROSJEKTNOTATER.md)

## Lisens

MIT. Se [LICENSE](./LICENSE).
