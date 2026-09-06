from pathlib import Path
import json


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'Mangler forventet tekst i {path}: {old[:120]!r}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')


def append_once(path, marker, addition):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if marker not in text:
        p.write_text(text.rstrip() + '\n\n' + addition.strip() + '\n', encoding='utf-8')


# ---------------------------------------------------------------------------
# Noark 5-arkivassistent: gjør søkeresultatet mer egnet til beslutningsstøtte.
# ---------------------------------------------------------------------------
replace_once(
    'noark-assistent/app.mjs',
    '} from "./engine.mjs";\n',
    '} from "./engine.mjs";\nimport { buildDecisionNote } from "./decision-note.mjs";\n',
)
replace_once(
    'noark-assistent/app.mjs',
    '      text: answer.confidence.label,\n      attrs: { title: `Beregnet dekning: ${answer.confidence.score} av 100` },',
    '      text: `${answer.confidence.label} · ${answer.confidence.score}/100`,\n      attrs: { title: "Kildedekning beregnet fra treffstyrke og direkte termtreff. Ikke en sannsynlighet for at svaret er juridisk riktig." },',
)
replace_once(
    'noark-assistent/app.mjs',
    '    element("button", { className: "quiet-button", text: "Kopier svar", attrs: { type: "button", "data-action": "copy-answer" } }),\n    element("button", { className: "quiet-button", text: "Kopier delingslenke", attrs: { type: "button", "data-action": "copy-link" } }),',
    '    element("button", { className: "quiet-button", text: "Kopier svar", attrs: { type: "button", "data-action": "copy-answer" } }),\n    element("button", { className: "quiet-button", text: "Kopier beslutningsnotat", attrs: { type: "button", "data-action": "copy-decision-note" } }),\n    element("button", { className: "quiet-button", text: "Kopier delingslenke", attrs: { type: "button", "data-action": "copy-link" } }),',
)
replace_once(
    'noark-assistent/app.mjs',
    '    if (action?.dataset.action === "copy-link" && state.latestAnswer) {\n      copyText(shareUrl(state.latestAnswer.query), "Delingslenken er kopiert");\n    }',
    '    if (action?.dataset.action === "copy-decision-note" && state.latestAnswer) {\n      copyText(buildDecisionNote(state.latestAnswer), "Beslutningsnotatet er kopiert");\n    }\n    if (action?.dataset.action === "copy-link" && state.latestAnswer) {\n      copyText(shareUrl(state.latestAnswer.query), "Delingslenken er kopiert");\n    }',
)
replace_once(
    'noark-assistent/index.html',
    '<div><p class="eyebrow">Prøv et spørsmål</p><h2 id="suggestions-title">Vanlige problemstillinger</h2></div>',
    '<div><p class="eyebrow">Prøv et spørsmål</p><h2 id="suggestions-title">Beslutningsspørsmål og vanlige problemstillinger</h2></div>',
)
noark_readme = Path('noark-assistent/README.md')
text = noark_readme.read_text(encoding='utf-8')
anchor = '- Setter sammen korte svar bare fra forhåndskontrollerte kildeoppsummeringer.\n'
if anchor in text:
    text = text.replace(anchor, anchor + '- Viser eksplisitt kildedekning og kan kopiere et beslutningsnotat med svar, forbehold og originalkilder.\n', 1)
noark_readme.write_text(text, encoding='utf-8')
package = json.loads(Path('noark-assistent/package.json').read_text(encoding='utf-8'))
package['scripts']['check'] = 'node --check app.mjs && node --check engine.mjs && node --check data.mjs && node --check decision-note.mjs'
Path('noark-assistent/package.json').write_text(json.dumps(package, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


# ---------------------------------------------------------------------------
# Archive Assist: gjør gjennomgang til en eksplisitt kontrollarbeidsflyt.
# ---------------------------------------------------------------------------
replace_once(
    'archive-assist/app.mjs',
    "import { createZip, safeZipPath } from './zip.mjs';\n",
    "import { createZip, safeZipPath } from './zip.mjs';\nimport { buildControlReport, summarizeControl } from './control-report.mjs';\n",
)
replace_once(
    'archive-assist/app.mjs',
    "  duplicateCount: $('#duplicate-count'), editor: $('#metadata-editor'), editorEmpty: $('#editor-empty'),",
    "  duplicateCount: $('#duplicate-count'), controlStatus: $('#control-status'), controlStatusDetail: $('#control-status-detail'), editor: $('#metadata-editor'), editorEmpty: $('#editor-empty'),",
)
replace_once(
    'archive-assist/app.mjs',
    "  zipButton: $('#download-zip'), status: $('#status'), exportNote: $('#export-note'),",
    "  zipButton: $('#download-zip'), reportButton: $('#download-report'), status: $('#status'), exportNote: $('#export-note'),",
)
replace_once(
    'archive-assist/app.mjs',
    "function datedName(extension) {\n  const date = new Date().toISOString().slice(0, 10);\n  return `archive-assist-${date}.${extension}`;\n}\n",
    "function datedName(extension) {\n  const date = new Date().toISOString().slice(0, 10);\n  return `archive-assist-${date}.${extension}`;\n}\n\nconst controlOptions = () => ({ validate: validateMetadata, score: metadataScore, duplicateGroups: duplicateHashes });\n\nfunction exportControlReport() {\n  if (!state.records.length) return;\n  const report = buildControlReport(state.records, controlOptions());\n  download(new Blob([report], { type: 'text/markdown;charset=utf-8' }), `archive-assist-kontrollrapport-${new Date().toISOString().slice(0, 10)}.md`);\n  setStatus('Kontrollrapporten er laget lokalt med status, mangler, tittelkontroll og SHA-256.', 'success');\n}\n",
)
replace_once(
    'archive-assist/app.mjs',
    "  elements.duplicateCount.textContent = String(duplicateHashes(state.records).length);\n  const titleReviews = state.records.filter(record => record.metadata.titleReviewStatus === 'Ikke gjennomgått').length;",
    "  elements.duplicateCount.textContent = String(duplicateHashes(state.records).length);\n  const control = summarizeControl(state.records, controlOptions());\n  elements.controlStatus.textContent = control.status;\n  elements.controlStatus.dataset.ready = String(control.ready);\n  elements.controlStatusDetail.textContent = control.ready\n    ? `${control.averageScore} % utfylling · ${control.duplicates} duplikatgrupper`\n    : `${control.required} obligatoriske mangler · ${control.pendingTitles} titler til kontroll`;\n  const titleReviews = state.records.filter(record => record.metadata.titleReviewStatus === 'Ikke gjennomgått').length;",
)
replace_once(
    'archive-assist/app.mjs',
    '[elements.jsonButton, elements.csvButton, elements.zipButton].forEach(button => { button.disabled = !hasFiles || state.busy; });',
    '[elements.jsonButton, elements.csvButton, elements.zipButton, elements.reportButton].forEach(button => { button.disabled = !hasFiles || state.busy; });',
)
replace_once(
    'archive-assist/app.mjs',
    "elements.csvButton.addEventListener('click', () => download(new Blob([manifestCsv(state.records)], { type: 'text/csv;charset=utf-8' }), datedName('csv')));\nelements.zipButton.addEventListener('click', exportZip);",
    "elements.csvButton.addEventListener('click', () => download(new Blob([manifestCsv(state.records)], { type: 'text/csv;charset=utf-8' }), datedName('csv')));\nelements.reportButton.addEventListener('click', exportControlReport);\nelements.zipButton.addEventListener('click', exportZip);",
)
replace_once(
    'archive-assist/index.html',
    '<article><span>Mulige duplikatgrupper</span><strong id="duplicate-count">0</strong></article>\n      </div>',
    '<article><span>Mulige duplikatgrupper</span><strong id="duplicate-count">0</strong></article>\n        <article class="control-summary"><span>Overføringsstatus</span><strong id="control-status">Tom arbeidsflate</strong><small id="control-status-detail">Legg til filer for kontroll</small></article>\n      </div>',
)
replace_once(
    'archive-assist/index.html',
    '<button id="download-csv" class="button button-secondary" type="button">CSV-manifest</button>\n          <button id="download-zip" class="button button-primary" type="button">Komplett ZIP-pakke</button>',
    '<button id="download-csv" class="button button-secondary" type="button">CSV-manifest</button>\n          <button id="download-report" class="button button-secondary" type="button">Kontrollrapport</button>\n          <button id="download-zip" class="button button-primary" type="button">Komplett ZIP-pakke</button>',
)
replace_once(
    'archive-assist/index.html',
    '<article><span>03</span><h2>Flyttbart resultat</h2><p>Kontrollstatus og forslagsgrunnlag følger med i JSON, CSV og sidecar-metadata sammen med resten av arkivkonteksten.</p></article>\n    </section>',
    '<article><span>03</span><h2>Flyttbart resultat</h2><p>Kontrollstatus og forslagsgrunnlag følger med i JSON, CSV og sidecar-metadata sammen med resten av arkivkonteksten.</p></article>\n      <article><span>04</span><h2>Kontrollspor</h2><p>En egen kontrollrapport oppsummerer tittelgjennomgang, obligatoriske mangler, duplikater og SHA-256 før videre overføring.</p></article>\n    </section>',
)
append_once('archive-assist/styles.css', '/* Kontrollstatus – forbedringsrunde 2026-09 */', '''
/* Kontrollstatus – forbedringsrunde 2026-09 */
.control-summary { min-width: min(100%, 220px); }
.control-summary strong { max-width: 18rem; font-size: clamp(.82rem, 1.5vw, 1.05rem); line-height: 1.15; }
.control-summary strong[data-ready="true"] { color: var(--success, #16785f); }
.control-summary strong[data-ready="false"] { color: var(--warning, #9b6200); }
.control-summary small { display: block; margin-top: .25rem; color: var(--muted); font-size: .7rem; }
''')
archive_readme = Path('archive-assist/README.md')
text = archive_readme.read_text(encoding='utf-8')
anchor = '- Eksport av JSON-manifest, CSV-manifest og ZIP-pakke med dokumenter og JSON-sidecars.\n'
if anchor in text:
    text = text.replace(anchor, anchor + '- Kontrollrapport i Markdown med overføringsstatus, tittelgjennomgang, obligatoriske mangler, duplikater og SHA-256.\n', 1)
archive_readme.write_text(text, encoding='utf-8')
package = json.loads(Path('archive-assist/package.json').read_text(encoding='utf-8'))
package['scripts']['check'] = 'node --check app.mjs && node --check ai.mjs && node --check extract.mjs && node --check engine.mjs && node --check zip.mjs && node --check control-report.mjs'
Path('archive-assist/package.json').write_text(json.dumps(package, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


# ---------------------------------------------------------------------------
# MetaReady: styrt demoflyt og ledelsesnivå på porteføljestyringen.
# ---------------------------------------------------------------------------
replace_once(
    'metaready/app.mjs',
    "import { audit, backlog, catalog, lineage, overview, readiness } from './views.mjs';\n",
    "import { audit, backlog, catalog, lineage, overview, readiness } from './views.mjs';\nimport { buildPortfolioBrief } from './portfolio-brief.mjs';\n",
)
replace_once(
    'metaready/app.mjs',
    "const form=document.querySelector('#asset-form');\nrole.value=state.role;",
    "const form=document.querySelector('#asset-form');\nconst guide=document.querySelector('#demo-guide');\nrole.value=state.role;",
)
replace_once(
    'metaready/app.mjs',
    "function exportBacklog(){const rows=[['Prioritet','Tiltak','Ressurser','Ansvarlig rolle','Status','Begrunnelse'],...state.backlog.map(x=>[priorityScore(x),x.title,x.assetIds.join('; '),x.ownerRole,statusName(x.status),x.reason])];download('metaready-tiltakslogg.csv',rows.map(r=>r.map(csvCell).join(',')).join('\\n'),'text/csv;charset=utf-8');toast('Tiltaksloggen er eksportert.');}\n",
    "function exportBacklog(){const rows=[['Prioritet','Tiltak','Ressurser','Ansvarlig rolle','Status','Begrunnelse'],...state.backlog.map(x=>[priorityScore(x),x.title,x.assetIds.join('; '),x.ownerRole,statusName(x.status),x.reason])];download('metaready-tiltakslogg.csv',rows.map(r=>r.map(csvCell).join(',')).join('\\n'),'text/csv;charset=utf-8');toast('Tiltaksloggen er eksportert.');}\nfunction exportPortfolioBrief(){download('metaready-ledelsesbrief.md',buildPortfolioBrief(state,relationships),'text/markdown;charset=utf-8');addAudit('Eksporterte ledelsesbrief','Informasjonsporteføljen','Porteføljestatus, styringsgap og prioriterte tiltak ble sammenstilt lokalt.');save();toast('Ledelsesbriefen er eksportert.');}\nconst demoSteps={\n  1:{view:'overview',message:'1/6: Start med porteføljebildet og styringsgapene.'},\n  2:{view:'catalog',selectedAssetId:'CW-DOC-002',detailOpen:true,message:'2/6: Åpne Eldre prosedyrearkiv og se manglene med bevis.'},\n  3:{view:'readiness',readinessAssetId:'CW-DOC-002',useCaseId:'rag_assistant',message:'3/6: Vurder samme ressurs som kilde for en RAG-assistent.'},\n  4:{view:'lineage',lineageAssetId:'CW-DOC-001',message:'4/6: Følg relasjoner og se hva en endring kan påvirke.'},\n  5:{view:'backlog',message:'5/6: Se hvordan funn blir prioritert som konkrete tiltak.'},\n  6:{view:'audit',message:'6/6: Avslutt i styringssporet og se hva som er dokumentert.'}\n};\nfunction runDemoStep(step){const config=demoSteps[Number(step)]||demoSteps[1];const {message,...changes}=config;Object.assign(state,changes);save();render();guide.hidden=false;guide.querySelectorAll('[data-step]').forEach(button=>button.classList.toggle('is-current',Number(button.dataset.step)===Number(step)));document.querySelector('#demo-guide-status').textContent=message;toast(message);}\n",
)
replace_once(
    'metaready/app.mjs',
    "  if(action==='export-backlog')exportBacklog();\n  if(action==='reset-demo'&&confirm('Nullstille lokale endringer og gå tilbake til de syntetiske eksempeldataene?'))",
    "  if(action==='export-backlog')exportBacklog();\n  if(action==='portfolio-brief')exportPortfolioBrief();\n  if(action==='guided-demo'){guide.hidden=false;runDemoStep(1);}\n  if(action==='close-guide')guide.hidden=true;\n  if(action==='demo-step')runDemoStep(el.dataset.step);\n  if(action==='reset-demo'&&confirm('Nullstille lokale endringer og gå tilbake til de syntetiske eksempeldataene?'))",
)
replace_once(
    'metaready/index.html',
    '<button class="button button-quiet" type="button" data-action="reset-demo">Nullstill demo</button>',
    '<button class="button button-quiet" type="button" data-action="guided-demo">3-minutters demo</button>\n        <button class="button button-quiet" type="button" data-action="portfolio-brief">Ledelsesbrief</button>\n        <button class="button button-quiet" type="button" data-action="reset-demo">Nullstill demo</button>',
)
replace_once(
    'metaready/index.html',
    '  <div id="toast-region" class="toast-region" aria-live="polite" aria-atomic="true"></div>',
    '''  <section id="demo-guide" class="demo-guide" hidden aria-labelledby="demo-guide-title">
    <div class="demo-guide-head"><div><p class="eyebrow">Styrt demonstrasjon</p><h2 id="demo-guide-title">MetaReady på tre minutter</h2></div><button class="icon-button" type="button" data-action="close-guide" aria-label="Lukk demoguiden">×</button></div>
    <p id="demo-guide-status">Velg et trinn for å se hvordan funn går fra portefølje til styringsspor.</p>
    <ol>
      <li><button type="button" data-action="demo-step" data-step="1"><b>01</b><span>Porteføljebilde</span></button></li>
      <li><button type="button" data-action="demo-step" data-step="2"><b>02</b><span>Dokumenter mangler</span></button></li>
      <li><button type="button" data-action="demo-step" data-step="3"><b>03</b><span>AI-beredskap</span></button></li>
      <li><button type="button" data-action="demo-step" data-step="4"><b>04</b><span>Konsekvens</span></button></li>
      <li><button type="button" data-action="demo-step" data-step="5"><b>05</b><span>Prioriter tiltak</span></button></li>
      <li><button type="button" data-action="demo-step" data-step="6"><b>06</b><span>Styringsspor</span></button></li>
    </ol>
  </section>

  <div id="toast-region" class="toast-region" aria-live="polite" aria-atomic="true"></div>''',
)
append_once('metaready/styles.css', '/* Styrt demo – forbedringsrunde 2026-09 */', '''
/* Styrt demo – forbedringsrunde 2026-09 */
.demo-guide { position: fixed; z-index: 80; right: 1rem; bottom: 1rem; width: min(410px, calc(100vw - 2rem)); padding: 1rem; border: 1px solid var(--line); border-radius: 16px; background: rgba(247,250,252,.98); box-shadow: 0 24px 70px rgba(11,35,57,.22); }
.demo-guide-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
.demo-guide h2 { margin: .15rem 0 .45rem; font-size: 1.2rem; }
.demo-guide > p { margin: .2rem 0 .8rem; color: var(--muted); font-size: .82rem; line-height: 1.45; }
.demo-guide ol { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: .45rem; margin: 0; padding: 0; list-style: none; }
.demo-guide li button { width: 100%; min-height: 48px; display: flex; align-items: center; gap: .55rem; padding: .55rem .65rem; border: 1px solid var(--line); border-radius: 10px; background: white; color: var(--ink); text-align: left; cursor: pointer; }
.demo-guide li button b { color: var(--teal); font: 800 .7rem/1 ui-monospace, monospace; }
.demo-guide li button span { font-size: .75rem; font-weight: 700; }
.demo-guide li button.is-current { border-color: var(--teal); box-shadow: inset 0 0 0 1px var(--teal); background: var(--teal-soft); }
@media (max-width: 620px) { .demo-guide ol { grid-template-columns: 1fr; } }
''')
meta_readme = Path('metaready/README.md')
text = meta_readme.read_text(encoding='utf-8')
anchor = '- Eksport av styringsnotat i Markdown og tiltak i CSV.\n'
if anchor in text:
    text = text.replace(anchor, anchor + '- Styrt treminutters demoflyt og ledelsesbrief for hele informasjonsporteføljen.\n', 1)
meta_readme.write_text(text, encoding='utf-8')
package = json.loads(Path('metaready/package.json').read_text(encoding='utf-8'))
package['scripts']['check'] = 'node --check app.mjs && node --check engine.mjs && node --check views.mjs && node --check portfolio-brief.mjs'
Path('metaready/package.json').write_text(json.dumps(package, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


# ---------------------------------------------------------------------------
# Brukerstøttejakten: mindre fagavbrudd, separat musikk og tryggere lysbruk.
# ---------------------------------------------------------------------------
replace_once('brukerstottejakten/game-core.js', 'export const QUIZ_TRIGGER_PROBABILITY = 0.3;', 'export const QUIZ_TRIGGER_PROBABILITY = 0.15;')
replace_once(
    'brukerstottejakten/tests/game-core.test.mjs',
    "test('quizgrensen er nøyaktig tretti prosent', () => {\n  assert.equal(QUIZ_TRIGGER_PROBABILITY, 0.3);\n  assert.equal(shouldTriggerQuiz(true, 0), true);\n  assert.equal(shouldTriggerQuiz(true, 0.299999), true);\n  assert.equal(shouldTriggerQuiz(true, 0.3), false);",
    "test('quizgrensen er nøyaktig femten prosent', () => {\n  assert.equal(QUIZ_TRIGGER_PROBABILITY, 0.15);\n  assert.equal(shouldTriggerQuiz(true, 0), true);\n  assert.equal(shouldTriggerQuiz(true, 0.149999), true);\n  assert.equal(shouldTriggerQuiz(true, 0.15), false);",
)
replace_once(
    'brukerstottejakten/index.html',
    '<button class="utility-button" id="soundButton" type="button" aria-pressed="true"><span aria-hidden="true">◕</span><b>Lyd</b></button>',
    '<button class="utility-button" id="soundButton" type="button" aria-pressed="true"><span aria-hidden="true">◕</span><b>Lyd</b></button>\n        <button class="utility-button" id="musicButton" type="button" aria-pressed="true"><span aria-hidden="true">♫</span><b>Musikk</b></button>',
)
replace_once(
    'brukerstottejakten/index.html',
    '<article><b>30 %</b><span>Noark-sjanse</span><small>På hvert løste mål</small></article>',
    '<article><b>15 %</b><span>Noark-sjanse</span><small>Færre avbrudd i spillflyten</small></article>',
)
replace_once(
    'brukerstottejakten/index.html',
    '<div class="quiz-header"><span class="quiz-chip">NOARK 5 · FAGLIG KONTROLLPUNKT</span><b id="quizNumber">01</b></div>\n          <p class="kicker">To valg. Ett svar.</p>',
    '<div class="quiz-header"><span class="quiz-chip">NOARK 5 · FAGSPØRSMÅL</span><b id="quizNumber">01</b></div>\n          <p class="kicker">Faglig kontrollpunkt · Noark 5 · to valg, ett svar</p>',
)
replace_once(
    'brukerstottejakten/game.js',
    "  soundButton: document.querySelector('#soundButton'),\n  fullscreenButton: document.querySelector('#fullscreenButton'),",
    "  soundButton: document.querySelector('#soundButton'),\n  musicButton: document.querySelector('#musicButton'),\n  fullscreenButton: document.querySelector('#fullscreenButton'),",
)
replace_once(
    'brukerstottejakten/game.js',
    '    this.enabled = true;\n    this.context = null;',
    '    this.enabled = true;\n    this.musicEnabled = true;\n    this.context = null;',
)
replace_once(
    'brukerstottejakten/game.js',
    '    if (!this.enabled || this.ambientTimer) return;',
    '    if (!this.enabled || !this.musicEnabled || this.ambientTimer) return;',
)
replace_once(
    'brukerstottejakten/game.js',
    "      if (!this.enabled || state.status !== 'running' || paused || quizActive || intermissionActive) return;",
    "      if (!this.enabled || !this.musicEnabled || state.status !== 'running' || paused || quizActive || intermissionActive) return;",
)
replace_once(
    'brukerstottejakten/game.js',
    '  stopAmbient() {\n    if (this.ambientTimer) window.clearInterval(this.ambientTimer);\n    this.ambientTimer = 0;\n  }\n\n  setEnabled(enabled) {',
    '  stopAmbient() {\n    if (this.ambientTimer) window.clearInterval(this.ambientTimer);\n    this.ambientTimer = 0;\n  }\n\n  setMusicEnabled(enabled) {\n    this.musicEnabled = Boolean(enabled);\n    if (!this.musicEnabled) this.stopAmbient();\n    else if (this.enabled) this.startAmbient();\n  }\n\n  setEnabled(enabled) {',
)
replace_once(
    'brukerstottejakten/game.js',
    "ui.soundButton.addEventListener('click', () => {\n  sound.setEnabled(!sound.enabled);\n  ui.soundButton.setAttribute('aria-pressed', String(sound.enabled));\n  ui.soundButton.querySelector('b').textContent = sound.enabled ? 'Lyd' : 'Lyd av';\n});",
    "ui.soundButton.addEventListener('click', () => {\n  sound.setEnabled(!sound.enabled);\n  ui.soundButton.setAttribute('aria-pressed', String(sound.enabled));\n  ui.soundButton.querySelector('b').textContent = sound.enabled ? 'Lyd' : 'Lyd av';\n});\nui.musicButton.addEventListener('click', () => {\n  sound.setMusicEnabled(!sound.musicEnabled);\n  ui.musicButton.setAttribute('aria-pressed', String(sound.musicEnabled));\n  ui.musicButton.querySelector('b').textContent = sound.musicEnabled ? 'Musikk' : 'Musikk av';\n});",
)
replace_once('brukerstottejakten/game.js', 'Brukerstøttejakten 4.0 — ${finalSnapshot.dailyCode}', 'Brukerstøttejakten 4.1 — ${finalSnapshot.dailyCode}')
replace_once('brukerstottejakten/game.js', "title: 'Brukerstøttejakten 4.0'", "title: 'Brukerstøttejakten 4.1'")
append_once('brukerstottejakten/styles.css', '/* Visuell sikkerhet – ingen blinkende spillfeedback */', '''
/* Visuell sikkerhet – ingen blinkende spillfeedback */
.muzzle-flash { display: none !important; }
.brand-mark::after { animation: none !important; left: 8px; opacity: .08; }
.radar-sweep { animation: none !important; opacity: .12; transform: rotate(-24deg); }
.combo-cell.is-hot { animation: none !important; transform: none !important; }
.boss-banner.is-visible { animation: none !important; opacity: 1; filter: none; transform: translate(-50%, -50%) scale(1); }
.gun-core i { animation-duration: 16s !important; }
@media (max-width: 720px) {
  #musicButton b, #soundButton b { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
}
''')
game_readme = Path('brukerstottejakten/README.md')
text = game_readme.read_text(encoding='utf-8').replace('30 %', '15 %')
if 'Musikk og lydeffekter' not in text:
    text += '\n## Tilgjengelighet og lyd\n\n- Musikk og lydeffekter kan styres separat.\n- Munningsglimt, radarsveip og annen unødvendig blinkende feedback er fjernet.\n- `prefers-reduced-motion` slår av animasjoner og overganger.\n'
game_readme.write_text(text, encoding='utf-8')


# ---------------------------------------------------------------------------
# Prosjektforsiden og topp-README: korrekt, mer senior og mer sammenhengende.
# ---------------------------------------------------------------------------
replace_once(
    'site/index.html',
    'Her ligger noen prosjekter fra 2026. De handler om arkivkrav, metadata, informasjonskvalitet og to små nettleserspill.',
    'Her ligger testede digitale produkter fra 2026 innen arkivkrav, dokumentanalyse, informasjonskvalitet, AI-beredskap og interaktive systemer. Fellesnevneren er å gjøre faglogikk om til verktøy folk faktisk kan bruke.',
)
replace_once('site/index.html', '<strong>13</strong><span>automatiske tester</span>', '<strong>15</strong><span>automatiske tester</span>')
replace_once(
    'site/index.html',
    '<ul class="compact-facts"><li>PDF, Office, e-post og tekst</li><li>Lokal AI der støttet</li><li>27 automatiske tester</li></ul>',
    '<ul class="compact-facts"><li>Kontrollrapport og eksportspor</li><li>Lokal AI der støttet</li><li>30 automatiske tester</li></ul>',
)
replace_once(
    'site/index.html',
    '<ul class="compact-facts"><li>24 sammenkoblede ressurser</li><li>12 forklarbare regler</li><li>Lokal lagring og eksport</li></ul>',
    '<ul class="compact-facts"><li>24 sammenkoblede ressurser</li><li>12 forklarbare regler</li><li>Ledelsesbrief og styringsspor</li></ul>',
)
replace_once('site/index.html', '<span class="label">WebGL-nettleserspill</span>', '<span class="label">Interaktivt nettleserspill</span>')
replace_once(
    'site/index.html',
    'Et påkostet Duck Hunt-inspirert arkadespill med ekte WebGL-dybde, dynamisk lys og en intern IT-vri. Lukk flyvende «Brukerstøttesaker» med Service Manager, bestå tilfeldige Noark 5-kontroller og håndter den avsluttende hovedhendelsen.',
    'Et påkostet Duck Hunt-inspirert kaffepausespill med ti nivåer, 80 saker, dybdemotor, moduloppgraderinger og en intern IT-vri. Lukk «Brukerstøttesaker» med Service Manager Mk V og avslutt med en flerfaset hovedhendelse.',
)
replace_once(
    'site/index.html',
    '<ul class="compact-facts"><li>Ekte WebGL med Canvas-reserve</li><li>Mus, berøring og tastatur</li><li>15 automatiske tester</li></ul>',
    '<ul class="compact-facts"><li>10 nivåer · 80 saker</li><li>Mus, berøring og tastatur</li><li>22 automatiske tester</li></ul>',
)
replace_once('site/index.html', '<small>7 av 10</small>', '<small>42 av 80</small>')

readme = Path('README.md')
text = readme.read_text(encoding='utf-8')
text = text.replace(
    '**Hovedinngangen til mine nyeste nettleserapper, AI-prototyper og verktøy for informasjons- og dokumentasjonsforvaltning.**',
    '**Testede digitale produkter i skjæringspunktet mellom dokumentasjonsforvaltning, informasjonsstyring, AI-beredskap og systemforvaltning.**',
)
text = text.replace('- 13 automatiske domenetester.\n', '- 15 automatiske domenetester, inkludert beslutningsnotatet.\n', 1)
archive_anchor = '- SHA-256, kvalitetskontroll og eksport til JSON, CSV og ZIP.\n'
if archive_anchor in text:
    text = text.replace(archive_anchor, archive_anchor + '- Egen kontrollrapport med overføringsstatus, tittelgjennomgang, mangler og duplikater.\n', 1)
meta_anchor = 'MetaReady samler metadata, eierskap, proveniens, sensitivitet, livsløp, relasjoner og kvalitet. Mangler blir gjort om til konkrete tiltak.\n'
if meta_anchor in text:
    text = text.replace(meta_anchor, meta_anchor + '\nDemoen har en styrt treminutters gjennomgang og kan eksportere en ledelsesbrief for hele informasjonsporteføljen.\n', 1)
old_game = 'De flyvende målene er små mursteinsaktige «Brukerstøttesaker». Våpenet heter Service Manager, og etter ti treff fylles måleren helt opp: spilleren blir årets ansatt. Spillet virker med mus, berøring og tastatur og bruker ingen eksterne ressurser.'
new_game = 'Et femminutters kaffepausespill med 10 nivåer og 80 saker. Service Manager Mk V bygges ut med moduler underveis; skjermede saker og hovedhendelsen tåler flere treff. Noark 5-spørsmål dukker opp sjeldnere, og musikk/lydeffekter kan styres separat. Unødvendig blinkende feedback er fjernet.'
if old_game in text:
    text = text.replace(old_game, new_game, 1)
readme.write_text(text, encoding='utf-8')
