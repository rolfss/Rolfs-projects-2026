# Besøksflyt og mobilgrensesnitt

## Hierarkiet

1. **Museet:** fem kildebaserte utstillinger. Fri bevegelse fra hovedhallen, direkte romvalg og valgfri omvisning. «Neste rom» er navigasjon, ikke en belønning for riktig svar.
2. **Lederøvelsene:** et frivillig handlingsforløp ved hver utstilling. «Øvelser 0/5» teller fullførte øvelser, ikke besøkte rom. Øvelsesoversikten åpner den valgte øvelsen direkte.
3. **Etterforskningen:** en separat fiksjon, «Det manglende grunnlaget». Den er underordnet besøksplanen og menyen, ikke en gjentatt hovedetikett. Egen fremdrift på ti spor.
4. **Avslutningen:** samle praktiske tiltak i Lederens rom. Ekstra lederscenarioer ligger i en frivillig utvidbar del. Både utstillingene og etterforskningen peker hit, uten fullføringskrav.

Historiske kilder er ikke endret. Fiktive Aurora-dokumenter fremstår ikke som originalmateriale fra de virkelige sakene.

## Grensesnittets avtale

- Den lukkede besøksplanen viser en fold-ut-knapp og én kontekstuell hovedhandling. Fremdrift, forklaring, lyd og fordypning vises først ved utvidelse.
- Den midtre delen av telefonvisningen skal være synlig og direkte berørbar. Ingen usynlig klikkskjerm dekker rommet.
- Berøringsknapper har minst 44 × 44 CSS-piksler. De dempes når de ikke brukes, men forsvinner ikke overraskende. En utvidet plan skjuler og gjør de dekkede kontrollene inaktive.
- Planen er en ikke-modal disclosure med `aria-expanded`, `aria-controls` og ekte `hidden`. Escape lukker bare planen og gjenoppretter synlig fokus. Dialoger returnerer ikke fokus til en knapp som nå er skjult.
- Små skjermer, liggende retning, større tekst og skjermens safe areas behandles eksplisitt. Leseflater har egen rulling.
- En kort innfading er dekorasjon, ikke en inngangssperre. Ingen automatisk lyd, kameraflyging, flimring eller påtvunget omvisning. Redusert bevegelse respekteres.

## Implementasjon og vedlikehold

`visit-ui.ts` eier den sammenfoldbare besøksplanen; `visit-ui.css` eier den nye layouten. `visit-state.ts` holder romrekkefølgen adskilt fra oppgavetilstanden. `main.ts` kobler handlingene til eksisterende utstillinger, lyd og dialoger. `investigation.css` skal ikke lenger bestemme antall knapper i hele museets verktøylinje.

Tidligere DOM-ID-er og lagringsnøkler beholdes for å unngå tap av fremdrift. Tekstbyggeren skriver både `etterforskning.html` og den gamle `sak17.html`. Ingen nye pakker, nettjenester eller KI-kall er nødvendige.

## Kontroll før publisering

Kjør enhetstester, TypeScript-kontroll, kildevalidering og produksjonsbygg. Kjør alle tre nettlesersuiter mot produksjonsbygget. Kontroller både skjermbilder og funksjoner: 390×760, 360×640, 320×568 med større tekst, 430×932, 844×390 og desktop 1440×960. Bekreft kildevisning, øvelser, alle ti spor, sladding, klokken, lagring, tastatur og den quizfrie avslutningen.

Resultater og faktiske skjermbilder finnes i `museum-qa` fra den aktuelle GitHub Actions-kjøringen. Chromium-emulering er ikke en test på fysisk Safari/iOS.
