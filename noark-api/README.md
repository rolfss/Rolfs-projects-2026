# Aktiver Luna for Noark-assistenten

Bakenden bruker **GPT-5.6 Luna**, `reasoning.effort: medium`, via OpenAI Responses API. Nettleseren forblir på GitHub Pages; API-nøkkelen ligger bare som hemmelighet i en Cloudflare Worker. Én SQLite Durable Object deler budsjett og forespørselsgrenser mellom alle brukere.

**Status:** implementert og enhetstestet med simulerte API-kall. Ingen nøkkel følger med, og ingen betalte API-kall eller live Cloudflare-utrulling er utført som del av implementeringen. Helseendepunktet kontrollerer konfigurasjon, ikke om API-kontoen faktisk har tilgang til modellen.

## Privat aktivering

Krever Cloudflare-konto, Node.js 22+, tilgang til dette repositoryet og en OpenAI-prosjektnøkkel. Ikke lim nøkkelen inn i en samtale, kildekoden, GitHub Secrets som bygges inn i klientkode, eller en nettleserinnstilling.

1. Opprett en Cloudflare Turnstile-widget med tillatt vertsnavn **`rolfss.github.io`**. Sett den offentlige site key i `TURNSTILE_SITE_KEY` i `noark-api/wrangler.toml`. Behold `ALLOWED_ORIGINS = "https://rolfss.github.io"` for denne GitHub Pages-siden. Turnstile secret key skal ikke inn i filen.
2. Åpne en terminal i `noark-api` og kjør:

   ```sh
   npx wrangler@4 login
   npx wrangler@4 deploy
   npx wrangler@4 secret put OPENAI_API_KEY
   npx wrangler@4 secret put TURNSTILE_SECRET_KEY
   ```

   Lim hver nøkkel inn i det private, interaktive feltet fra den aktuelle kommandoen. Første utrulling er deaktivert inntil hemmelighetene finnes. Ingen hemmeligheter skal committes.
3. Kopier Worker-adressen fra utrullingen. Fra repository-roten kjører du, med din faktiske adresse:

   ```sh
   node noark-api/configure.mjs https://DIN-WORKER.workers.dev
   ```

   Dette setter bare offentlig bakendeadresse og den tilhørende `connect-src`-regelen. Commit og push `noark-assistent/api-config.mjs`, `noark-assistent/index.html` og den offentlige konfigurasjonen i `noark-api/wrangler.toml`. Den eksisterende GitHub Pages-jobben publiserer klientendringen.
4. Kontroller Worker-adressen med `/api/health`: `configured` skal være `true`. Åpne appen, slå på Luna, fullfør sikkerhetskontrollen og still ett testspørsmål. Bekreft at svarmerket viser **GPT-5.6 Luna**, og kontroller både ordlyd, kilder og faktisk API-forbruk.

Luna slås på eksplisitt i nettleseren. En delt spørsmålslenke eller en sidevisning utløser ikke automatisk et betalt modellkall. Standardklienten fungerer fortsatt med lokalt søk når bakenden er deaktivert.

## Kostnadsvern for utprøvingen

Standardgrenser i `worker.mjs`:

| Grense | Verdi |
|---|---:|
| Samlet prøvebudsjett, uten automatisk nullstilling | USD 6 |
| Kalender­måned, UTC | USD 6 |
| Kalenderdag, UTC | USD 0,50 |
| Forespørsler per IP-identitet | 5/minutt og 60/dag |
| Forespørsler for hele appen | 250/dag |
| Samtidige modellkall | 4 |
| Maksimal modellutdata, inkludert resonnering | 4 096 tokens |

Hele den øvre estimerte forespørselskostnaden reserveres i en varig, atomisk transaksjon **før** modellkallet. Bekreftet tokenforbruk frigir ubrukt reserve. Ved ukjent utfall beholdes reservasjonen; appen prøver ikke automatisk igjen. Derfor kan modellen stoppe før et nominelt budsjett er brukt opp.

Regnskapet bruker konservativ pris på USD 0,25 per million inputtokens, inkludert mulig cache-skriving, og USD 1,20 per million outputtokens. Ordinær Luna-inputpris var USD 0,20 ved kontroll 7. september 2026. Cache-rabatt utnyttes ikke i budsjettanslaget.

**Dette er appens lokale, konservative sperre – ikke en garanti for OpenAI-kontoens samlede regning.** Andre apper/nøkler, hosting, skatter og fremtidige prisendringer er ikke dekket. Kontroller prisene før aktivering og ved modellendringer. OpenAIs prosjektbudsjett er en varslingsgrense, ikke en hard stopp. Koden endrer ikke fakturering eller automatisk påfyll på kontoen.

Ikke slett, gi nytt navn til eller opprett flere budsjettobjekter for å «starte på nytt»: nye instanser har separate budsjetter. De samlede seks dollarene gjenåpnes ikke ved månedsskiftet; en større utprøving krever en bevisst endring i `LIMITS`.

## Sikkerhetsmodell

Bakenden bestemmer modell, instrukser, kildegrunnlag og tokenbegrensninger. Brukeren kan ikke velge vilkårlige API-endepunkter, modeller eller kildetekster. Nettlesertilgang avgrenses med CORS, men CORS er ikke autentisering: Turnstile valideres på serveren med riktig vertsnavn og handling, og alle kostnader begrenses sentralt.

Budsjettregisteret lagrer summer, forespørsels-ID-er og daglig saltede IP-avtrykk, ikke spørsmål, svar, rå IP-adresser eller nøkler. Misbruksvern er ikke full brukerautentisering; en offentlig app kan få sitt lille budsjett brukt opp av andre. En liten prøve bør derfor vurderes før bred annonsering.

Kun kilde-ID-er fra serverens egen katalog tillates. Modellens lenker aksepteres aldri. Siteringskontrollen kan ikke bevise at alle faglige påstander er riktige. Relevansskårer er heller ikke kalibrerte sannsynligheter. Spørsmål og kildeposter sendes til OpenAI med `store: false`; leverandørens øvrige datavilkår og sikkerhetslogger gjelder fortsatt.

## Kontroller etter aktivering

Kjør `npm run validate` i `noark-assistent`. Kontroller deretter manuelt korte svar, åpne originale kilder og sammenlign relevansskårer for eksempelvis «Hva er systemID?», «Hva krever krav 8.15?», et oppfølgingsspørsmål, et spørsmål utenfor arkivområdet og et spørsmål hvor kandidatpostene bare dekker deler av behovet. Beste treff skal ikke rutinemessig få 100 prosent. Prøv kopiering og kildelenker fra både siste og tidligere svar.

Enhetstestene bruker simulerte API-kall. De dokumenterer programatferd, ikke modellens faktiske faglige nøyaktighet eller en ferdig produksjonsutrulling. Full nettleser-/mobiltest og live modelltest gjenstår etter utrulling.

## Offisiell dokumentasjon

- [Luna-modell, priser og støttede funksjoner](https://developers.openai.com/api/docs/models/gpt-5.6-luna)
- [OpenAI API-nøkler: sikker bruk](https://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety)
- [OpenAI: datakontroller](https://developers.openai.com/api/docs/guides/your-data)
- [Cloudflare Worker-hemmeligheter](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Durable Objects: priser og gratisgrenser](https://developers.cloudflare.com/durable-objects/platform/pricing/)
- [Turnstile: servervalidering](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
