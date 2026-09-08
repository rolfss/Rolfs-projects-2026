# Validering av galleriutgaven

8. september 2026.

- 17 automatiske tester bestått. De 12 tidligere innholds- og oppdragstestene er beholdt.
- Nye tester kontrollerer 14 unike veggverk, fem ulike romfarger, unike veggplasser per rom, lokale bildefiler, kreditering og markering av stedsfoto, faksimiler og presseutdrag.
- Kamerageometrien er beregnet med Three.js uten WebGL: alle stopp er innenfor rommene og utenfor monterne; bildeflatene passer over lesepanelets planlagte område ved seks skjermstørrelser fra 320 × 568 til 1920 × 1080. Dette er geometriske tester, ikke visuell skjermkontroll.
- TypeScript og produksjonsbygg bestått. Tekstversjonen genereres med nye rapportsider, stedsfoto, galleriintroduksjoner og begge nyhetsutdragene.
- Nettleser-, lyd-, mobil-, utskrifts- og visuell testing er **ikke kjørt for galleriutgaven**. Det eksisterende nettleserskriptet er oppdatert til at rom åpner på omvisningen før oppdraget. Eldre nettlesermålinger nedenfor gjelder den første utgaven.

## Historikk: lederreisen 1.1



8. september 2026.

- 12 automatiske tester bestått, inkludert alle 80 kombinasjoner av sporkort, alle 15 handlingsforløp og krav om fullført konsekvenskjede før læringsmerke.
- Test av lagring/gjenopptakelse, skadet lagring, ugyldige valg og lederbestillingens eksport.
- De fire bildene ligger lokalt med kontroll av filreferanser, kreditering, lisenslenker og skillet mellom stedsfoto og faksimile.
- TypeScript og produksjonsbygg kontrolleres med prosjektets ordinære byggkommando.
- Nettleser-, mobil-, utskrifts- og visuell testing er **ikke kjørt for versjon 1.1**. De eldre målingene nedenfor gjelder første utgave og sertifiserer ikke den nye reisen.
- Det eksisterende nettleserskriptet er tilpasset at rom nå åpner på oppdraget, og at Lederens rom avsluttes med en lederbestilling. Skriptet er ikke kjørt i denne endringen.

## Historikk: første utgave


Kontrollert 8. september 2026.

## Innhold

- Alle fem primærkildene er hentet direkte. Kontroll av dato, relevant tekst, sitater og kildeplassering.
- Konsolidert lov og forskrift er hentet direkte fra Lovdata; §§ 5 og 8 i loven, §§ 5–7 og 13–15 i forskriften, samt ikraftsettingsreglene er kontrollert.
- Tokke: uavklart lesbarhet er beholdt som risiko, ikke konkludert arkivtap.
- NPE: endringen etter innvendinger og positive funn er tatt med.
- Hanekleiv: teknisk granskningshistorie, uten påstand om konstatert arkivlovbrudd.
- 2008/171: dagens særregel om innsynssaker er forklart uttrykkelig.
- 5 automatiske datatester bestått. Typetest og Vite-produksjonsbygg bestått.

## Nettleser

46 funksjonskontroller bestått i Chrome på den lokale produksjonsbygde versjonen:

- Faktisk WebGL-rendering; musemodeller, skygger og innlasting.
- WASD, dra-for-å-se, pause og kollisjon mot sentralmonteren.
- Alle fem rom, fem fortellerdeler per rom, kilder og regelverk.
- Hele guidede besøket og alle åtte lederalternativer.
- Avslutning og tilbakeføring til fri utforskning.
- Lyd etter brukerhandling og av/på-kontroll.
- Mobilvisning 390 × 844, berøringsbevegelse, kildepanel og større tekst.
- Full tekstversjon med JavaScript slått av.
- Ingen registrerte JavaScript-/konsollfeil eller HTTP-feil på appens egne filer.

Skjermbilder av hovedhall, utstillinger, mobilforside, mobile kildepaneler og innstillinger er visuelt kontrollert. Kildelenkene har `target="_blank"` og `rel="noopener noreferrer"`.

## Ytelse og grenser

Hovedvisningen viste omtrent 100–200 tegnekall etter sammenslåing og instansiering. Ca. 180 kB komprimert JavaScript og en ukomprimert modellpakke på ca. 582 kB. Målinger fra lokal Chrome er ikke en garanti for fysiske mobilenheter. Ingen fysisk iPhone/Safari-test eller full WCAG-revisjon er gjennomført.

## Gjenta nettleserprøven

Bygg først, og start `pnpm preview`. Installer Chromium for Playwright med `pnpm exec playwright install chromium`, eller sett `MUSEUM_CHROME` til en allerede installert Chrome. Kjør `pnpm test:browser` i en annen terminal. `MUSEUM_URL` kan settes til den offentlige museumsadressen. Resultater og skjermbilder havner i den ignorerte mappen `qa-output/`, eller i `MUSEUM_QA_DIR`.

GitHub Pages-byggingen kjører de eksisterende prosjektenes tester og deretter museets datatester og produksjonsbygg. Den publiserte siden kontrolleres i tillegg fra nettleseren etter utrulling.
