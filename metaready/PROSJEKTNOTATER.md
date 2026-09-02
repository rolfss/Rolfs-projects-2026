# Prosjektnotater

Noen korte notater om hva som er implementert i MetaReady.

## Informasjonsmodell

- 24 syntetiske ressurser: datasett, API-er, dokumentsamlinger, modeller, begreper, kodeverk og rapporter.
- Eierskap, proveniens, tilgang, sensitivitet, livsløp og relasjoner er egne felter.
- Relasjonene har retning, bevis og en enkel vurdering av sikkerhet.

## Regler og kvalitet

- 12 regler i den interne minimumsprofilen.
- Hvert funn viser observert bevis, hvorfor det betyr noe og et forslag til tiltak.
- Kvalitet vises i flere dimensjoner i stedet for å skjules bak ett tall.

## AI-beredskap

- 13 dimensjoner vurderes for hvert bruksområde.
- Søking, RAG, analyse, klassifisering og agentsystemer har egne bruksmaler.
- Sperrer kan overstyre et greit gjennomsnitt.

## Teknisk

- Statisk JavaScript-app uten rammeverk eller API-nøkkel.
- Lokal lagring, CSV- og Markdown-eksport.
- Domenelogikk og visning er skilt fra hverandre.
- Automatiske Node-tester kjøres i GitHub Actions før publisering.
