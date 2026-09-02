# Standardprofil

## Ekstern referanse

- **Standard:** DCAT-AP-NO — standard for beskrivelse av datasett, datatjenester og datakataloger.
- **Utgiver:** Digitaliseringsdirektoratet.
- **Versjon registrert under bygging:** **v3.0.7**.
- **Registrert status:** gjeldende fra 2025-01-01; offisiell side oppdatert 2026-03-20.
- **Kilde:** `https://data.norge.no/specification/dcat-ap-no`

## Hva MetaReady faktisk hevder

MetaReady hevder **ikke** full støtte for eller samsvar med DCAT-AP-NO.

Appen bruker en liten intern demoprofil kalt `INTERNAL_ASSET_MINIMUM_V1`. Den brukes på datasett, tjenester, dokumenter, modeller, begreper, kodelister og rapporter. DCAT-AP-NO er på sin side laget spesielt for beskrivelser av datasett, datatjenester og kataloger.

## Eksempler på kartlegging

| MetaReady-begrep | Beslektet idé i DCAT / Dublin Core | Dekning i demoen |
|---|---|---|
| Stabil ressurs-ID | `dct:identifier` og vedvarende ressursidentitet | Lokal stabil ID |
| Tittel og beskrivelse | `dct:title`, `dct:description` | Vist |
| Utgiver / ansvarlig eier | `dct:publisher`, agentbegreper | Forenklet intern rolle |
| Kontakt / forvalter | `dcat:contactPoint` | Forenklet intern rolle |
| Tilgangsrettigheter | `dct:accessRights` | Beskrives som styrt tekst |
| Oppdateringsfrekvens | `dct:accrualPeriodicity` | Vanlig tekst |
| Proveniens | `dct:provenance` / kildebegreper | Beskrives som bevis |
| Relaterte ressurser | Relasjonsegenskaper i DCAT og Dublin Core | Egen relasjonsmodell med bevis og sikkerhet |

## Ting som ikke er implementert

- Full dekning av klasser og egenskaper.
- Produksjon og innlesing av RDF-grafer.
- Validering mot kontrollerte vokabularer.
- SHACL-validering.
- Full oppførsel for kataloger og katalogposter.
- Alle kardinalitetsregler for distribusjoner og datatjenester.
- Samsvar hos mottakende applikasjon.
- Formell JSON-LD- eller Turtle-eksport.

## Regler i den interne profilen

`INTERNAL_ASSET_MINIMUM_V1` kontrollerer:

1. ansvarlig eier;
2. operativ forvalter;
3. formål og omfang;
4. sensitivitetsklassifisering;
5. tilgangsbetingelser;
6. proveniens;
7. livsløpsregel;
8. aktuell revisjon;
9. stabil identifikator;
10. maskinell brukbarhet;
11. begrepsdekning;
12. dokumenterte relasjoner.

Regel 1–10 er krav i demoprofilen. Regel 11–12 er anbefalinger. Hvert funn viser hva som ble observert, hvorfor det betyr noe og et mulig tiltak.
