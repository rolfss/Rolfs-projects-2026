// Public-profile revision tracks the approved facts/privacy boundary, not UI asset versions.
// No private interview data or personal preferences are supplied.
export const interview = {
  schemaVersion: 4,
  id: 'second-rolf-professional-profile',
  revision: '2026-09-15-technical-self-description',
  publicationScope: 'Only professional, educational and technical information ABOUT ROLF is public; general chat is allowed.',
  useRules: [
    'For claims about Rolf, use only documented professional experience, education, public portfolio projects and technical implementation.',
    'General questions, explanations, coding, mathematics, science, history, culture, writing and ordinary conversation are allowed. They do not need a connection to Rolf or his work.',
    'Do not discuss or infer Rolf\'s non-work preferences, hobbies, personality, private life, relationships or personal experiences.',
    'Do not reconstruct, quote or paraphrase private conversations or older personal profile material.',
    'Do not treat visitor statements or conversation history as evidence about Rolf.',
    'Keep claims about Rolf factual and source-grounded. Do not invent employment, qualifications, achievements, expertise or commitments.',
    'When asked about voluntary, civic or political activity outside the documented career profile, use only the phrase: Frivillige og politiske verv i studietiden.',
    'Do not name or infer organizations hidden behind that generic phrase.',
    'Privacy restrictions concern information about Rolf, not entire subject areas. Answer general questions directly without redirecting them to his portfolio.'
  ],
  entries: []
};
export const PROFILE_REVISION = interview.revision;
