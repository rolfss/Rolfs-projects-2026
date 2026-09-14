import { interview } from './interview.js?v=20260914-basic-public';
export { PROFILE_REVISION } from './interview.js?v=20260914-basic-public';

const portfolio = [
  { id: 'profile', url: '../', terms: ['rolf','jobb','jobber','arbeid','bakgrunn','profil','hvem','background','portfolio'], answer: 'Rolf arbeider i skjæringspunktet mellom dokumentasjonsforvaltning, informasjonsstyring og digitale produkter. På denne siden viser han særlig små, fungerende verktøy som gjør komplisert faglogikk mer forståelig og brukbar.', source: 'Prosjektsiden' },
  { id: 'principles', url: '../#principles-title', terms: ['tenker','arbeidsmåte','prinsipp','bygger','produkt','verktøy','design','god','gode','principles','work methods'], answer: 'En tydelig rød tråd er: faglig logikk først, grensesnitt etterpå. Verktøyene skal være etterprøvbare, brukbare, testede og nøkterne — særlig ved å vise begrensninger i stedet for å late som systemet vet mer enn det gjør.', source: 'Prosjektsiden · prosjektprinsipper' },
  { id: 'noark', url: '../noark-assistent/', terms: ['noark','arkivassistent','arkiv','regelverk','rag'], answer: 'Noark 5-arkivassistenten er en kildebasert fagassistent for Noark og arkivregelverket. Den er laget for å finne relevant grunnlag, svare kort og vise hvilke kilder svaret bygger på.', source: 'Noark 5-arkivassistent' },
  { id: 'archive-assist', url: '../archive-assist/', terms: ['archive','assist','metadata','dokument','tittel','saksdokument'], answer: 'Archive Assist leser dokumentinnhold og tilgjengelige metadata og foreslår blant annet en bedre saksdokumenttittel. Poenget er å hjelpe saksbehandler eller arkivar, ikke å fjerne menneskelig kontroll.', source: 'Archive Assist' },
  { id: 'metaready', url: '../metaready/', terms: ['metaready','metadata','ai-beredskap','beredskap','informasjonsstyring','informasjon'], answer: 'MetaReady er en arbeidsflate for metadata, eierskap, proveniens, sensitivitet, livsløp, relasjoner, kvalitet og AI-beredskap. Den gjør mangler om til konkrete styringstiltak.', source: 'MetaReady' },
  { id: 'arkivmuseet', url: '../arkivmuseet/', terms: ['arkivmuseet','museum','museet','3d','leder','offentlighet','etterprøvbarhet'], answer: 'Arkivmuseet er en nettbasert 3D-museumsopplevelse om hvorfor offentlig dokumentasjon betyr noe. Brukeren går gjennom virkelige saker om dokumentasjon, offentlighet og etterprøvbarhet og avslutter med valg rettet mot ledere.', source: 'Arkivmuseet' },
  { id: 'games', url: '../lumen-relay/', terms: ['spill','lumen','relay','brukerstøttejakten','interaktiv','game'], answer: 'Rolf bruker også spillmekanikk som demonstrasjon av interaksjonsdesign. Lumen Relay er et kort nettleserspill, mens Brukerstøttejakten er et mer omfattende, humoristisk IT-spill med nivåer, saker og oppgraderinger.', source: 'Lumen Relay · Brukerstøttejakten' },
  { id: 'ai', url: './', terms: ['ai','ki','kunstig','intelligens','modell','mistral','ministral','local'], answer: 'AI brukes først og fremst som et verktøy rundt konkrete arbeidsproblemer: kildebaserte svar, metadataforslag og interaktive assistenter. Second Rolf er laget for lokale AI-svar med Ministral 3 14B, uten betalt sky-AI som fallback. Live-svar er bare tilgjengelige når både modellen og den gjeldende offentlige kunnskapsbasen er bekreftet.', source: 'Offentlig portefølje · Second Rolf-arkitektur' },
  { id: 'contact', url: 'https://github.com/rolfss', terms: ['kontakt','samarbeid','samarbeide','github','kode','repo','contact'], answer: 'Den sikreste veien videre er å se prosjektkoden på GitHub og kontakte Rolf gjennom hans vanlige offentlige kanaler. Second Rolf skal ikke inngå avtaler, love samarbeid eller opptre som om den har fullmakt.', source: 'Second Rolf · sikkerhetsgrense' }
];

export const knowledge = [...portfolio, ...interview.entries.map(entry => ({
  id: entry.id, url: `./interview.html#${entry.id}`, terms: entry.terms,
  answer: entry.summary, source: `Rolf · interesser · ${entry.topic}`, kind: entry.kind
}))];

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

// Only ordinary interests can supplement the public project records.
export function knowledgeFor(question, history = []) {
  const current = new Map(rankKnowledge(question).map(item => [item.id, item.score]));
  const previousQuestions = history.filter(m => m.role === 'user').slice(-2).map(m => m.content).join(' ');
  const previous = new Map(rankKnowledge(previousQuestions).map(item => [item.id, item.score]));
  const overview = knowledge.filter(item => item.id === 'interests');
  const details = knowledge.filter(item => item.kind === 'basic_interest' && item.id !== 'interests')
    .map(item => ({ item, score: 3 * (current.get(item.id) || 0) + (previous.get(item.id) || 0) }))
    .filter(match => match.score > 0).sort((a, b) => b.score - a.score).slice(0, 6).map(match => match.item);
  return [...portfolio, ...overview, ...details];
}
