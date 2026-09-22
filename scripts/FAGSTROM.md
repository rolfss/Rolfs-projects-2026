# Fagstrøm

Statisk fagnyhetsstrøm på `site/fagstrom/`, basert på publiseringsutkastet fra 22. september 2026. Egen side under `/Rolfs-projects-2026/fagstrom/`, lenket fra hovednavigasjonen. Ingen endringer i de andre appene.

## Bygg og test

```sh
python3 scripts/test-news.py
python3 scripts/build-news.py
node --check site/fagstrom/filter.js
```

Python 3.9+ med tidssonedata for Europe/Oslo. Ingen tredjepartsbiblioteker, modellkall, API-nøkler eller installasjoner. `--fixtures MAPPE` leser `edpb.xml` og `dpc.xml` i stedet for nettverket; dette er kun en testmodus. De 20 automatiske testene bruker faste datoer og syntetiske RSS-uttrekk og er uavhengige av nettverk og dagsdato.

## Kilder og avgrensning

RSS fra European Data Protection Board og Digital Preservation Coalition. Overskrifter, publiseringsdato, kilde og originalartikkel; ikke fulltekst eller KI-sammendrag. Inntil 60 unike saker fra siste 180 dager. Stillingsannonser filtreres med et enkelt tekstfilter; det garanterer ikke at alle annonser fanges opp. Nye/fremtidige og ugyldige datoer, usikre lenker, XML-entiteter og for store svar avvises. Hver henting har 20 sekunders tidsavbrudd og 2 MB svargrense.

Digdir, Nasjonalarkivet og Datatilsynet er tydelig merkede norske snarveier, ikke automatisk innhentede kilder. Utvalget er ikke uttømmende; temaene settes etter kilde, ikke med KI-klassifisering. Artiklene beholder originalspråket.

## Feilhåndtering og oppdatering

Ved kildefeil beholdes bare validerte saker fra det inncheckede `news.json`-øyeblikksbildet, fortsatt innenfor aldersgrensen. En advarsel viser hvilken kilde som feilet. Det er ikke et varig arkiv over tidligere innhentinger: Actions skriver ikke oppdaterte saker tilbake til Git. Feil i selve testsuiten eller nettstedbygget hindrer publisering, mens RSS-feil gir en synlig advarsel på den bygde siden.

Eksisterende `deploy-pages.yml` kjører hele nettstedets test/bygg/publisering, med Fagstrøm-test og RSS-generering før sammensetting. Plan: `23 */6 * * *`, altså 00:23, 06:23, 12:23 og 18:23 UTC. Actions kan forsinke eller hoppe over planlagte kjøringer; offentlige repoers tidsstyring kan deaktiveres etter 60 dager uten aktivitet. Nettleseren varsler når kontrolltidspunktet er eldre enn 36 timer. GitHub-dokumentasjon: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule

Workflow beholder `contents: read`; ingen ekstra skrivetilgang eller separat Pages-workflow. Alle eksisterende apper inngår fortsatt i publiseringen. Ingen betalte tjenester er lagt til.

## Lokal kontroll 22. september 2026

20 Python-tester og JavaScript-syntakskontroll bestod. Lokale HTML/CSS/JS-filer ble kjørt i Chromium i minnet ved 1440, 390 og 320 pikslers bredde: temasøk, tekstsøk, tomt resultat, entall/flertall, ingen horisontal overflyt eller JavaScript-feil. Artiklene kunne leses uten JavaScript, og advarselen for gammel oppdatering ble kontrollert. Ingen nettverkskall eller informasjonskapsler fra Fagstrøm-koden. CSP er kontrollert statisk; minnetesten bruker innlastet lokal CSS/JS i stedet for HTTP-navigasjon.

Lokalmiljøets nettverk var sperret. Det inncheckede første bildet viser derfor kildefeil og bruker de ti sakene fra brukerens vedlegg. Direkte RSS-henting og publisering må kontrolleres i den faktiske Actions-kjøringen og på den offentlige siden.

## Tilbakerulling

Tilbakestill Fagstrøm-publiseringscommitten i GitHub, uten å tilbakestille senere, uvedkommende endringer. Det fjerner siden, navigasjonslenken, nyhetsskriptet og tidsstyringen samlet. Kjør deretter den opprinnelige Pages-workflowen ved behov. Ingen hemmeligheter eller eksterne tjenester må ryddes opp.
