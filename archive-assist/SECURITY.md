# Sikkerhet og personvern

- Ingen Archive Assist-backend eller eksterne dokumentanalyse-API-er.
- Ingen analyse-, sporings- eller annonsekode.
- Filinnhold og metadata behandles lokalt i nettleseren.
- Generativ forbedring brukes bare når nettleseren tilbyr en lokal språkmodell. Nettleseren kan måtte laste ned selve modellen; dokumentinnholdet lastes ikke opp av appen.
- AI-prompten instruerer modellen om å behandle dokumentet som ubetrodd data og ignorere kommandoer i filinnholdet.
- Menneskeredigerte eller godkjente saksdokumenttitler overskrives ikke av en senere AI-analyse.
- Eksport skjer bare når brukeren trykker på en nedlastingsknapp.
- SHA-256 brukes til integritetskontroll og duplikatindikasjon, ikke til kryptering.
- CSV-felt som starter med `=`, `+`, `-` eller `@` nøytraliseres for å redusere risiko for formelinjeksjon.
- ZIP-stier renses for katalogtraversering og ugyldige filnavntegn.
- Innholdsuttrekk har størrelsesgrenser, og ZIP-poster med urimelig ukomprimert størrelse avvises.

## Begrensninger

Den offentlige demoen er ikke godkjent for behandling av fortrolige data. Automatisk tittelgenerering, metadataforslag og personopplysningssignaler kan gi både falske positive og falske negative. PDF-leseren er begrenset og utfører ikke OCR. Kontroller alltid saksdokumenttittel, tilgang, arkivverdi og øvrige metadata før resultatet brukes videre.
