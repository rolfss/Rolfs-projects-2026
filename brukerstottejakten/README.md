# Brukerstøttejakten 2.1

Et Duck Hunt-inspirert nettleserspill med en intern IT-vri. De flyvende målene er tredimensjonale **Brukerstøttesaker**, våpenet heter **Service Manager**, og ti faktiske treff gjør spilleren til **årets ansatt**.

Spillet har nivåer, komboserier, fire delmål, resultatstatistikk, lokal rekord og enkle **Noark 5-bonusspørsmål** med to svaralternativer. Hvert vellykket treff har en uavhengig sannsynlighet på 30 prosent for å utløse en quiz; bom utløser aldri quiz. Riktig svar gir ett prestasjonspoeng og midlertidig sakte film. Feil svar trekker ett poeng, men totalsummen går aldri under null.

Spillet bruker bare HTML, CSS, JavaScript og Canvas; ingen eksterne ressurser eller API-nøkler.

## Kjør lokalt

```bash
python -m http.server 8080
```

Åpne deretter `http://localhost:8080/brukerstottejakten/`.

## Kontroller

- Mus: sikt og klikk.
- Berøring: trykk direkte på saken.
- Tastatur: piltaster eller WASD for å sikte, mellomrom eller Enter for å skyte.
- P: pause eller fortsett.

## Tester

```bash
npm test
npm run check
```
