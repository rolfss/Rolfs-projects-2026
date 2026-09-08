import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {roomStories,finalQuiz} from '../src/room-stories.ts';
const missions=JSON.parse(await readFile(new URL('../cases/missions.json',import.meta.url),'utf8'));
const out='experience-artifacts';await mkdir(out,{recursive:true});
const url=process.env.MUSEUM_URL||'http://127.0.0.1:4196/Rolfs-projects-2026/arkivmuseet/';
const server=process.env.MUSEUM_URL?null:spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4196','--strictPort'],{stdio:'pipe'});
const errors=[],requests=[],checks=[],shots=[];let page,browser;
const check=(value,message)=>{assert.ok(value,message);checks.push(message);};
// Freeze the already-rendered canvas during capture. Software WebGL otherwise
// competes with Chromium's screenshot compositor on shared CI runners.
const snap=async(name)=>{const path=`${out}/${name}.png`;await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,value:true}));try{await page.screenshot({path,fullPage:false,animations:'disabled',timeout:60000});shots.push(path);}finally{await page.evaluate(()=>{delete document.hidden;});}};
const progress=async(id)=>page.evaluate(id=>JSON.parse(localStorage.getItem('arkivmuseet-narrative-v2')).rooms[id],id);
async function enter(flat=false){await page.goto(url);if(flat)await page.locator('#flat-enter').click();else{await page.locator('#guided:not([disabled])').waitFor({timeout:90000});await page.locator('#guided').click();}if(await page.locator('#gallery-next').count())await page.locator('#gallery-next').click();await page.locator('#mission-title').waitFor();}
async function openRoom(id){await page.locator('#map-open').click();await page.locator(`[data-room="${id}"]`).click();if(id!=='leader')await page.locator('#gallery-next').click();await page.locator('#mission-title').waitFor();}
async function noOverflow(label){check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+' has no page overflow');check(await page.locator('#story').evaluate(e=>e.scrollWidth<=e.clientWidth+1),label+' has no panel overflow');const r=await page.locator('#story-nav').boundingBox();check(r&&r.y>=0&&r.y+r.height<=(await page.viewportSize()).height+1,label+' keeps navigation on screen');}
try{
 for(let i=0;i<80;i++){try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,250));}
 browser=await chromium.launch({executablePath:process.env.MUSEUM_CHROME||undefined,headless:true,args:['--disable-dev-shm-usage','--enable-webgl','--ignore-gpu-blocklist','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});page=await context.newPage();await page.addInitScript(()=>{if(!localStorage.getItem('arkivmuseet-preferences'))localStorage.setItem('arkivmuseet-preferences',JSON.stringify({reduced:true,quality:.75}));});
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith(url)&&r.status()>=400)requests.push(`${r.status()} ${r.url()}`);});
 await enter();await writeFile(out+'/initial-diagnostics.json',JSON.stringify(await page.evaluate(()=>window.museumDiagnostics()),null,2));check((await page.evaluate(()=>window.museumDiagnostics())).triangles>30000,'3D museum renders actual geometry');await snap('01-room-story');
 await openRoom('leader');check((await page.locator('#story-content').innerText()).includes('0 av 5'),'Final room is locked before the five room quizzes');
 for(const [index,s] of roomStories.entries()){
  await openRoom(s.id);check((await page.locator('#mission-title').innerText())===s.title,`${s.id}: coherent opening is the default route`);await page.locator('#step-next').click();
  const wrong=s.tools.find(t=>t.id!==s.solution[0]);await page.locator(`[data-tool="${wrong.id}"]`).click();check((await progress(s.id)).investigation.length===0,`${s.id}: wrong probe cannot advance`);check(await page.locator('#step-next').isDisabled(),`${s.id}: investigation is required`);
  for(const [i,id] of s.solution.entries()){
   if(s.id==='osen'&&id==='search'){await page.locator('#journal-query').fill('ukjent');await page.locator('[data-tool="search"]').click();check((await progress(s.id)).investigation.length===2,'Osen requires a matching typed search');await page.locator('#journal-query').fill('skole');}
   await page.locator(`[data-tool="${id}"]`).click();check((await progress(s.id)).investigation.length===i+1,`${s.id}: visual probe ${id} recorded`);
   if(s.id==='tokke'&&i===0){await enter();check((await progress(s.id)).investigation.length===1,'Partial investigation survives reload');}
  }
  await page.locator('.chapter-scene').scrollIntoViewIfNeeded();await snap(`${index+2}-${s.id}-solved`);
  await page.waitForFunction(id=>window.museumDiagnostics().chapters.some(c=>c.id==='chapter-installation-'+id&&c.stage?.steps>0),s.id,{timeout:15000});checks.push(`${s.id}: physical 3D exhibit reflects player input`);
  await page.locator('#step-next').click();const m=missions.find(m=>m.id===s.id);
  for(const [choice,option] of m.options.entries())if(!option.protected){await page.locator(`[data-decision="${choice}"]`).click();await page.locator('#step-next').click();await page.locator('#step-next').click();check((await progress(s.id)).phase===3,`${s.id}: weak choice ${choice} shows its full consequences without awarding a badge`);await page.locator('#step-next').click();check((await progress(s.id)).phase===2,`${s.id}: retry is available without restarting the investigation`);}
  await page.locator(`[data-decision="${m.options.findIndex(o=>o.protected)}"]`).click();await page.locator('#step-next').click();await page.locator('#step-next').click();check(await page.locator('.room-moral').isVisible(),`${s.id}: the moral is explicit`);await page.locator('#step-next').click();
  for(const [qi,q] of s.quiz.entries()){
   await page.locator(`[data-answer="${(q.answer+1)%3}"]`).click();check(await page.locator('#step-next').isDisabled(),`${s.id}: question ${qi+1} requires understanding, not Next`);check((await page.locator('.room-feedback').innerText()).includes(q.feedback[(q.answer+1)%3]),`${s.id}: wrong answer explains why`);
   await page.locator(`[data-answer="${q.answer}"]`).click();await page.locator('#step-next').click();
  }
  check((await progress(s.id)).phase===5,`${s.id}: the earned badge follows both correct answers`);await noOverflow(`${s.id} desktop`);if(index===0){await snap('earned-first-key');await page.locator('#room-add').click();}
 }
 check((await page.locator('#passport-open').innerText()).includes('5 / 5'),'All five badges are counted exactly once');
 await enter();check((await page.locator('#story-content').innerText()).includes('SLUTTOPPDRAG'),'All five badges resume into the unlocked final room');
 await page.locator('[data-final-answer="0"]').click();check(!(await page.locator('#mission-title').innerText()).includes('løfte'),'Wrong final answer does not finish the museum');
 await page.locator(`[data-final-answer="${finalQuiz[0].answer}"]`).click();await page.locator(`[data-final-answer="${finalQuiz[1].answer}"]`).click();check((await page.locator('#mission-title').innerText()).includes('løfte'),'Final synthesis completes the six-room journey');await snap('finale');
 await page.locator('#final-next').click();await page.locator('[data-owner="osen"]').fill('Sakseier');await page.locator('[data-due="osen"]').fill('2026-10-01');const download=page.waitForEvent('download');await page.locator('#download-plan').click();check((await download).suggestedFilename().endsWith('.txt'),'The final action plan downloads');await page.locator('#dialog-close').click();
 await openRoom('osen');check((await progress('osen')).phase===5,'Revisiting a room preserves its badge');await page.locator('#case-recap').click();check((await page.locator('#dialog-body').innerText()).includes(roomStories[0].moral),'The coherent historical story remains available after completion');await page.keyboard.press('Escape');
 await page.locator('#room-sources').click();check(await page.locator('#dialog a[target="_blank"]').count()>0,'Primary sources remain accessible');await page.locator('#dialog-close').click();
 await page.locator('#gallery-open').click();check(await page.locator('#dialog img').count()>4,'Authentic gallery images remain accessible');await page.locator('#dialog-close').click();
 for(const size of [{width:390,height:844},{width:320,height:568},{width:800,height:700}]){
  await page.setViewportSize(size);await page.evaluate(()=>{localStorage.removeItem('arkivmuseet-narrative-v2');localStorage.setItem('arkivmuseet-preferences',JSON.stringify({reduced:true,textsize:'1.3',quality:.75}));});await enter(true);await page.locator('#step-next').click();await noOverflow(`Flat ${size.width}px / 130% text`);await page.locator('[data-tool="metadata"]').click();check((await progress('osen')).investigation.length===1,`Touch-sized controls operate at ${size.width}px`);await page.locator('.chapter-scene').scrollIntoViewIfNeeded();await snap(`mobile-${size.width}`);
 }
 const flatContext=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const flatPage=await flatContext.newPage();await flatPage.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='webgl'||type==='webgl2')return null;return original.call(this,type,...args);};});await flatPage.goto(url);await flatPage.locator('#flat-enter').click();await flatPage.locator('#gallery-next').click();check(await flatPage.locator('#mission-title').isVisible(),'The same narrated experience works when WebGL is unavailable');await flatPage.close();
 const text=await page.request.get(url+'tekst.html');const html=await text.text();check(text.ok()&&roomStories.every(s=>html.includes(s.moral)),'The no-JavaScript text version includes every rewritten moral');
 check(errors.length===0,'No browser JavaScript errors during the journey');check(requests.length===0,'No missing application resources');
}catch(e){errors.push(String(e));if(page)try{await writeFile(out+'/failure-page.txt',await page.locator('body').innerText());await snap('FAILURE');}catch{}process.exitCode=1;}
finally{await writeFile(out+'/results.json',JSON.stringify({checks,errors,requests,screenshots:shots},null,2));console.log(JSON.stringify({passed:checks.length,errors,requests},null,2));await browser?.close();server?.kill();}
