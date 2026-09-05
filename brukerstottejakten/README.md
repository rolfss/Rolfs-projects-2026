# Brukerstøttejakten 4.0 — Kaffepauseprotokollen

Et norsk, Duck Hunt-inspirert nettleserspill laget for en femminutters kaffepause. Spilleren bruker **Service Manager** til å lukke 40 flyvende **Brukerstøttesaker** gjennom åtte operative nivåer.

## Hva versjon 4.0 tilfører

- åtte nivåer og en maksimal vaktlengde på fem minutter
- fem sakstyper, inkludert SLA-vinduer og en hovedhendelse med fem delhendelser
- poeng for måltype, presisjon, treffrekke, nivåer og dynamiske vaktmål
- Saksflyt, sakte film og to strategiske forbedringsvalg per vakt
- en bank med enkle Noark 5-spørsmål; hvert vellykket treff har 30 prosent sjanse for et tilfeldig kontrollpunkt
- Dagens kø, tilfeldig vakt og delbare kollegadueller med identisk kø
- lokal karriere med 15 titler, XP, dagsrekke, utmerkelser og topplister
- responsiv styring med mus, tastatur og berøring
- prosedyregenerert Canvas-grafikk og Web Audio uten eksterne ressurser eller API-nøkler

All lagring skjer lokalt i nettleseren. Duell-lenker inneholder bare kø-seed, poengsum, resultatkode og navnet spilleren selv valgte.

## Kjør lokalt

```bash
python -m http.server 8080
```

Åpne `http://localhost:8080/brukerstottejakten/`.

## Kontroller

- **Mus eller berøring:** sikt og skyt direkte på saken
- **WASD eller piltaster:** flytt siktet
- **Mellomrom eller Enter:** skyt
- **P:** pause eller fortsett
- **F:** fullskjerm
- **1–3:** velg forbedring
- **1–2:** svar på Noark-kontrollpunkt

## Tester

```bash
npm test
npm run check
```
