# Lumen Relay

Et lite arkadespill for nettleseren, laget med Canvas 2D, Web Audio og vanlige JavaScript-moduler.

## Spill

Åpne:

`https://rolfss.github.io/Rolfs-projects-2026/lumen-relay/`

## Regler

- Plukk opp et lysende signal.
- Lever det til porten med samme symbol.
- Raske leveringer bygger en poengkjede.
- Unngå støyen, eller bruk dash mens du er beskyttet.
- Hold ut hele runden på 90 sekunder.

Signalene bruker både farge og form — sirkel, trekant og firkant — slik at man ikke må skille dem bare på farge.

## Kontroller

| Inndata | Handling |
|---|---|
| WASD / piltaster | Bevegelse |
| Mellomrom | Dash |
| P / Escape | Pause |
| M | Lyd av/på |
| Dra med peker | Styring |
| Dobbeltklikk / Dash-knapp | Dash |

## Teknisk

- Responsiv Canvas-tegning med støtte for skjermer med høy pikseltetthet.
- Spilløkke med begrenset tidssteg.
- Seedet tilfeldig generator og deterministiske tester av spillreglene.
- Bølger som gradvis øker tempo og tetthet.
- Partikler, spor, glød, skjermristing og poengtilbakemelding.
- Lydeffekter generert med Web Audio. Ingen lydfiler lastes ned.
- Tastatur, mus og berøring.
- Lokal toppscore og lydinnstilling.
- Automatisk pause når fanen skjules.
- Tilpasset oppførsel ved redusert bevegelse.
- Ingen rammeverk, byggesteg, API-nøkkel eller eksterne ressurser.

## Kjør lokalt

Server prosjektmappen med en lokal HTTP-server. JavaScript-moduler fungerer ikke alltid riktig direkte fra `file://`.

```bash
python -m http.server 8000
```

Åpne deretter `http://localhost:8000/lumen-relay/`.

Tester med Node 22 eller nyere:

```bash
cd lumen-relay
npm test
npm run check
```

## Filer

- `index.html` — grensesnitt, HUD, dialoger og tilgjengelig tekst.
- `styles.css` — oppsett og visuell stil.
- `game.mjs` — spilltilstand, inndata, simulering og tegning.
- `core.mjs` — poeng, vanskelighetsgrad, geometri og tilfeldig generator.
- `audio.mjs` — genererte lydeffekter.
- `norsk.mjs` — norsk tekstlag for dynamiske meldinger.
- `tests/` — tester av de rene spillreglene.
- `DESIGN.md` — korte notater om spilldesign og valg underveis.

## Data og personvern

Spillet sender ingen analyse- eller bruksdata og gjør ingen nettverkskall. Det lagrer bare toppscore og lydinnstilling lokalt i nettleseren.
