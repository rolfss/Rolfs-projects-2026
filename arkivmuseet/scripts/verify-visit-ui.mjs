import {chromium,devices} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const url=process.env.MUSEUM_URL||'http://127.0.0.1:4196/Rolfs-projects-2026/arkivmuseet/';
const out=process.env.MUSEUM_QA_DIR||'qa-visit';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.MUSEUM_CHROME||undefined,
  headless:process.env.MUSEUM_HEADED!=='1',
  args:['--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
const checks=[],errors=[];
const check=(condition,name)=>{assert.ok(condition,name);checks.push(name);console.log('PASS: '+name);};
const enter=async page=>{
  await page.goto(url);
  await page.waitForFunction(()=>!document.querySelector('#enter')?.disabled,null,{timeout:60000});
  await page.locator('#enter').click();
};
const observe=page=>page.on('pageerror',error=>errors.push(error.message));
const unobstructed=page=>page.evaluate(()=>[[.5,.4],[.5,.55],[.75,.5]].every(([x,y])=>
  document.elementFromPoint(innerWidth*x,innerHeight*y)?.id==='world'));

try {
  const page=await browser.newPage({...devices['Pixel 7'],viewport:{width:390,height:760},reducedMotion:'reduce'});
  observe(page);await enter(page);
  check(await page.locator('#visit-details').isHidden(),'The visit plan is collapsed on arrival');
  check(await page.locator('#case17-open').isHidden(),'Optional investigation does not crowd the main navigation');
  check(await page.locator('#toolbar button').count()===3,'The main toolbar contains only three controls');
  check(!(await page.locator('body').innerText()).includes('Sak 17'),'The public HUD has no unexplained case number');
  check(await page.locator('#audio-toggle').getAttribute('aria-pressed')==='false','The quieter arrival does not enable sound');

  for(const [width,height,scale] of [[390,760,'1'],[360,640,'1'],[320,568,'1.3'],[430,932,'1'],[844,390,'1']]) {
    const tag=`${width}x${height}-${scale}`;
    await page.setViewportSize({width,height});
    // Chromium delivers the resize event asynchronously. Measure the rendered
    // viewport, not the preceding canvas size during a synthetic orientation change.
    await page.waitForFunction(() => {
      const rect=document.querySelector('#world').getBoundingClientRect();
      return Math.abs(rect.width-innerWidth)<1 && Math.abs(rect.height-innerHeight)<1;
    });
    await page.evaluate(scale=>document.documentElement.style.setProperty('--text-scale',scale),scale);
    const hud=await page.locator('.journey-hud').boundingBox();
    const toolbar=await page.locator('.masthead').boundingBox();
    const controls=await page.locator('#touch-controls').boundingBox();
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),tag+': no horizontal overflow');
    check(hud.height<=84,tag+': the closed dock is compact, including larger text');
    check(hud.y+hud.height<=height-8&&hud.x>=8&&hud.x+hud.width<=width-8,tag+': dock stays inside the viewport');
    const separate=controls.x+controls.width<=hud.x||controls.y+controls.height<=hud.y;
    check(separate,tag+': movement controls and dock do not overlap');
    check(await unobstructed(page),tag+': the centre of the museum remains directly touchable');
    const targets=await page.locator('#toolbar button:visible,.visit-dock button:visible,#touch-controls button:visible').evaluateAll(buttons=>buttons.map(b=>{const r=b.getBoundingClientRect();return [r.width,r.height];}));
    check(targets.every(([w,h])=>w>=44&&h>=44),tag+': navigation targets remain at least 44 by 44');
    await page.screenshot({path:`${out}/hall-${tag}.png`});
    await page.locator('#visit-toggle').click();
    const expanded=await page.locator('.journey-hud').boundingBox();
    check(expanded.y>=toolbar.y+toolbar.height+4&&expanded.y+expanded.height<=height-8,tag+': expanded plan does not cover the toolbar or leave the viewport');
    check(await page.locator('#touch-controls').evaluate(e=>e.inert),tag+': obscured movement controls are not focusable');
    await page.screenshot({path:`${out}/plan-${tag}.png`});
    await page.keyboard.press('Escape');
    check(await page.locator('#visit-details').isHidden()&&await page.locator('#dialog').isHidden(),tag+': Escape closes just the disclosure');
    check(await page.locator('#visit-toggle').evaluate(e=>e===document.activeElement),tag+': Escape restores visible keyboard focus');
  }

  await page.setViewportSize({width:390,height:760});
  await page.locator('#visit-toggle').click();
  await page.locator('#case17-open').click();
  check(await page.locator('#dialog-title').innerText()==='Det manglende grunnlaget','The optional experience has a meaningful title');
  check((await page.locator('.case17-cover').innerText()).includes('uavhengige av etterforskningen'),'The investigation explains its independence from the museum visit');
  await page.locator('#dialog-close').click();
  check(await page.locator('#visit-toggle').evaluate(e=>e===document.activeElement),'Closing the investigation does not focus a hidden button');
  await page.locator('#continue-journey').click();
  check(await page.locator('#case-sources').isVisible(),'A room opens with the real exhibition, not an unexplained fictional task');
  await page.locator('#return-mission').click();
  check(await page.locator('#check-evidence').isVisible(),'The visitor explicitly chooses the leadership exercise');
  await page.locator('#mission-read').click();
  check(await page.locator('#case-sources').isVisible(),'The real exhibition remains one click from the exercise');
  for(let i=0;i<5;i++) await page.locator('#next-exhibition').click();
  check(await page.locator('#leader-plan').isVisible(),'Reading-only visitors can reach the practical ending without quiz completion');
  check(!(await page.locator('#leader-extras').getAttribute('open'))&&await page.locator('[data-choice="0"]').isHidden(),'The extra scenarios are optional, not a barrier to finishing');
  await page.screenshot({path:out+'/leader-ending-mobile.png'});
  await page.locator('#leader-plan').click();
  check(await page.locator('#action-plan').isVisible(),'The ending offers an actionable takeaway');
  await page.close();

  const desktop=await browser.newPage({viewport:{width:1440,height:960},reducedMotion:'reduce'});
  observe(desktop);await enter(desktop);
  check(await desktop.locator('.journey-hud').evaluate(e=>e.getBoundingClientRect().height<=84),'Desktop also starts with a quiet, collapsed dock');
  check(await desktop.locator('.room-tag').evaluate(e=>getComputedStyle(e).animationName==='none'),'Reduced motion suppresses the new arrival animation');
  await desktop.screenshot({path:out+'/hall-desktop.png'});
  await desktop.locator('#visit-toggle').focus();await desktop.keyboard.press('Space');
  check(await desktop.locator('#visit-toggle').getAttribute('aria-expanded')==='true','Space operates the visit disclosure');
  await desktop.locator('#home').focus();await desktop.keyboard.press('Escape');
  check(await desktop.locator('#visit-toggle').evaluate(e=>e===document.activeElement),'Escape also restores focus from inside the plan');
  await desktop.locator('#passport-open').click();await desktop.locator('[data-passport="osen"]').click();
  check(await desktop.locator('#check-evidence').isVisible(),'The exercise overview opens the explicitly selected exercise');
  await desktop.locator('#story-close').click();
  await desktop.locator('#menu-open').click();await desktop.locator('#menu-investigation').click();
  check(await desktop.locator('.case17-cover').isVisible(),'The optional investigation remains available through the menu');
  await desktop.close();

  const legacy=await browser.newPage({viewport:{width:390,height:760},reducedMotion:'reduce'});
  observe(legacy);
  await legacy.addInitScript(()=>localStorage.setItem('arkivmuseet-case17-v1',JSON.stringify({version:1,started:true,found:['e1','e2'],triage:{t1:'capture'},crisis:[1,0,null,null,null,null]})));
  await enter(legacy);await legacy.locator('#menu-open').click();await legacy.locator('#menu-investigation').click();
  check(await legacy.evaluate(()=>window.museumCaseDiagnostics().found.length===2),'Legacy evidence survives the interface rename');
  await legacy.close();

  check(errors.length===0,'The new visit flow produces no JavaScript exceptions');
  await writeFile(out+'/results.json',JSON.stringify({checked:new Date().toISOString(),passed:checks.length,checks,errors},null,2));
  console.log(JSON.stringify({passed:checks.length,errors}));
} catch(error) {
  await writeFile(out+'/failure.json',JSON.stringify({message:String(error),checks,errors},null,2));
  let i=0;for(const context of browser.contexts())for(const page of context.pages())await page.screenshot({path:`${out}/failure-${++i}.png`,timeout:5000}).catch(()=>{});
  throw error;
} finally {await browser.close();}
