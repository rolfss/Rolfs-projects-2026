# Prosjektgrunnlag

Archive Assist realiserer den opprinnelige ideen om et enkelt verktøy som knytter metadata til filer i en arkiv- og dokumentasjonsforvaltningskontekst.

## Rekonstruert kjernebehov

1. Brukeren skal kunne velge én eller flere filer uten å sende dem til en ekstern tjeneste.
2. Løsningen skal hente sikre tekniske fakta automatisk og foreslå beskrivende metadata.
3. Forslag skal være forklarbare og kunne korrigeres av et menneske.
4. Metadata skal dekke ansvar, kontekst, tilgang, klassifikasjon og livsløp – ikke bare filtype og dato.
5. Resultatet skal kunne tas videre som maskinlesbart manifest og dokumentbundne sidecar-filer.
6. Demoen skal kunne brukes direkte av utenforstående fra GitHub Pages, uten API-nøkkel.

## Viktige designvalg

- **Lokal behandling:** gir en testbar offentlig demo uten at dokumenter forlater maskinen.
- **Deterministiske forslag:** viser hvorfor et felt er foreslått og virker uten en generativ AI-tjeneste.
- **Sidecar fremfor binær omskriving:** unngår å korrumpere PDF-, Office- og bildefiler og gir samme modell på tvers av formater.
- **Menneskelig kontroll:** tilgang, arkivverdi og kassasjon blir aldri fremstilt som automatiske vedtak.
- **Flyttbart resultat:** JSON, CSV og ZIP gjør veien videre mot import eller integrasjon konkret.

Den tidligere migrerte mappen `metaready` utviklet seg til en bredere informasjonsstyringsdemo. MetaReady og Archive Assist beholdes derfor som to selvstendige prosjekter: MetaReady for informasjonsstyring og AI-beredskap, og Archive Assist for den konkrete filbaserte metadataflyten.
