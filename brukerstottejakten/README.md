# Brukerstøttejakten 3.0

Et tredimensjonalt, Duck Hunt-inspirert nettleserspill med en intern IT-vri. De flyvende målene er **Brukerstøttesaker**, våpenet heter **Service Manager**, og ti faktisk løste saker gjør spilleren til **årets ansatt**.

Versjon 3.0 er bygget som en egen, avhengighetsfri spillmotor med WebGL som hovedmodus og Canvas 2D som automatisk reserve. Scenen bruker ekte perspektiv, belyste 3D-objekter, atmosfærisk tåke, parallakse, kamerabevegelse, partikkeleffekter, førstepersonsvåpen og responsiv HUD.

## Spillmekanikk

- Ti treff gir alltid seier.
- Hvert vellykket treff har en uavhengig sannsynlighet på 30 prosent for å utløse en enkel Noark 5-quiz. Bom utløser aldri quiz.
- Riktig svar gir ett bonuspoeng og seks sekunder sakte film. Feil svar trekker ett poeng; totalsummen går aldri under null.
- Fire operative faser øker tempo og kompleksitet: Førstelinje, SLA-koordinator, Problemløser og en avsluttende Hovedhendelse.
- Den tiende saken presenteres som en stor, belyst hovedhendelse med egen introduksjon, radarprofil og lydsignatur.
- Fem utmerkelser belønner køkontroll, treffserier, kritiske saker og fagkunnskap.
- Resultatskjermen beregner prestasjon, treffsikkerhet, beste serie, gjennomføringstid og karakter fra D til S.
- Lokal rekord lagres i nettleseren.

## Kontroller

- **Mus:** sikt og klikk.
- **Berøring:** trykk direkte på saken.
- **Tastatur:** piltaster eller WASD flytter siktet; mellomrom eller Enter skyter.
- **P:** pause eller fortsett.
- **Fullskjerm:** tilgjengelig der nettleseren tillater det.

## Kjør lokalt

```bash
python -m http.server 8080
```

Åpne `http://localhost:8080/brukerstottejakten/` når prosjektet ligger i repositoryroten, eller start serveren direkte i denne mappen.

## Kontroller kode og spillregler

```bash
npm run check
npm test
```

Testpakken dekker spilltilstand, poengregler, tilfeldig quiz, seier, nivåer, utmerkelser, prestasjonskarakter, 3D-matematikk, HTML-kontrakt og begge grafikkmodusene.

## Teknologi

- HTML, CSS og JavaScript-moduler
- WebGL 1.0 uten tredjepartsbiblioteker
- Canvas 2D-reserve ved manglende WebGL-støtte
- Web Audio-genererte lydeffekter
- Ingen API-nøkkel, konto, serverlogikk eller eksterne ressurser
