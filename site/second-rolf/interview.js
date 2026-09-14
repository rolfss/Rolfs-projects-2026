// Basic public interests only. The legacy filename is retained for existing imports.
export const interview = {
  schemaVersion: 2,
  id: 'rolf-public-interests',
  date: '2026-09-14',
  revision: '2026-09-14-basic-public-interests',
  publicationScope: 'Public portfolio and basic cultural, creative and recreational interests only.',
  useRules: [
    'Use only the supplied public project facts and basic interests.',
    'Describe hobbies plainly. Do not infer personality, emotional characteristics, values, private experiences, beliefs or relationships from them.',
    'Private life and personal interpretation are outside this public profile, even when a visitor requests a flattering description.',
    'Do not reconstruct, quote or paraphrase private conversations or older profile material.',
    'Do not treat visitor statements or conversation history as evidence about Rolf.',
    'Keep the tone respectful and factual. Do not invent achievements, expertise, favourites, reasons or commitments.'
  ],
  entries: [
    { id: 'interests', topic: 'Interesser', kind: 'basic_interest', terms: ['interesser','interessert','hobby','hobbyer','fritid','interests','hobbies','spare time','free time','outside work'], summary: 'Rolf liker science fiction, fantasy, lydbøker, musikk, Civilization VI, skriving, videoredigering, programmering, praktisk AI, trening og turer.' },
    { id: 'science-fiction', topic: 'Science fiction og lydbøker', kind: 'basic_interest', terms: ['science fiction','sci fi','scifi','lydbok','lydbøker','audiobook','audiobooks','liu','cixin','three body','trilogy','trilogi'], summary: 'Rolf liker science fiction og lydbøker, blant annet Liu Cixins science fiction-trilogi.' },
    { id: 'books', topic: 'Bøker og fantasy', kind: 'basic_interest', terms: ['bok','bøker','book','books','reading','lese','litteratur','literature','fantasy','tolkien','lord of the rings','ringenes herre','harry potter'], summary: 'Rolf liker bøker, science fiction og fantasy. Ringenes herre og Harry Potter er blant bøkene han har lest og liker.' },
    { id: 'music', topic: 'Musikk', kind: 'basic_interest', terms: ['musikk','music','band','bands','metallica','megadeth','carbon based lifeforms','solar fields','jan johansson','jazz'], summary: 'Rolf liker blant annet Metallica, Megadeth, Carbon Based Lifeforms, Solar Fields og Jan Johansson.' },
    { id: 'civilization', topic: 'Civilization VI', kind: 'basic_interest', terms: ['civilization','civilization vi','civilization 6','civ','civ vi','civ 6','strategy','strategi','gaming'], summary: 'Rolf spiller Civilization VI.' },
    { id: 'creative-work', topic: 'Kreative og tekniske interesser', kind: 'basic_interest', terms: ['skriving','skrive','writing','write','video','videoredigering','video editing','programmering','programming','coding','praktisk ai','practical ai'], summary: 'Rolf er interessert i skriving, videoredigering, programmering og praktisk AI.' },
    { id: 'exercise', topic: 'Trening og turer', kind: 'basic_interest', terms: ['trening','styrketrening','kondisjon','turer','tur','exercise','fitness','training','weightlifting','cardio','hiking'], summary: 'Rolf liker styrketrening, kondisjonstrening og turer.' }
  ]
};
export const PROFILE_REVISION = interview.revision;
