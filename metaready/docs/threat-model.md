# Trusselmodell

## Det som bør beskyttes

- Integriteten til metadata og eierskapsbeslutninger.
- Riktigheten i påstander om autoritet, sensitivitet og livsløp.
- Historikk og beslutninger i arbeidsflyten.
- Eksporterte styringsnotater.
- Tilliten til vurderingene av KI-beredskap.

## Viktige trusler og dagens kontroller

| Trussel | Kontroll i statisk demo | Krav i en produksjonsløsning |
|---|---|---|
| Uautorisert endring av metadata | Rollebaserte sperrer i grensesnittet | Serverstyrt autorisasjon og virksomhetsidentitet |
| Falsk påstand om autoritet | Autoritet må registreres eksplisitt; ingen automatisk slutning | Godkjenningsgrunnlag, ansvarlig eier og rollefordeling |
| Prompt-injeksjon i beskrivelser | Ingen språkmodell kalles; tekst escapes før visning | Behandle kildetekst som upålitelig data og skill den fra modellinstruksjoner |
| Lekkasje av sensitiv informasjon | Bare syntetiske data og ingen eksterne kall | Klassifisering, feltstyrt tilgang, logging og DLP |
| Formelinnsprøyting i regneark | CSV-celler siteres og farlige starttegn nøytraliseres | Sentral eksporttjeneste og sikkerhetstester |
| XSS | Brukertekst escapes før HTML settes inn | Rammeverksstøttet escaping, CSP og sikkerhetstesting |
| Endring av historikk | Hendelser legges til fortløpende i demoen | Uforanderlig hendelseslager på server og regler for bevaring |
| Angrep via avhengigheter | Ingen kjøretidsavhengigheter i den publiserte appen | Låste avhengigheter, SBOM, skanning og oppdateringsrutiner |
| Misvisende KI-score | Bevis og blokkeringer vises ved siden av scoren | Uavhengig kontroll, kalibrerte terskler og oppfølging av faktiske resultater |

## Tillitsgrenser

Nettleseren og `localStorage` styres av brukeren og er ikke et pålitelig autoritativt register. Nedlastede filer forlater applikasjonens grense og må håndteres etter virksomhetens egne regler.

## Rapportering

Se [SECURITY.md](../SECURITY.md).
