# Standardprofil

## Ekstern referanse

- **Standard:** DCAT-AP-NO — standard for beskrivelse av datasett, datatjenester og datakataloger.
- **Utgiver:** Digitaliseringsdirektoratet.
- **Versjon registrert da prosjektet ble laget:** **v3.0.7**.
- **Registrert status:** gjeldende fra 2025-01-01; offisiell side oppdatert 2026-03-20.
- **Kilde:** `https://data.norge.no/specification/dcat-ap-no`

## Hva MetaReady hevder — og ikke hevder

MetaReady hevder **ikke** fullt samsvar med DCAT-AP-NO.

Demoen bruker en liten intern profil kalt `INTERNAL_ASSET_MINIMUM_V1`. Den brukes på datasett, tjenester, dokumenter, modeller, begreper, kodeverk og rapporter. DCAT-AP-NO er derimot laget spesielt for beskrivelser av datasett, datatjenester og kataloger.

## Enkel kartlegging

| MetaReady-begrep | Beslektet idé i DCAT / Dublin Core | Dekning |
|---|---|---|
| Stabil identifikator | `dct:identifier` og vedvarende ressursidentitet | Vises som lokal stabil ID |
| Tittel og beskrivelse | `dct:title`, `dct:description` | Vist |
| Utgiver / ansvarlig eier | `dct:publisher`, agentbegreper | Forenklet intern rolle |
| Kontakt / forvalter | `dcat:contactPoint` | Forenklet intern rolle |
| Tilgangsrettigheter | `dct:accessRights` | Vises som styrt fritekst |
| Oppdateringsfrekvens | `dct:accrualPeriodicity` | Vises som fritekst |
| Proveniens | `dct:provenance` / kildebegreper | Vises som tekstlig bevis |
| Relaterte ressurser | Relasjonsegenskaper i DCAT og Dublin Core | Intern relasjonsmodell med type, bevis og sikkerhet |

## Dette er ikke implementert

- Full dekning av klasser og egenskaper.
- Produksjon eller innlesing av RDF-grafer.
- Validering mot kontrollerte vokabularer.
- SHACL-validering.
- Full konformitetslogikk for katalog og katalogpost.
- Komplette regler for distribusjoner og datatjenester.
- Formell JSON-LD- eller Turtle-eksport.

## Interne profilregler

`INTERNAL_ASSET_MINIMUM_V1` sjekker:

1. ansvarlig eier;
2. operativ forvalter;
3. formål og omfang;
4. sensitivitet;
5. tilgangsbetingelser;
6. proveniens;
7. livsløpsregel;
8. revisjonsdato;
9. stabil identifikator;
10. maskinlesbarhet;
11. terminologidekning; og
12. bevis for relasjoner.

Regel 1–10 er krav i demoen. Regel 11–12 er anbefalinger. Hvert funn viser regelen, alvorlighet, observert bevis, hvorfor det betyr noe og et konkret forslag til utbedring.
