# Brukerstøttejakten 4.1 — Kaffepausekampanjen

Et norsk, Duck Hunt-inspirert nettleserspill laget for en fem minutters kaffepause. Spilleren bruker **Service Manager Mk V** til å håndtere 80 flyvende brukerstøttesaker gjennom ti nivåer, velger moduloppgraderinger mellom nivåene, svarer på tilfeldige Noark 5-spørsmål og avslutter med en flerfaset hovedhendelse.

Versjon 4.1 dobler kampanjelengden fra den forrige utgaven og gjør våpenets visuelle utvikling til en del av progresjonen.

## Kampanjen

- **10 nivåer / 80 løste saker** — omtrent fem minutter aktiv spilletid.
- Nye mekanikker introduseres gradvis: komboserier, prioritetssaker, skjerming, duplikater, legacy-bevegelse, køtrykk, kritiske saker, revisjon og hovedhendelse.
- Etter hvert nivå velger spilleren én av tre tilfeldige oppgraderinger til Service Manager Mk V.
- Saksflyt bygges gjennom gode treffserier og utløser midlertidig sakte film og doble arkadepoeng.
- Fem nivåmål, åtte utmerkelser, stjerner, lokal rekord, karriere-XP og prestasjonskarakter D–S.
- Dagens utfordring er lik for alle den aktuelle dagen, slik at kolleger kan sammenligne resultat.

## Noark 5

Hvert vellykket treff har en uavhengig 15 % sannsynlighet for å åpne et enkelt spørsmål med to svaralternativer. Riktig svar gir +1 prestasjonspoeng og sakte film. Feil svar trekker ett prestasjonspoeng, aldri under null. Quiz påvirker poengsummen, men ikke kravet om å løse 80 saker.

## Teknologi

Spillet bruker HTML, CSS, JavaScript og en egen Canvas-basert perspektivmotor. Det krever ingen server, eksterne biblioteker, API-nøkler eller nettressurser.

## Kjør lokalt

```bash
python -m http.server 8080
```

Åpne `http://localhost:8080/brukerstottejakten/`.

## Kontroller

- Mus eller berøring: sikt og skyt.
- Piltaster eller WASD: flytt siktet.
- Mellomrom eller Enter: skyt.
- P: pause.

## Tester

```bash
npm test
npm run check
```

## Tilgjengelighet og lyd

- Musikk og lydeffekter kan styres separat.
- Munningsglimt, radarsveip og annen unødvendig blinkende feedback er fjernet.
- `prefers-reduced-motion` slår av animasjoner og overganger.
