import {chromium, devices} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir, writeFile, readFile} from 'node:fs/promises';
const url=process.env.MUSEUM_URL||'http://127.0.0.1:4196/Rolfs-projects-2026/arkivmuseet/';
const out=process.env.MUSEUM_QA_DIR||'qa-investigation';await mkdir(out,{recursive:true});
const data=JSON.parse(await readFile(new URL('../cases/investigation.json',import.meta.url)));
const browser=await chromium.launch({executablePath:process.env.MUSEUM_CHROME||undefined,headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
const checks=[],errors=[],missing=[];
const check=(value,name)=>{assert.ok(value,name);checks.push(name);};
const diagnostics=p=>p.evaluate(()=>window.museumCaseDiagnostics());
const action=(p,a,v)=>p.locator(`[data-c17="${a}"]${v!==undefined?`[data-value="${v}"]`:''}`).first();
async function enter(p){await p.goto(url);await p.locator('#case17-open').waitFor({state:'attached'});await p.waitForFunction(()=>!document.querySelector('#enter').disabled);await p.locator('#enter').click();}
try{
 const page=await browser.newPage({viewport:{width:1440,height:960},reducedMotion:'reduce'});
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith(url)&&r.status()>=400)missing.push(r.url());});
 await enter(page);check(await page.locator('#story').isHidden(),'Hall entry remains unobstructed');
 check((await diagnostics(page)).scenery,'Physical investigation desks and memory installation are attached');
 await page.screenshot({path:out+'/01-hall.png'});
 await page.locator('#case17-open').click();await action(page,'start').click();
 for(const room of data.rooms){
  await action(page,'room',room.id).click();
  for(const e of data.evidence.filter(e=>e.room===room.id)){
   await action(page,'evidence',e.id).click();check((await page.locator('.case17-document').innerText()).includes(e.title),'Evidence document opens: '+e.id);
   if(e.id==='e1')await page.screenshot({path:out+'/02-evidence.png'});
   await action(page,'collect',e.id).click();
  }
  await action(page,'board').click();
 }
 check((await diagnostics(page)).found.length===10,'All ten evidence items are collectible');
 await page.screenshot({path:out+'/03-board.png'});
 await action(page,'triage').click();
 for(let i=0;i<data.triage.length;i++){await action(page,'classify',data.triage[i].answer).click();check(await page.locator('.case17-feedback.is-correct').count()===1,'Triage accepts correct reasoning '+(i+1));await action(page,'triage-next').click();}
 for(let i=0;i<data.access.length;i++){
  const card=data.access[i];
  if(card.answer==='redact'){
   await action(page,'disclose','redact').click();check(await page.locator('.case17-feedback.is-correct').count()===0,'Redaction choice alone does not complete '+card.id);
   await action(page,'redaction',card.id).click();check((await action(page,'redaction',card.id).getAttribute('aria-pressed'))==='true','Redaction is keyboard-operable and reflected '+card.id);
  }else await action(page,'disclose',card.answer).click();
  check(await page.locator('.case17-feedback.is-correct').count()===1,'Access review completed '+card.id);
  if(i===1)await page.screenshot({path:out+'/04-redaction.png'});
  await action(page,'access-next').click();
 }
 check(!(await diagnostics(page)).running,'Time pressure defaults to off');
 await action(page,'clock').click();await page.waitForTimeout(350);check((await diagnostics(page)).running,'The optional timer starts on explicit action');
 await page.locator('#dialog-close').click();check(!(await diagnostics(page)).running,'Closing the dialogue pauses the timer');
 await page.locator('#case17-open').click();await action(page,'crisis').click();
 for(let i=0;i<6;i++){await action(page,'decision','1').click();await action(page,'crisis-next').click();}
 await action(page,'conclude','0').click();check(!(await diagnostics(page)).summary.complete,'Unsupported conclusion cannot complete the investigation');
 await action(page,'conclude','1').click();check((await diagnostics(page)).summary.complete,'Full investigation reaches its supported ending');
 await page.screenshot({path:out+'/05-ending.png'});
 await action(page,'board').click();await page.locator('summary').filter({hasText:'Små spor'}).click();await action(page,'secret').click();await action(page,'keep-secret').click();
 await page.locator('#dialog-close').click();await page.reload();await page.waitForFunction(()=>window.museumCaseDiagnostics);
 check((await diagnostics(page)).summary.complete,'Evidence, casework and choices survive reload');
 await page.locator('#enter').click();await page.locator('#case17-open').click();await action(page,'room','osen').click();await action(page,'real','osen').click();
 check(await page.locator('#case-sources').isVisible(),'The real case and its sources remain independently accessible');
 await page.locator('#case-sources').click();check(await page.locator('#dialog-body .source a').count()>=2,'Original primary-source links are retained');
 await page.locator('#dialog-close').click();await page.locator('#story-close').click();
 // Key F opens the same room investigation, rather than an inaccessible pointer-only easter egg.
 await page.locator('#world').focus();await page.keyboard.press('KeyF');check(await page.locator('.case17-evidence-list').isVisible(),'Keyboard F opens the nearby desk');await page.locator('#dialog-close').click();
 await page.locator('#home').click();await page.screenshot({path:out+'/06-hall-restored.png'});
 const mobile=await browser.newPage({...devices['Pixel 7'],viewport:{width:390,height:844},reducedMotion:'reduce'});
 mobile.on('pageerror',e=>errors.push('mobile: '+e.message));await enter(mobile);await mobile.locator('#case17-open').click();await action(mobile,'start').click();
 check(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile board has no horizontal overflow');await mobile.screenshot({path:out+'/07-mobile-board.png'});
 await action(mobile,'access').click();await action(mobile,'access-next').click();await action(mobile,'redaction','a2').click();await mobile.screenshot({path:out+'/08-mobile-redaction.png'});
 await mobile.setViewportSize({width:320,height:700});check(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'320px layout has no horizontal overflow');
 await mobile.evaluate(()=>document.documentElement.style.setProperty('--text-scale','1.3'));check(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Enlarged mobile text has no horizontal overflow');
 await mobile.keyboard.press('Escape');check(await mobile.locator('#dialog').isHidden(),'Escape closes the investigation');
 const flat=await browser.newPage({viewport:{width:390,height:844}});await flat.goto(url);await flat.locator('#flat-enter').click();await flat.locator('#case17-open').click();await action(flat,'start').click();await action(flat,'room','tokke').click();check(await flat.locator('.case17-evidence-list').isVisible(),'Investigation works in the non-3D mode');
 const privatePage=await browser.newPage();await privatePage.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new DOMException('Blocked','SecurityError')};Storage.prototype.setItem=()=>{throw new DOMException('Blocked','QuotaExceededError')};});
 await privatePage.goto(url);await privatePage.locator('#flat-enter').click();await privatePage.locator('#case17-open').click();check(await privatePage.locator('.case17-warning').isVisible(),'Storage failure is disclosed without blocking play');
 const text=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:844}});const textResponse=await text.goto(url+'sak17.html');check(textResponse.ok(),'No-JavaScript investigation text is deployed');check(await text.locator('article').count()===26,'All 10 evidence, 6 triage, 4 access and 6 decision items have a text equivalent');
 check(errors.length===0,'No JavaScript exceptions');check(missing.length===0,'No missing investigation assets');
 await writeFile(out+'/results.json',JSON.stringify({checked:new Date().toISOString(),checks,errors,missing},null,2));console.log(JSON.stringify({passed:checks.length,errors,missing}));
}finally{await browser.close();}
