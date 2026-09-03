# Brukerstøttejakten

Et lite Duck Hunt-inspirert nettleserspill. De flyvende målene er mursteinsaktige **Brukerstøttesaker**, våpenet heter **Service Manager**, og ti treff gjør spilleren til **årets ansatt**.

## Kjør lokalt

Åpne `index.html` via en enkel lokal HTTP-server, for eksempel:

```bash
python -m http.server 8000
```

## Kontroller

- Mus, styreflate eller berøring: pek og skyt.
- Tastatur: piltaster flytter siktet; mellomrom eller Enter skyter.
- Lyd kan slås av i toppfeltet.

## Test

```bash
npm test
npm run check
```

Spillet bruker bare HTML, CSS, Canvas 2D, Web Audio og JavaScript-moduler. Ingen eksterne ressurser eller API-nøkler.
