# Arkivmuseet: fra sak til lederhandling

## Formål og avgrensning

Museet skal informere ledere om arkivenes muligheter, risikoen ved manglende eller ubrukbar dokumentasjon og norske plikter. Mulighetene er ikke løfter om målbar gevinst. Det er ikke en juridisk sertifisering, et risikoverktøy eller en offisiell myndighetsveileder.

Endringen beholder hovedhallen, rom, motor, bilder, historiske cases, lagringsnøkler og valgfrie øvelser. Ingen nye avhengigheter, nettjenester, KI-kall, sporing eller innsamling. Ingen oppdiktede dokumenter eller nye påstander om faktisk skade.

## Hva som er implementert

- Inngang og «Hvorfor arkiv?» setter kunnskap, rettigheter og fremtidig bruk foran øvelsesmerker.
- Hver av de fem sakene har et tydelig merket lederperspektiv: mulighet, risiko og ett spørsmål.
- «Ta med et tiltak» velger sakens eksisterende tiltak i lederbestillingen, uten å endre øvelsesfremdrift. Rolle og dato beholdes ved gjentatt valg.
- Seks kildebelagte rettslige hovedtrekk kan leses samlet eller åpnes direkte på temaet som hører til saken.
- Bilder kan åpnes i en større visning med både bildeproveniens og den dokumentariske kilden. Fotografier forblir stedsskildringer, ikke dokumentasjon på en bestemt hendelse.
- `leder.html` er en fullverdig kort leserute uten JavaScript. `tekst.html` beholder alle historier og valg og får de samme lederperspektivene og lovoversikten.
- Relativ Vite-base fjerner bindingen til det gamle repositorynavnet; en test serverer ferdig bygg under det nye navnet.

## Kildekontroll 26. september 2026

Kontrollen gjelder den nye lederoversikten, ikke en ny granskning av fem historiske rapporter. Deres egne kilde- og hendelsesdatoer beholdes.

- Arkivlova, inkludert §§ 1, 3, 5, 8 og 12–14 samt ikraftsettingsmerknaden, ble lest i [Nasjonalarkivets lovgjengivelse](https://www.nasjonalarkivet.no/offentlig-forvaltning/regelverk-og-standarder/lover-og-forskrifter/lov-om-dokumentasjon-og-arkiv-arkivlova/).
- Arkivforskrifta ble lest i [Lovdata-gjengivelsen publisert hos ESA](https://www.eftasurv.int/cms/sites/default/files/documents/gopro/2025-9024-NO.pdf), særlig §§ 3, 5–7 og 12–15. Dokumentets utskrift er datert 19. desember 2025, ikke september 2026. Systemkrav og internkontroll ble også sammenholdt med Nasjonalarkivets tilgjengelige 2026-veiledning og oversikt over det nye regelverket.
- [Bevaringsforskrifta](https://www.nasjonalarkivet.no/offentlig-forvaltning/forskrift-om-kva-dokumentasjon-som-skal-takast-vare-pa-for-ettertida-bevaringsforskrifta/) ble brukt for skillet mellom bevaring for ettertiden og tidsbegrenset oppbevaring.
- [Sivilombudets innsynsguide](https://www.sivilombudet.no/veiledere/innsynsguiden/), inkludert veiledning oppdatert i 2026, ble brukt for hovedregel, taushetsplikt, merinnsyn og forskjellen mellom journalføring og innsyn.
- Veilederne om dokumentasjonsbehov, internkontroll og informasjonssystemer er lenket i `cases/leader-guide.json`. Genererte `SOURCES.md` gjengir den komplette kildelisten.

Direkte Lovdata-henting var ikke tilgjengelig. Kanoniske Lovdata-lenker er bevart, og alternative faktisk leste gjengivelser er registrert i `verificationUrl`. Et vellykket bygg er ikke dokumentasjon på at alle nettlenker fortsatt virker eller at ingen regelendringer har skjedd. Ved videre vedlikehold må konsoliderte tekster, ikraftsetting og overgangsbestemmelser kontrolleres på nytt; ikke bare flytt kontrolldatoen.

Særlig viktige skiller: §§ 1–10 og 12–25 trådte i kraft 1. januar 2026, ikke § 11; lovens virkeområde er ikke alle private foretak; kommuneloven § 25-1 har en egen rolle i internkontrollen; innsynssaker har særregler i arkivforskrifta § 14 tredje ledd; arkiv betyr verken publiser alt eller behold alt for alltid.

## Felles publiseringsgrunnlag

`cases/leader-guide.json` og den rene rendereren `src/leader-guide.ts` brukes av både `src/main.ts` og tekstgeneratorene. Oppslag krever kjente kilde-ID-er og HTTPS. Redaksjonell tekst HTML-escapes. Valideringen stopper tomme kildefelt, duplikater, manglende cases og ukjente lovtemaer; den avgjør ikke om juridiske vurderinger er riktige.

`pnpm content` kjøres før utvikling, tester og bygg. Genererte tekstsider og det kopierte stilarket ligger i `public/`, men skal ikke redigeres eller versjoneres separat. Dette hindrer at en håndholdt kopi av lovoversikten blir hengende etter 3D-utgaven.

## Validering og gjennomgang

`tests/leadership.test.mjs` tester datadekning, skiller i regelverket, escaping, kildevalidering, sak-til-tiltak uten quiz, lagringskompatibilitet og felles statisk gjengivelse. `scripts/verify-leadership.mjs` tester den kompilerte appen med ekte Chromium/WebGL, berøringsemulering, redusert bevegelse, større tekst, fokusretur, eksport, ingen JavaScript, manglende grafikk/lagring og flyttet basepath. Den kjøres etter den eksisterende besøkskontrollen og lagrer logger/skjermbilder i `qa-visit/leadership/`.

Resultater skal hentes fra den konkrete commitens CI-logg. En testbeskrivelse er ikke et bestått resultat. Nettleseremulering er ikke fysisk iPhone/Safari-testing. Endringen gjør ingen påstand om målt læringseffekt, gevinst eller bedre bildefrekvens.

## Tilbakerulling

Endringen er isolert til Arkivmuseet. Tilbakerulling av funksjonscommiten gjenoppretter det tidligere innholdet, generatoroppsettet og basepath uten å endre de fem historiske datasettene eller brukerens lagringsnøkler. Ingen datamigrering er nødvendig. Publisert nettside endres først ved separat godkjent sammenslåing og vellykket Pages-bygg.
