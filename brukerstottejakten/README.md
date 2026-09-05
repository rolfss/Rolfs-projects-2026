# Brukerstøttejakten 3.0

Et Duck Hunt-inspirert nettleserspill med norsk servicedesk-vri. De flyvende målene er tredimensjonale **Brukerstøttesaker**, verktøyet heter **Service Manager**, og ti faktiske treff gjør spilleren til **årets ansatt**.

Versjon 3.0 bruker et egenutviklet perspektivsystem for avstand, banking, projiserte 3D-flater, skygger og målhitbokser. Spillet har fire operative faser, flere sakstyper, en avsluttende hovedhendelse, saksflyt, treffrekker, fem utmerkelser, rangering, resultatdeling og adaptiv Web Audio-lyd. Alt kjører lokalt i nettleseren uten API-nøkler eller tredjepartsbiblioteker.

Hvert vellykket treff har en uavhengig **30 % sannsynlighet** for å utløse et enkelt Noark 5-kontrollpunkt med to svaralternativer. Riktig svar gir ett prestisjepoeng og seks sekunder faglig flyt. Feil svar trekker ett poeng, men poengsummen går aldri under null. Seier krever alltid ti faktisk løste saker.

## Kjør lokalt

```bash
python -m http.server 8080
```

Åpne `http://localhost:8080/brukerstottejakten/`.

## Kontroller

- Mus: sikt og klikk.
- Berøring: trykk direkte på saken.
- Tastatur: piltaster eller WASD for å sikte, mellomrom eller Enter for å skyte.
- P: pause eller fortsett.
- F: fullskjerm.

## Tester

```bash
npm test
npm run check
```
