const exact = new Map([
  ['Sound: on', 'Lyd: på'],
  ['Sound: off', 'Lyd: av'],
  ['Signal held', 'Signalet holdes'],
  ['Run paused.', 'Runden er satt på pause.'],
  ['The field is frozen. Resume when you are ready.', 'Feltet står stille. Fortsett når du vil.'],
  ['Resume', 'Fortsett'],
  ['Game paused.', 'Spillet er satt på pause.'],
  ['Game resumed.', 'Spillet fortsetter.'],
  ['Run complete', 'Runden er ferdig'],
  ['Connection lost', 'Forbindelsen brøt'],
  ['Field stabilized.', 'Feltet holdt.'],
  ['The signal broke.', 'Signalet brøt sammen.'],
  ['Run again', 'Spill igjen'],
  ['Fullscreen is unavailable in this browser.', 'Fullskjerm er ikke tilgjengelig i denne nettleseren.'],
  ['Exit fullscreen', 'Avslutt fullskjerm'],
  ['Fullscreen', 'Fullskjerm'],
  ['Dash', 'Dash'],
  ['Integrity −1', 'Integritet −1'],
]);

function translateText(value) {
  if (!value) return value;
  const trimmed = value.trim();
  if (exact.has(trimmed)) return value.replace(trimmed, exact.get(trimmed));

  let match = trimmed.match(/^Wave (\d+)$/);
  if (match) return value.replace(trimmed, `Bølge ${match[1]}`);

  match = trimmed.match(/^(\d+) integrity remaining$/);
  if (match) return value.replace(trimmed, `${match[1]} integritet igjen`);

  match = trimmed.match(/^Run started\. Ninety seconds remaining\.$/);
  if (match) return value.replace(trimmed, 'Runden har startet. 90 sekunder igjen.');

  match = trimmed.match(/^(\d+) fragments reached their gates across (\d+) waves?\.$/);
  if (match) return value.replace(trimmed, `${match[1]} signaler ble levert gjennom ${match[2]} bølger.`);

  match = trimmed.match(/^The field reached wave (\d+)\. Use the gate symbols and save dash for crowded crossings\.$/);
  if (match) return value.replace(trimmed, `Du nådde bølge ${match[1]}. Se etter portsymbolene, og spar dash til det blir trangt.`);

  match = trimmed.match(/^Run ended\. Final score ([\d,.\s]+)\. (\d+) fragments delivered\.$/);
  if (match) return value.replace(trimmed, `Runden er ferdig. Sluttpoeng: ${match[1]}. ${match[2]} signaler levert.`);

  return value;
}

function translateNode(root = document.body) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const next = translateText(node.nodeValue);
    if (next !== node.nodeValue) node.nodeValue = next;
  }

  for (const element of root.querySelectorAll?.('[aria-label]') ?? []) {
    const current = element.getAttribute('aria-label');
    const next = translateText(current);
    if (next !== current) element.setAttribute('aria-label', next);
  }
}

translateNode();

const observer = new MutationObserver(records => {
  for (const record of records) {
    if (record.type === 'characterData') {
      const next = translateText(record.target.nodeValue);
      if (next !== record.target.nodeValue) record.target.nodeValue = next;
      continue;
    }
    for (const node of record.addedNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        const next = translateText(node.nodeValue);
        if (next !== node.nodeValue) node.nodeValue = next;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        translateNode(node);
      }
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true, characterData: true });
