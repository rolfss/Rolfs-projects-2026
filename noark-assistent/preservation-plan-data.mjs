// Paraphrases checked against the official guide on 2026-09-17.
// The verification date does not establish the guide's publication date.
const VERIFIED_AT = '2026-09-17';
const SCOPE = 'Statlige virksomheters bevaringsplaner for fagsaker';

export const PRESERVATION_PLAN_SOURCES = Object.freeze([
  Object.freeze({
    id: 'na-preservation-plan',
    title: 'Veileder om bevaringsplaner for fagsaker',
    shortTitle: 'Bevaringsplaner for fagsaker',
    publisher: 'Nasjonalarkivet',
    published: 'Publiseringsdato ikke bekreftet',
    type: 'Offisiell veiledning',
    url: 'https://www.nasjonalarkivet.no/veiledere/veileder-om-bevaringsplaner-for-fagsaker/',
    note: 'Statlige bevaringsplaner: skjemaer, funksjonsbaserte vurderinger og revisjon før avlevering.',
    scope: SCOPE,
    verifiedAt: VERIFIED_AT,
    status: 'current-guidance',
  }),
]);

const record = (entry) => Object.freeze({
  page: null,
  requirement: null,
  requirementType: null,
  verifiedAt: VERIFIED_AT,
  scope: SCOPE,
  source: 'na-preservation-plan',
  topic: 'Bevaring og kassasjon',
  ...entry,
  tags: Object.freeze(entry.tags),
});

export const PRESERVATION_PLAN_RECORDS = Object.freeze([
  {
    id: 'guide-preservation-plan-approval',
    title: 'Hvem godkjenner bevaringsplanen?',
    section: 'Målgruppe; Hva er en bevaringsplan?',
    tags: ['bevaringsplan', 'bevaringsplanen', 'statlig', 'fagsaker', 'godkjenning', 'godkjenner', 'forslag', 'Nasjonalarkivet', '§ 18'],
    summary: 'Statlige virksomheter foreslår bevaring og kassasjon for fagsakene. Nasjonalarkivet avgjør og godkjenner omfanget.',
    detail: 'Veilederen retter seg primært mot staten. Kommuner har egne bevaringsbestemmelser. Godkjent plan inngår i dokumentasjonsplanen.',
  },
  {
    id: 'guide-preservation-plan-forms',
    title: 'To skjemaer til bevaringsplanen',
    section: 'Skjema for forslag til bevaringsplan',
    tags: ['bevaringsplan', 'bevaringsplanen', 'skjema', 'skjemaer', 'skjema 1', 'skjema 2', 'overordnet', 'bevaringsvurdering', 'informasjonssystem'],
    summary: 'Bruk skjema 1 til overordnet bevaringsvurdering og skjema 2 til beskrivelse av hvert digitalt informasjonssystem.',
    detail: 'Skjema 1 begrunner bevaring eller kassasjon per funksjon/prosess. Lever ett skjema 1 per plan og ett skjema 2 per system.',
  },
  {
    id: 'guide-preservation-plan-method',
    title: 'Funksjonsbasert bevaringsplan',
    section: 'Bruk funksjonsbasert tilnærming',
    tags: ['bevaringsplan', 'bevaringsplanen', 'funksjonsbasert', 'funksjoner', 'prosesser', 'funksjonsanalyse', 'systemkartlegging', 'arkivnøkkel', 'metode'],
    summary: 'Bygg normalt bevaringsplanen på virksomhetens funksjoner og prosesser, også når dokumentasjonen finnes i flere systemer.',
    detail: 'Bruk eksisterende funksjonsanalyse og systemkartlegging. Beskriv dokumentasjonen og begrunn forslagene.',
  },
  {
    id: 'guide-preservation-plan-revision',
    title: 'Kontroller bevaringsplanen før avlevering',
    section: 'Oppdater bevaringsplanen; Før avlevering',
    tags: ['bevaringsplan', 'bevaringsplanen', 'oppdatere', 'oppdateres', 'revidere', 'revisjon', 'avlevering', 'migrering', 'systemendringer', 'arbeidsprosesser'],
    summary: 'Kontroller bevaringsplanen før avlevering til Nasjonalarkivet. Send inn revidert plan dersom endringer ikke er innarbeidet.',
    detail: 'Vurder også planen ved systembytte, migrering, endrede oppgaver eller arbeidsprosesser.',
  },
].map(record));
