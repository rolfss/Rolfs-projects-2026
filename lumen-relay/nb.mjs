const exact = new Map([
  ['Sound: on', 'Lyd: på'],
  ['Sound: off', 'Lyd: av'],
  ['Run started. Ninety seconds remaining.', 'Runden har startet. Nitti sekunder igjen.'],
  ['Signal held', 'Signalet holdes'],
  ['Run paused.', 'Pause.'],
  ['The field is frozen. Resume when you are ready.', 'Feltet står stille. Fortsett når du vil.'],
  ['Resume', 'Fortsett'],
  ['Game paused.', 'Spillet er satt på pause.'],
  ['Game resumed.', 'Spillet fortsetter.'],
  ['Run complete', 'Runden er ferdig'],
  ['Connection lost', 'Forbindelsen brøt'],
  ['Field stabilized.', 'Feltet er stabilisert.'],
  ['The signal broke.', 'Signalet brøt sammen.'],
  ['Run again', 'Spill igjen'],
  ['Dash', 'Dash'],
  ['Fullscreen is unavailable in this browser.', 'Fullskjerm er ikke tilgjengelig i denne nettleseren.'],
  ['Exit fullscreen', 'Avslutt fullskjerm'],
  ['Fullscreen', 'Fullskjerm'],
]);

function translated(value) {
  const text = String(value ?? '');
  const trimmed = text.trim();
  if (exact.has(trimmed)) return text.replace(trimmed, exact.get(trimmed));
  let match = trimmed.match(/^Wave (\d+)$/);
  if (match) return text.replace(trimmed, `Bølge ${match[1]}`);
  match = trimmed.match(/^(\d+) integrity remaining$/);
  if (match) return text.replace(trimmed, `${match[1]} integritet igjen`);
  match = trimmed.match(/^(\d+) fragments reached their gates across (\d+) waves?\.$/);
  if (match) return text.replace(trimmed, `${match[1]} fragmenter nådde portene sine gjennom ${match[2]} ${match[2] === '1' ? 'bølge' : 'bølger'}.`);
  match = trimmed.match(/^The field reached wave (\d+)\. Use the gate symbols and save dash for crowded crossings\.$/);
  if (match) return text.replace(trimmed, `Feltet nådde bølge ${match[1]}. Bruk symbolene på portene, og spar dash til de trangeste passeringene.`);
  match = trimmed.match(/^Run ended\. Final score (.+)\. (\d+) fragments delivered\.$/);
  if (match) return text.replace(trimmed, `Runden er slutt. Sluttpoeng: ${match[1]}. ${match[2]} fragmenter levert.`);
  return text;
}

function localizeElement(element) {
  for (const attribute of ['aria-label', 'title', 'placeholder']) {
    if (element.hasAttribute?.(attribute)) {
      const current = element.getAttribute(attribute);
      const next = translated(current);
      if (next !== current) element.setAttribute(attribute, next);
    }
  }
}

function localize(root) {
  if (root.nodeType === Node.TEXT_NODE) {
    const parent = root.parentElement;
    if (!parent || ['SCRIPT', 'STYLE'].includes(parent.tagName)) return;
    const next = translated(root.nodeValue);
    if (next !== root.nodeValue) root.nodeValue = next;
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
  if (root.nodeType === Node.ELEMENT_NODE) localizeElement(root);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let node;
  while ((node = walker.nextNode())) {
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentElement;
      if (!parent || ['SCRIPT', 'STYLE'].includes(parent.tagName)) continue;
      const next = translated(node.nodeValue);
      if (next !== node.nodeValue) node.nodeValue = next;
    } else localizeElement(node);
  }
}

localize(document);
new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === 'characterData') localize(mutation.target);
    for (const node of mutation.addedNodes) localize(node);
  }
}).observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['aria-label', 'title', 'placeholder'] });
