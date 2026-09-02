# Sikkerhet og personvern

- Ingen backend eller eksterne API-kall.
- Ingen analyse-, sporings- eller annonsekode.
- Filinnhold og metadata behandles lokalt i nettleseren.
- Eksport skjer bare når brukeren trykker på en nedlastingsknapp.
- SHA-256 brukes til integritetskontroll og duplikatindikasjon, ikke til kryptering.
- CSV-felt som starter med `=`, `+`, `-` eller `@` nøytraliseres for å redusere risiko for formelinjeksjon.
- ZIP-stier renses for katalogtraversering og ugyldige filnavntegn.

## Begrensninger

Den offentlige demoen er ikke godkjent for behandling av fortrolige data. Automatisk gjenkjenning kan gi både falske positive og falske negative. Kontroller alltid resultatet før det brukes videre.
