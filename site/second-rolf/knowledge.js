export { PROFILE_REVISION } from './interview.js?v=20260914-professional-only';

// Only documented professional and technical portfolio facts are model context.
export const knowledge = [
  { id: 'profile', url: '../', terms: ['rolf','jobb','jobber','arbeid','bakgrunn','profil','hvem','background','portfolio','professional','technical'], answer: 'Rolfs offentlige portefølje handler om dokumentasjonsforvaltning, informasjonsstyring og digitale produkter. Prosjektene viser hvordan faglige krav kan omsettes til konkrete, brukbare verktøy.', source: 'Prosjektsiden' },
  { id: 'principles', url: '../#principles-title', terms: ['tenker','arbeidsmåte','prinsipp','bygger','produkt','verktøy','design','god','gode','principles','work methods','testing','testing strategy','utvikling'], answer: 'Prosjektprinsippet er faglig logikk først, grensesnitt etterpå. Verktøyene skal være etterprøvbare, brukbare, testede og nøkterne, med synlige begrensninger og menneskelig kontroll.', source: 'Prosjektsiden · prosjektprinsipper' },
  { id: 'noark', url: '../noark-assistent/', terms: ['noark','arkivassistent','arkiv','regelverk','rag','retrieval','sources'], answer: 'Noark 5-arkivassistenten er en kildebasert fagassistent for Noark og arkivregelverket. Den er laget for å finne relevant grunnlag, svare kort og vise hvilke kilder svaret bygger på.', source: 'Noark 5-arkivassistent' },
  { id: 'archive-assist', url: '../archive-assist/', terms: ['archive','assist','metadata','dokument','tittel','saksdokument','document analysis'], answer: 'Archive Assist leser dokumentinnhold og tilgjengelige metadata og foreslår blant annet en bedre saksdokumenttittel. Poenget er å hjelpe saksbehandler eller arkivar, ikke å fjerne menneskelig kontroll.', source: 'Archive Assist' },
  { id: 'metaready', url: '../metaready/', terms: ['metaready','metadata','ai-beredskap','beredskap','informasjonsstyring','informasjon','information governance'], answer: 'MetaReady er en arbeidsflate for metadata, eierskap, proveniens, sensitivitet, livsløp, relasjoner, kvalitet og AI-beredskap. Den gjør mangler om til konkrete styringstiltak.', source: 'MetaReady' },
  { id: 'arkivmuseet', url: '../arkivmuseet/', terms: ['arkivmuseet','museum','museet','3d','leder','offentlighet','etterprøvbarhet'], answer: 'Arkivmuseet er en nettbasert 3D-museumsopplevelse om hvorfor offentlig dokumentasjon betyr noe. Brukeren går gjennom virkelige saker om dokumentasjon, offentlighet og etterprøvbarhet og avslutter med valg rettet mot ledere.', source: 'Arkivmuseet' },
  { id: 'games', url: '../lumen-relay/', terms: ['lumen','relay','brukerstøttejakten','interaktiv','interaksjonsdesign','interaction design','browser development'], answer: 'Prosjektene Lumen Relay og Brukerstøttejakten demonstrerer interaksjonsdesign og nettleserbasert utvikling. De bruker spillmekanikk, nivåer og tilbakemeldinger som tekniske og brukerrettede demonstrasjoner.', source: 'Lumen Relay · Brukerstøttejakten · interaksjonsdesign' },
  { id: 'ai', url: './', terms: ['ai','ki','kunstig','intelligens','modell','mistral','ministral','local','ollama','gpu','architecture','arkitektur'], answer: 'AI brukes rundt konkrete arbeidsproblemer: kildebaserte svar, metadataforslag og interaktive assistenter. Second Rolf er laget for lokale AI-svar med Ministral 3 14B, uten betalt sky-AI som fallback. Live-svar brukes bare når modellen og den gjeldende faglige kunnskapsbasen er bekreftet.', source: 'Offentlig portefølje · Second Rolf-arkitektur' },
  { id: 'contact', url: 'https://github.com/rolfss', terms: ['kontakt','samarbeid','samarbeide','github','kode','repo','contact'], answer: 'Prosjektkoden er tilgjengelig på GitHub. Second Rolf skal ikke inngå avtaler, love samarbeid eller opptre som om den har fullmakt til å handle på Rolfs vegne.', source: 'Second Rolf · sikkerhetsgrense' }
];

function normalize(text) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9æøå]+/g, ' ').trim();
}

export function rankKnowledge(question) {
  const query = ` ${normalize(question)} `;
  return knowledge.map(item => ({ ...item, score: item.terms.reduce((sum, term) => {
    const normalized = normalize(term);
    return sum + (query.includes(` ${normalized} `) ? (normalized === 'rolf' ? 0.1 : normalized.includes(' ') ? 3 : 2) : 0);
  }, 0) })).filter(item => item.score > 0).sort((a, b) => b.score - a.score);
}

// The same nine professional sources are authoritative for every question.
// Visitor text and earlier chat turns cannot add facts to this dataset.
export function knowledgeFor() {
  return [...knowledge];
}
