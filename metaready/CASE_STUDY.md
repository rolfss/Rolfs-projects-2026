# Prosjektnotat: rydd informasjonen før den brukes av KI

## Utgangspunkt

Det oppdiktede direktoratet CivicWorks vil forbedre internt søk, rapportering og kunnskapsassistenter. Informasjonen ligger spredt i datasett, API-er, dokumenter, modeller, begreper, kodelister og rapporter.

Problemet er ikke først og fremst valg av KI-modell. Det er at eierskap, autoritet, revisjonsdatoer, relasjoner og tilgang ikke alltid er godt nok dokumentert.

## Arbeidshypotese

Et slikt verktøy er nyttig hvis det kan:

1. gjøre informasjonsressursene lettere å finne;
2. vise konkret hva som mangler;
3. vurdere en ressurs for et bestemt brukstilfelle;
4. gjøre funn om til ansvarlige og prioriterte tiltak;
5. bevare et enkelt beslutningsspor.

## Hvordan demoen er bygget opp

Fire arbeidsløp står sentralt:

- registrere og styre en ny informasjonsressurs;
- finne og rette metadatafeil;
- vurdere en ressurs for et konkret KI-brukstilfelle;
- se relasjoner og mulig konsekvens ved endringer.

Katalogen har både gode og dårlige eksempler. **Eldre prosedyrearkiv** er med vilje svakt dokumentert. Det mangler blant annet tydelig eierskap, proveniens, tilgang og livsløpsregler.

## Valg underveis

- **Vurdering per brukstilfelle:** En dokumentsamling vurderes annerledes for RAG enn et datasett for rapportering.
- **Ikke én skjult totalscore:** Hver dimensjon viser bevis, antakelser og hva som bør gjøres.
- **Fungerer uten språkmodell:** Kjernelogikken er deterministisk.
- **Tiltak påvirker faktisk tilstand:** En utbedring lager ny versjon og historikkhendelse.
- **Relasjoner kan leses på to måter:** Både graf og tabell.
- **Forsiktige standardpåstander:** Demoen viser en liten intern profil og hevder ikke full standardstøtte.

## Det som er implementert

- 24 syntetiske ressurser fordelt på sju typer.
- 20 dokumenterte relasjoner.
- 12 versjonerte valideringsregler.
- 10 kvalitetsdimensjoner.
- 13 dimensjoner for KI-beredskap.
- Fem demoroller.
- Lokal arbeidsflyt, versjonering, historikk, eksport og nullstilling.
- Åtte automatiske tester av kjernelogikken.

## Begrensninger

Demoen er bevisst laget uten backend. Det gjør den enkel å åpne, men betyr også at roller og historikk bare er illustrative. En produksjonsvariant måtte håndhevet tilgang på serversiden og lagret hendelser robust.

Standardprofilen er også med vilje liten. Full DCAT-AP-NO-støtte, RDF og formell validering ville vært et eget arbeid.

## Resultat

Prosjektet ender i et konkret spørsmål: ikke bare «kan vi koble denne kilden til et KI-verktøy?», men «hvilket grunnlag har vi for å stole på denne kilden til akkurat dette formålet?»
