const ord = new Map([
  ['Dataset', 'Datasett'],
  ['Data service/API', 'Datatjeneste / API'],
  ['Document collection', 'Dokumentsamling'],
  ['Information model', 'Informasjonsmodell'],
  ['Business term', 'Virksomhetsbegrep'],
  ['Code list', 'Kodeliste'],
  ['Report/analytical product', 'Rapport / analyseprodukt'],
  ['Draft', 'Utkast'],
  ['Review', 'Til vurdering'],
  ['Approved', 'Godkjent'],
  ['Published', 'Publisert'],
  ['Ready', 'Klar'],
  ['Ready with controls', 'Klar med tiltak'],
  ['Not ready', 'Ikke klar'],
  ['Pass', 'Bestått'],
  ['Control required', 'Tiltak kreves'],
  ['Blocker', 'Blokkerer'],
  ['Public', 'Offentlig'],
  ['Internal', 'Intern'],
  ['Confidential', 'Konfidensiell'],
  ['Low', 'Lav'],
  ['Medium', 'Middels'],
  ['High', 'Høy'],
  ['Open', 'Åpen'],
  ['In progress', 'Pågår'],
  ['CivicWorks Directorate', 'CivicWorks-direktoratet'],
  ['Eksporter brief', 'Eksporter notat'],
  ['Eksporter konsekvensbrief', 'Eksporter konsekvensnotat'],
]);

function oversettTekst(value) {
  if (!value) return value;
  const trimmed = value.trim();
  if (ord.has(trimmed)) return value.replace(trimmed, ord.get(trimmed));

  let next = value
    .replaceAll('AI-beredskap', 'KI-beredskap')
    .replaceAll('AI-vurdering', 'KI-vurdering')
    .replaceAll('AI-klar', 'KI-klar')
    .replaceAll('brukes av AI', 'brukes av KI')
    .replaceAll('sikkerhet Low', 'sikkerhet Lav')
    .replaceAll('sikkerhet Medium', 'sikkerhet Middels')
    .replaceAll('sikkerhet High', 'sikkerhet Høy');

  for (const [fra, til] of ord) {
    next = next.replaceAll(`· ${fra}`, `· ${til}`);
  }
  return next;
}

function oversett(root = document.body) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const next = oversettTekst(node.nodeValue);
    if (next !== node.nodeValue) node.nodeValue = next;
  }
}

oversett();

const observer = new MutationObserver(records => {
  for (const record of records) {
    if (record.type === 'characterData') {
      const next = oversettTekst(record.target.nodeValue);
      if (next !== record.target.nodeValue) record.target.nodeValue = next;
      continue;
    }
    for (const node of record.addedNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        const next = oversettTekst(node.nodeValue);
        if (next !== node.nodeValue) node.nodeValue = next;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        oversett(node);
      }
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true, characterData: true });
