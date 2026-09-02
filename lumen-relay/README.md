# Lumen Relay

Et lite arkadespill om signalruting, laget for nettleseren med Canvas 2D, Web Audio og vanlige JavaScript-moduler.

## Spill

Den publiserte versjonen ligger her:

`https://rolfss.github.io/Rolfs-projects-2026/lumen-relay/`

## Regler

- Samle et lysende signalfragment.
- Lever det til porten med samme symbol.
- Raske leveringer bygger opp poengrekken.
- Unngå interferens, eller bruk dash når du må gjennom den.
- En hel runde varer i 90 sekunder.

Sirkel, trekant og firkant gjør at signalene kan skilles fra hverandre uten at farge er avgjørende.

## Kontroller

| Inndata | Handling |
|---|---|
| WASD / piltaster | Beveg deg |
| Mellomrom | Dash |
| P / Escape | Pause |
| M | Lyd av/på |
| Dra med mus eller finger | Styr |
| Dobbeltklikk / Dash-knapp | Dash |

## Teknisk

- Responsiv Canvas-rendering med støtte for høy pikseltetthet.
- Spilløkke med fast rundelengde og begrenset tidssteg mellom bilder.
- Seedet tilfeldighetsgenerator og deterministiske tester.
- Bølger og gradvis økende vanskelighetsgrad.
- Partikler, spor, glød, skjermristing og poengfeedback.
- Lydeffekter genereres med Web Audio. Ingen lydfiler lastes ned.
- Tastatur, mus og berøring bruker samme spillmodell.
- Signaler kodes både med form og farge.
- Beste poengsum og lydvalg lagres lokalt.
- Spillet pauses automatisk når fanen skjules.
- Tar hensyn til redusert bevegelse i operativsystemet.
- Ingen rammeverk, byggetrinn, API-nøkkel eller eksterne ressurser.

## Kjør lokalt

Kjør en enkel HTTP-server fra repo-roten eller denne mappen. JavaScript-moduler fungerer ikke riktig fra `file://` i alle nettlesere.

```bash
python -m http.server 8000
```

Åpne deretter `http://localhost:8000/lumen-relay/`.

Kjør testene med Node 22 eller nyere:

```bash
cd lumen-relay
npm test
npm run check
```

## Filer

- `index.html` — grensesnitt, HUD, dialoger og tilgjengelig tekst.
- `styles.css` — layout og visuell utforming.
- `game.mjs` — spilltilstand, inndata, simulering og tegning.
- `core.mjs` — poeng, vanskelighetsgrad, geometri og tilfeldighetsfunksjoner.
- `audio.mjs` — genererte lydeffekter.
- `nb.mjs` — norsk tekst for dynamiske spillmeldinger.
- `tests/` — automatiske tester av spillreglene.
- `DESIGN.md` — notater om spilldesign og tekniske valg.

## Data og personvern

Spillet sender ingen analyse- eller bruksdata og gjør ingen nettverkskall. Det lagrer bare beste poengsum og lydvalg lokalt i nettleseren.
