# Prosjekteksempel: rydd i informasjonen før AI kobles på

## Utgangspunkt

Den oppdiktede virksomheten CivicWorks vil forbedre internt søk, rapportering og kunnskapsassistenter. Informasjonen ligger spredt i datasett, API-er, dokumenter, modeller, begreper, kodeverk og rapporter.

Det første problemet er ikke valg av språkmodell. Det er mer grunnleggende: noen ressurser mangler eier, noen har gammel revisjonsdato, og det er uklart hvor data kommer fra eller hvem som skal ha tilgang.

## Idé

Et styringsverktøy er nyttig når det kan:

1. gjøre informasjonsressursene søkbare;
2. vise konkret hva som mangler;
3. vurdere om en ressurs passer til et bestemt bruksområde;
4. gjøre funn om til arbeid med en tydelig eier; og
5. beholde et spor av beslutningene.

## Hvordan demoen er lagt opp

Fire flyter fikk mest plass:

- registrere en ny informasjonsressurs;
- finne og rette metadatafeil;
- vurdere en ressurs for et konkret AI-bruksområde;
- følge relasjoner og se hva en endring kan påvirke.

Katalogen har både ryddige og svake ressurser. **Eldre prosedyrearkiv** er bevisst rotete. Det mangler blant annet tydelig eier, proveniens, tilgangsregler og livsløp. Det gjør forskjellen mellom en vag «AI-klar»-etikett og en vurdering med faktiske bevis ganske synlig.

## Valg i løsningen

- **Beredskap per bruksområde:** Et dokumentarkiv vurderes annerledes for RAG enn et datasett for rapportering.
- **Ingen svart boks-score:** Hver dimensjon viser bevis, sikkerhet, antakelse, tiltak og ansvar.
- **Fungerer uten språkmodell:** Kjernen er deterministisk.
- **Endringer gir spor:** Utbedring endrer versjon og legger til en hendelse.
- **Relasjoner kan leses som tabell:** Grafikken er ikke eneste måte å få informasjonen på.
- **Nøkterne standardpåstander:** Den interne profilen viser noen relevante koblinger til DCAT-AP-NO, men hevder ikke fullt samsvar.

## Det som faktisk ligger i demoen

- 24 syntetiske ressurser fordelt på sju typer.
- 20 relasjoner med retning, bevis og sikkerhet.
- 12 valideringsregler.
- 10 kvalitetsdimensjoner.
- 13 dimensjoner for AI-beredskap.
- Fem demoroller.
- Lokal arbeidsflyt, versjonering, revisjonsspor, eksport og nullstilling.
- Åtte automatiske tester av domenemotoren.

## Avveininger

En statisk demo er veldig lett å åpne, men den kan ikke tilby reell autorisasjon eller et uforanderlig revisjonsspor. En produksjonspilot måtte håndhevet dette på serversiden.

Standardprofilen er også med vilje liten. Full DCAT-AP-NO-støtte med RDF, SHACL og formelle konformitetstester ville vært et eget arbeid.

## Resultat

MetaReady viser en mulig arbeidsmåte for å koble informasjonsarkitektur, dokumentasjonsforvaltning og AI-bruk. Spørsmålet blir mindre «kan vi koble denne kilden til AI?» og mer «hva vet vi om kilden, og er det godt nok for denne bruken?»
