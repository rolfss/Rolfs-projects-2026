# Innledende faglig vurdering – 17. september 2026

**Beslutning: NØDVENDIG.** Legg til kilden `na-preservation-plan` og de fire vurderte kandidatpostene i `preservation-plan-data.mjs`, etter de to redaksjonelle presiseringene nedenfor. Det er dokumentert et praktisk dekningshull, ikke en påvist endring av gjeldende regler.

Vurderingen er utført av den delegerte GPT-6 Astra-agenten med ultra som faglig beslutningstaker. Dette er en avgrenset innledende kontroll av én kandidatveileder, **ikke en full søkekjøring** eller en ny verifikasjon av hele kunnskapsbasen. Denne rapporten endrer ikke kunnskapsbasen og dokumenterer ikke publisering.

## Kontrollgrunnlag og datoer

- Kontrollert 2026-09-17 mot `data-sources.mjs`, `guidance-data.mjs`, `data-records-1.mjs` til `data-records-4.mjs` og `data.mjs`.
- Direkte import av eksisterende `data.mjs` viste korpusversjon `2026-09-07`, 154 poster og 17 kilder. Ingen post inneholdt uttrykket «bevaringsplan».
- [Originalveilederen](https://www.nasjonalarkivet.no/veiledere/veileder-om-bevaringsplaner-for-fagsaker/) er lest, inkludert målgruppe, godkjenning, metode, revisjon og skjemabeskrivelser. Publiseringsdato og siste endringsdato er **ikke bekreftet**. Kontrolldatoen må ikke brukes som publiseringsdato eller bevis på publisering etter 2026-09-07.
- [Nasjonalarkivets statusoversikt](https://www.nasjonalarkivet.no/offentlig-forvaltning/det-nye-arkivregelverket/status-pa-nye-veiledere-til-nytt-regelverk/) viste veilederen som ferdig og publisert da oversikten ble kontrollert 2026-09-17. Dette er en statusobservasjon, ikke en publiseringsdato.
- [Nasjonalarkivets informasjon om bevaringsforskriften](https://www.nasjonalarkivet.no/nasjonalarkivet-har-fastsett-ny-bevaringsforskrift/) er datert 2026-02-18, oppdatert 2026-04-07. Den bekrefter ikrafttredelse 2026-01-01 og redegjør for statlige forslag etter § 18. Veilederen vurderes som gjeldende offisiell veiledning til dette regelverket, uten egen ikrafttredelsesdato.
- [Bevaringsforskrifta § 18](https://lovdata.no/dokument/SF/forskrift/2025-12-19-2729/%C2%A718) er den henviste bestemmelsen. Lovdata-teksten lot seg ikke hente i denne kontrollen; vurderingen bygger derfor på de leste originalsidene fra Nasjonalarkivet, ikke en selvstendig kontroll av konsolidert forskriftstekst.

## Sammenligning med eksisterende poster

| Eksisterende poster | Dekning i korpuset | Vurdering av overlapp |
| --- | --- | --- |
| `guide-preservation-criteria`, `guide-preservation-authority` | Bevaringskriterier, statlige fagsaker og at egen vurdering ikke gir kassasjonstillatelse | Beholdes. De svarer ikke tilstrekkelig på hvordan et planforslag utformes og behandles. |
| `guide-appraisal-systems`, `guide-appraisal-process` | Systemkartlegging og funksjons-/prosessanalyse for å identifisere arkivpliktig dokumentasjon | Relevant forarbeid, men annet beslutningstrinn enn en bevaringsplan. |
| `guide-appraisal-update`, `guide-control-steps` | Vedlikehold av kartlegging og dokumentasjonsplan; internkontroll | Ingen konkret dekning av planens kontroll før avlevering. |
| `section-5-dispose`, `req-8-1-5`, `req-8-6-9`, `n6-disposal-definition` | Systemstøtte, bevaringstid og kontrollert gjennomføring av kassasjon | Teknisk og generell dekning; erstatter ikke veiledning om planprosessen. |

Nødvendigheten bygger på at brukeren ellers må slutte seg til fremgangsmåten fra flere generelle poster. Det er særlig et hull for søk om bevaringsplan og skjemaer. Metodeposten har delvis tematisk overlapp, men knytter eksisterende kartlegging til et konkret planforslag. Fire korte poster er en rimelig avgrensning. Ingen eksisterende post er påvist feil i denne kontrollen.

## Kontroll av de fire kandidatpostene

Alle fire er kontrollert mot [originalveilederen](https://www.nasjonalarkivet.no/veiledere/veileder-om-bevaringsplaner-for-fagsaker/):

| Kandidat-ID | Resultat og dokumentert del av originalen |
| --- | --- |
| `guide-preservation-plan-approval` | Korrekt. Målgruppe og avsnittet om hva en bevaringsplan er underbygger statlig avgrensning, Nasjonalarkivets avgjørelse og plass i dokumentasjonsplanen. |
| `guide-preservation-plan-forms` | Korrekt. Skjemadelen underbygger ett overordnet skjema per plan og ett systemskjema per digitalt system. |
| `guide-preservation-plan-method` | Korrekt. Avsnittet om funksjonsbasert tilnærming støtter hovedregelen og gjenbruk av kartlegging. |
| `guide-preservation-plan-revision` | Sammendrag og detalj er korrekte. Avsnittet før avlevering skiller kontroll fra betinget innsending av revidert plan. Presiser tittelen som angitt nedenfor. |

Skjemalenkene som faktisk står i originalveilederen:

- [Skjema 1](https://www.nasjonalarkivet.no/content/uploads/2026/09/Skjema-1-Overordnet-bevaringsvurdering_ny.xlsx)
- [Skjema 2](https://www.nasjonalarkivet.no/content/uploads/2026/09/Skjema-2-Bevaringsvurdering-av-informasjonssystem.xlsx)

Lenkene er kontrollert som henvisninger fra originalen. Selve regnearkfilene er ikke innholdsrevidert; vurderingen av kandidatposten bygger på veilederens skjemabeskrivelser. Filbanenes år og måned er ikke dokumentasjon på veilederens publiseringsdato.

## Presiseringer før integrasjon

1. Endre `source.note` til: «Statlige bevaringsplaner: skjemaer, funksjonsbaserte vurderinger og revisjon før avlevering.» Opplysningen om at kilden er nyoppdaget hører hjemme i vedlikeholdsloggen.
2. Endre tittelen til `guide-preservation-plan-revision` til: «Kontroller bevaringsplanen før avlevering». Behold det betingede innholdet i sammendraget.

Behold `published: 'Publiseringsdato ikke bekreftet'`, `verifiedAt: '2026-09-17'`, eksplisitt statlig virkeområde og klassifiseringen som offisiell veiledning. Postene er veiledningsparafraser og må ikke merkes som nye Noark-krav. Det skal ikke utledes en generell plikt for kommuner til å følge statens planprosess.

Etter disse presiseringene er de fire kandidatpostene **faglig godkjent for integrasjon**. Teknisk validering og kontroll av selve integrasjonen inngår ikke i denne rapporten.
