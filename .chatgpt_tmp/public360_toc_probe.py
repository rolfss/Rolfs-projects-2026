#!/usr/bin/env python3
from __future__ import annotations
import asyncio, json, os, re, hashlib
from pathlib import Path
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError

ROOT='https://help.360online.com/6.10.0000/full_public_360/1044/360CompleteHelp/HH_Start.htm#!Search/utvidetsk.htm'
SHELL=ROOT.split('#!',1)[0]
BASE=SHELL.rsplit('/',1)[0]+'/'
HOST=urlparse(BASE).netloc
OUT=Path('toc_probe'); OUT.mkdir(exist_ok=True)
RES=OUT/'resources'; RES.mkdir(exist_ok=True)
UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36'
s=requests.Session(); s.headers.update({'User-Agent':UA,'Accept-Language':'nb-NO,nb;q=0.9,en;q=0.8'})

def save(name, data):
    p=OUT/name; p.parent.mkdir(parents=True, exist_ok=True)
    if isinstance(data,(dict,list)): p.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
    else: p.write_text(data or '',encoding='utf-8',errors='replace')

def safe_name(url):
    p=urlparse(url); base=(p.path.strip('/').replace('/','__') or 'root')
    base=re.sub(r'[^A-Za-z0-9._-]+','_',base)[:150]
    return f'{base}__{hashlib.sha1(url.encode()).hexdigest()[:8]}.txt'

# Direct shell and likely TOC/navigation files
shell=''
try:
    r=s.get(SHELL,timeout=30); shell=r.text; save('shell.html',shell); save('shell_headers.json',dict(r.headers))
except Exception as e: save('shell_error.txt',repr(e))

refs=[]
if shell:
    soup=BeautifulSoup(shell,'html.parser')
    for tag in soup.find_all(True):
        for attr in ('src','href','data-src'):
            v=tag.get(attr)
            if v: refs.append(urljoin(SHELL,v))

common=[
'hmcontent.htm','hmcontent.html','hmcontent.js','hm_content.js','hmnavigation.js','hm_navigation.js','hmsettings.js','hm_webhelp.js','hmcontextids.js','hmkwindex.htm','hmftsearch.htm','hmsearch.htm','toc.js','tocdata.js','toc.json','toc.xml','hmcontent.xml','js/hmcontent.js','js/hm_navigation.js','js/hmsettings.js','_hmwebhelp/hmcontent.js','_hmwebhelp/hm_navigation.js'
]
for c in common: refs.append(urljoin(BASE,c))
seen=set(); direct=[]
for u in refs:
    if u in seen or urlparse(u).netloc!=HOST: continue
    seen.add(u)
    try:
        rr=s.get(u,timeout=20)
        item={'url':u,'status':rr.status_code,'content_type':rr.headers.get('content-type'),'bytes':len(rr.content)}
        direct.append(item)
        if rr.status_code==200 and len(rr.content)<6_000_000 and any(x in (rr.headers.get('content-type') or '').lower() for x in ['text','javascript','json','xml','html']):
            (RES/safe_name(u)).write_text(rr.text,encoding='utf-8',errors='replace')
    except Exception as e: direct.append({'url':u,'error':repr(e)})
save('direct_resources.json',direct)

async def main():
    captured=[]; bodies={}
    async with async_playwright() as pw:
        browser=await pw.chromium.launch(headless=True, channel='chrome')
        ctx=await browser.new_context(user_agent=UA, locale='nb-NO', viewport={'width':1600,'height':1200})
        page=await ctx.new_page()

        async def handle_response(resp):
            u=resp.url
            if urlparse(u).netloc!=HOST: return
            ct=(resp.headers.get('content-type') or '').lower()
            rec={'url':u,'status':resp.status,'content_type':ct}
            captured.append(rec)
            if len(bodies)>=500: return
            if any(x in ct for x in ['text','javascript','json','xml','html']) or re.search(r'\.(?:js|json|xml|html?|txt)(?:[?#]|$)',u,re.I):
                try:
                    b=await resp.body()
                    if len(b)<=6_000_000:
                        txt=b.decode('utf-8','replace')
                        bodies[u]=txt
                except Exception: pass
        page.on('response', handle_response)
        await page.goto(ROOT,wait_until='domcontentloaded',timeout=90000)
        try: await page.wait_for_load_state('networkidle',timeout=30000)
        except PlaywrightTimeoutError: pass
        await page.wait_for_timeout(5000)

        # Expand any visible tree nodes repeatedly.
        for _ in range(10):
            n=0
            for sel in ['[aria-expanded="false"]','[role="treeitem"][aria-expanded="false"]','.tree-toggle','.toc-toggle','.expander']:
                loc=page.locator(sel)
                try: count=min(await loc.count(),1000)
                except Exception: continue
                for i in range(count):
                    el=loc.nth(i)
                    try:
                        if await el.is_visible(): await el.click(timeout=800); n+=1
                    except Exception: pass
            if not n: break
            await page.wait_for_timeout(600)

        save('page_url.txt',page.url)
        save('page_dom.html',await page.content())
        perf=await page.evaluate("performance.getEntriesByType('resource').map(e=>({name:e.name,initiatorType:e.initiatorType}))")
        save('performance_resources.json',perf)

        frames=[]
        for idx,fr in enumerate(page.frames):
            f={'index':idx,'name':fr.name,'url':fr.url}
            try:
                html=await fr.content(); save(f'frames/frame_{idx}.html',html)
                f['title']=await fr.title()
                f['body_text']=(await fr.locator('body').inner_text())[:30000]
                nodes=await fr.locator('a, [role="treeitem"], [aria-level], li').evaluate_all("""els=>els.slice(0,20000).map((e,i)=>({i,tag:e.tagName,text:(e.innerText||e.textContent||'').trim().replace(/\\s+/g,' ').slice(0,500),href:e.getAttribute('href')||'',title:e.getAttribute('title')||'',ariaLevel:e.getAttribute('aria-level')||'',ariaExpanded:e.getAttribute('aria-expanded')||'',role:e.getAttribute('role')||'',cls:e.className||'',id:e.id||'',dataTopic:e.getAttribute('data-topic')||'',dataTarget:e.getAttribute('data-target')||'',onclick:e.getAttribute('onclick')||''}))""")
                save(f'frames/frame_{idx}_nodes.json',nodes)
            except Exception as e: f['error']=repr(e)
            frames.append(f)
        save('frames.json',frames)

        # Probe likely globals; stringify only small serializable values.
        globals_data=await page.evaluate("""() => {
          const keys=Object.keys(window).filter(k=>/toc|content|nav|tree|help|topic|hm/i.test(k)).sort();
          const out={keys};
          for (const k of keys) {
            try { const v=window[k]; if (['string','number','boolean'].includes(typeof v)) out[k]=v; }
            catch(e){}
          }
          return out;
        }""")
        save('window_globals.json',globals_data)
        save('captured_responses.json',captured)
        for u,txt in bodies.items(): (RES/safe_name(u)).write_text(txt,encoding='utf-8',errors='replace')
        await browser.close()

    # Search all captured textual resources for likely TOC markers and htm references.
    hits=[]
    pats=[r'contents?',r'toc',r'children',r'parent',r'level',r'book',r'topic',r'nav',r'\.htm']
    for p in sorted(RES.glob('*.txt')):
        txt=p.read_text(encoding='utf-8',errors='replace')
        score=sum(1 for pat in pats if re.search(pat,txt,re.I))
        htm=len(re.findall(r'[^\"\'<>\s]+\.html?',txt,re.I))
        if score>=3 or htm>=10: hits.append({'file':p.name,'chars':len(txt),'score':score,'htm_refs':htm})
    hits.sort(key=lambda x:(-x['htm_refs'],-x['score']))
    save('likely_toc_resources.json',hits)

asyncio.run(main())
