# Brukerstøttejakten 4.1 — Kaffepausekampanjen

Et norsk, Duck Hunt-inspirert nettleserspill laget for en kaffepause. Spilleren bruker **Service Manager Mk V** til å håndtere 80 flyvende brukerstøttesaker gjennom ti nivåer, velger moduloppgraderinger mellom nivåene, svarer på Noark 5-spørsmål og avslutter med en flerfaset hovedhendelse.

## Kaffe og skytbare våpenbonuser

Bonusgjenstander glir inn i en egen bane under sakene. **Skyt selve ikonet** med mus, berøring eller tastatur. Den første bonusen er kaffe; deretter kommer telefon og e-post. Senere blandes de tre i tilfeldige rekkefølger uten at én bonustype blir utelatt fra en runde.

| Gjenstand | Effekt | Varighet |
| --- | --- | --- |
| Kaffekopp | Sakene og de faktiske treffområdene blir opptil 65 % større. Store mål tilpasses fortsatt flysonen. | 5 sekunder aktiv spilletid |
| Telefon | **Treffspredning / scattershot:** tre siktepunkter, opptil tre forskjellige saker per avtrekk. | 12 sekunder aktiv spilletid |
| E-post | **Områdetreff:** én skade på hver sak som berører sirkelen rundt siktet. | 12 sekunder aktiv spilletid |

- Kaffe kan kombineres med begge våpenbonusene. En ny telefon/e-post erstatter gjeldende våpenmodus; en ny bonus av samme type fornyer varigheten, uten ubegrenset stabling.
- Tidtakere stopper under pause, fagtest og nivåbytte. Effekter med tid igjen følger med til neste nivå. Ny vakt nullstiller alle bonuser.
- Kaffe endrer felles tegnings- og treffgeometri, ikke bare det visuelle uttrykket. Nye saker får også effekten mens den varer. Duplikater forstørres ikke.
- En sak tar skade høyst én gang per avtrekk. Treffspredning/områdetreff teller som ett skudd og én kombostigning, men gir vanlig belønning for hver løst sak. Det gjøres høyst ett quizkast per avtrekk.
- Direkte skudd på duplikater gir fortsatt straff. Sekundærtreff fra spredning og område ignorerer duplikater.
- Pulsskuddet forblir et presist enkelttreff med tre skade, også når telefon-/e-postbonus er aktiv.
- Bonusikoner, navn, treffmålere og siktehjelp er statiske. Ingen nye lysglimt, pulserende farger eller skjermblink er lagt til.

## Flere sakstyper

Nye varianter beholder grunnkategoriens bevegelse og nivåmål, men har navn, fargemerking, treffmåler og høyere poengverdi. De introduseres gradvis og blandes med de vanlige sakene.

| Sakstype | Fra nivå | Vanlige treff før lukking* |
| --- | --- | --- |
| VIP-henvendelse | 3 | 2 |
| Maskinvarefeil | 4 | 3 |
| Nettverksbrudd | 6 | 3 |
| Serverhavari | 7 | 5 |
| Sikkerhetshendelse | 8 | 4 |

\* Før moduloppgraderinger og pulsskudd. Skjermingsbryter reduserer treffkravet for skjermede og kritiske varianter. Hovedhendelsen krever fortsatt normalt åtte treff. Områdetreff kan ikke hoppe over den ved kampanjens slutt.

## Kampanjen

- **10 nivåer / 80 løste saker**, med doble sakshastigheter og ti nivåspesifikke lydspor som veksler mellom groove, trance og jazz.
- Etter hvert nivå velger spilleren én av tre tilfeldige oppgraderinger til Service Manager Mk V.
- Saksflyt bygges gjennom gode treffserier og utløser midlertidig sakte film og doble arkadepoeng.
- **Lykkesak:** Vanlige, prioriterte, eldre, skjermede og kritiske saker har 12 % sjanse til grønn bonusdrakt og «★ LYKKESAK ★». Siste treff gir +400 arkadepoeng og 15 mindre køtrykk, uten ekstra løste saker. Duplikater og hovedhendelsen er aldri lykkesaker.
- Nivåmål, åtte utmerkelser, stjerner, lokal rekord, karriere-XP og prestasjonskarakter D–S.
- Dagens utfordring er lik for alle den aktuelle dagen.

## Frukt og pulsskudd

Frukt ruller inn på gulvet etter 2,5 sekunder, deretter med 5–9 sekunders mellomrom og maksimalt to hele frukter samtidig. Appelsin gir +250 arkadepoeng / −12 køtrykk, vannmelon +150 / +30 Saksflyt, ananas +200 / fulladet pulsskudd. Frukt teller ikke som løste saker, quiztreff eller kombotreff. Frukt som ruller ut gir ingen straff. Fruktbiter falmer uten lysglimt.

## Noark 5

Et vellykket avtrekk har 15 % sannsynlighet for å åpne et spørsmål med to alternativer. Riktig svar gir +1 prestasjonspoeng og sakte film; feil svar trekker ett prestasjonspoeng, aldri under null. Quiz endrer ikke kravet om å løse 80 saker.

## Kontroller

- Mus eller berøring: sikt og skyt.
- Piltaster eller WASD: flytt siktet. Mellomrom eller Enter: skyt.
- P: pause.
- Høyreklikk eller Shift + skyt: **Pulsskudd**, tre skade på ett mål og fem sekunders lading.
- Q eller puls-knappen: velg puls for neste skudd, også på berøring. Vanlige skudd virker under lading.
- Musikk, lyd og fullskjerm styres med egne knapper.

## Teknologi og lokal kjøring

HTML, CSS, JavaScript og en Canvas-basert perspektivmotor. Ingen serverlogikk, eksterne biblioteker, API-nøkler eller nettressurser kreves. Den statiske siden kan kjøres med:

```bash
python -m http.server 8080
```

Åpne `http://localhost:8080/brukerstottejakten/`.

```bash
cd brukerstottejakten
npm test
npm run check
```

`combat-boosters.js` samler bonusregler, felles treffgeometri, sakstypeprofiler og statiske bonusindikatorer. Testene dekker blant annet femsekundersgrensen, fornyelse, kombinasjoner, skalering uten akkumulering, spredning/område, duplikater, skuddstatistikk og kampanjeprogresjon.

## Tilgjengelighet

Eksisterende vern mot fullskjermsblink, treffglimt, munningsglimt, radarpulser og pulserende våpenlys er beholdt. Duplikatenes tidligere svingende gjennomsiktighet er også gjort konstant. `prefers-reduced-motion` støttes fortsatt. Dette er ikke en medisinsk sikkerhetssertifisering.
