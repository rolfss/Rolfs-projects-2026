# Trusselmodell

## Det som bør beskyttes

- Integriteten i metadata og beslutninger om eierskap.
- Riktigheten i påstander om autoritet, sensitivitet og livsløp.
- Revisjonsspor og arbeidsflytbeslutninger.
- Eksporterte styringsnotater.
- Tilliten til vurderingene av AI-beredskap.

## Viktige trusler og kontroller

| Trussel | Kontroll i den statiske demoen | Hva en produksjonsløsning trenger |
|---|---|---|
| Uautorisert endring av metadata | Rollebaserte sperrer i grensesnittet | Serverhåndhevet autorisasjon og virksomhetsidentitet |
| Falsk påstand om autoritet | Autoritet må registreres eksplisitt | Godkjenningsbevis, ansvarlig eier og arbeidsdeling |
| Promptinjeksjon i beskrivelser | Ingen språkmodell kalles; tekst escapes | Kildetekst behandles som upålitelige data og skilles fra instruksjoner |
| Lekkasje av sensitive data | Bare syntetiske data; ingen eksterne kall | Klassifisering, felttilgang, logging og DLP |
| Formelinjeksjon i regneark | CSV-celler siteres og farlige starttegn nøytraliseres | Sentral eksporttjeneste og sikkerhetstester |
| XSS | Brukertekst escapes før HTML settes inn | CSP, rammeverkssikring og sikkerhetstesting |
| Manipulert revisjonsspor | Hendelser legges til løpende i demoen | Uforanderlig hendelseslager på serversiden |
| Kompromittert leverandørkjede | Ingen runtime-avhengigheter i den publiserte appen | Låste avhengigheter, SBOM, skanning og oppdateringsrutiner |
| Misvisende beredskapsscore | Bevis og sperrer vises sammen med scoren | Uavhengig vurdering, kalibrerte terskler og oppfølging av faktiske resultater |

## Tillitsgrenser

Nettleseren og `localStorage` kontrolleres av brukeren og er ikke et pålitelig system of record. Nedlastede filer forlater appens grense og må håndteres etter virksomhetens egne regler.

## Sikkerhetskontakt

Se [SECURITY.md](../SECURITY.md).
