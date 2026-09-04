#!/usr/bin/env python3
from __future__ import annotations

import asyncio, csv, hashlib, html, json, os, re, shutil, time, unicodedata, zipfile
from dataclasses import dataclass, asdict
from pathlib import Path, PurePosixPath
from urllib.parse import urljoin, urlparse, unquote, urldefrag

import fitz
import httpx
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright, TimeoutError as PWTimeout

ROOT = "https://help.360online.com/6.10.0000/full_public_360/1044/360CompleteHelp/HH_Start.htm#!Search/utvidetsk.htm"
SHELL = ROOT.split("#!",1)[0]
SEED = ROOT.split("#!",1)[1]
BASE = SHELL.rsplit("/",1)[0] + "/"
BP = urlparse(BASE)
OUT = Path("build/public360_fast")
PDFROOT = OUT / "Public360_Hjelp_6.10_PDF-artikler"
TMP = OUT / "_tmp"
DIST = Path("dist")
ZIP = DIST / "Public360_Hjelp_6.10_RAG_PDF-artikler.zip"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36"

SKIP_NAMES = {"hh_start.htm","hh_start.html","index.htm","index.html","hmcontent.htm","hmkwindex.htm","hmftsearch.htm","hmsearch.htm"}
SKIP_DIRS = {"javascript","scripts","script","css","styles","images","img","fonts","_hmwebhelp"}
REF_RE = re.compile(r"(?i)(?:#!)?([A-Za-z0-9_./%+\-æøåÆØÅ ()]+?\.html?)(?=[\"'?#<>)\s]|$)")
HASH_RE = re.compile(r"(?i)#!([^\"'<>\s]+?\.html?)")
ASSET_EXT = re.compile(r"(?i)\.(?:js|json|xml|htm|html)(?:$|[?#])")

@dataclass
class Article:
    path: str
    url: str
    title: str
    order: int
    level: int
    section: str
    pdf_path: str = ""
    pages: int = 0
    text_chars: int = 0
    sha256: str = ""


def log(s): print(s, flush=True)

def norm(v, base=BASE):
    if not v: return None
    v = html.unescape(str(v)).strip().strip("\"'")
    if v.lower().startswith(("javascript:","mailto:","tel:","data:")): return None
    if "#!" in v: v = v.split("#!",1)[1]
    v = v.split("#",1)[0].split("?",1)[0]
    if not re.search(r"(?i)\.html?$",v): return None
    u = urljoin(base,v); p=urlparse(u)
    if p.netloc.lower()!=BP.netloc.lower() or not p.path.startswith(BP.path): return None
    rel=unquote(p.path[len(BP.path):]).lstrip("/")
    rel=re.sub(r"/{2,}","/",rel)
    pp=PurePosixPath(rel)
    if not rel or pp.name.lower() in SKIP_NAMES: return None
    if any(x.lower() in SKIP_DIRS for x in pp.parts[:-1]): return None
    return rel

def refs(text, base=BASE):
    out=[]; seen=set()
    for rx in (HASH_RE, REF_RE):
        for m in rx.finditer(text or ""):
            p=norm(m.group(1),base)
            if p and p not in seen:
                seen.add(p); out.append(p)
    return out

def clean(s):
    s=BeautifulSoup(s or "","html.parser").get_text(" ",strip=True)
    s=re.sub(r"\s+"," ",s).strip()
    s=re.sub(r"\s*[-|]\s*Public 360.*$","",s,flags=re.I)
    return s[:220]

def title_of(raw,path):
    soup=BeautifulSoup(raw,"html.parser")
    for sel in ("h1","h2","[role=heading]",".topic-title",".title","title"):
        e=soup.select_one(sel)
        if e:
            t=clean(e.get_text(" ",strip=True))
            if len(t)>1:return t
    return clean(PurePosixPath(path).stem.replace("_"," ").replace("-"," ").title()) or path

def slug(s,n=92):
    s=unicodedata.normalize("NFKD",s)
    s="".join(c for c in s if not unicodedata.combining(c))
    s=s.translate(str.maketrans({"æ":"ae","Æ":"Ae","ø":"o","Ø":"O","å":"a","Å":"A"}))
    s=re.sub(r"[^A-Za-z0-9._ -]+","",s);s=re.sub(r"[\s._-]+","_",s).strip("_")
    return (s or "artikkel")[:n]

def body_chars(raw):
    soup=BeautifulSoup(raw,"html.parser")
    for e in soup(["script","style","noscript"]): e.decompose()
    return len(re.sub(r"\s+"," ",soup.get_text(" ",strip=True)))

async def browser_discovery():
    ordered=[SEED]; seen={SEED}; title_map={}; level_map={}; asset_urls=set(); diag={}
    async with async_playwright() as pw:
        b=await pw.chromium.launch(headless=True)
        c=await b.new_context(user_agent=UA,locale="nb-NO",viewport={"width":1440,"height":1000})
        p=await c.new_page()
        await p.goto(ROOT,wait_until="domcontentloaded",timeout=60000)
        try: await p.wait_for_load_state("networkidle",timeout=12000)
        except PWTimeout: pass
        await p.wait_for_timeout(1200)
        # Expand TOC quickly without waiting on individual UI clicks.
        for _ in range(5):
            try:
                n=await p.locator('[aria-expanded="false"]').count()
                if not n: break
                await p.locator('[aria-expanded="false"]').evaluate_all("els=>els.slice(0,1000).forEach(e=>e.click())")
                await p.wait_for_timeout(350)
            except Exception: break
        anchors=await p.locator("a").evaluate_all("""els=>els.map(a=>({href:a.getAttribute('href')||'',text:(a.innerText||a.textContent||'').trim(),title:a.getAttribute('title')||'',onclick:a.getAttribute('onclick')||'',html:a.outerHTML.slice(0,1000),level:parseInt(a.getAttribute('aria-level')||a.closest('[aria-level]')?.getAttribute('aria-level')||'0')||0}))""")
        for a in anchors:
            blob=" ".join((a['href'],a['onclick'],a['html']))
            for q in refs(blob,p.url):
                if q not in seen: seen.add(q);ordered.append(q)
                t=clean(a['text'] or a['title'])
                if t: title_map.setdefault(q,t)
                if a['level']: level_map.setdefault(q,a['level'])
        dom=await p.content()
        for q in refs(dom,p.url):
            if q not in seen: seen.add(q);ordered.append(q)
        urls=await p.evaluate("performance.getEntriesByType('resource').map(e=>e.name)")
        for u in urls:
            up=urlparse(u)
            if up.netloc.lower()==BP.netloc.lower() and up.path.startswith(BP.path) and ASSET_EXT.search(u): asset_urls.add(urldefrag(u)[0])
        diag={"anchors":len(anchors),"resources":len(urls),"initial_topics":len(ordered),"asset_urls":sorted(asset_urls)}
        await b.close()
    return ordered,title_map,level_map,asset_urls,diag

async def http_discovery(ordered,asset_urls):
    seen=set(ordered); cache={}; status={}; asset_meta=[]
    limits=httpx.Limits(max_connections=80,max_keepalive_connections=40)
    timeout=httpx.Timeout(8.0,connect=8.0)
    sem=asyncio.Semaphore(50)
    async with httpx.AsyncClient(headers={"User-Agent":UA,"Accept-Language":"nb-NO,nb;q=.9,en;q=.8"},follow_redirects=True,limits=limits,timeout=timeout,http2=True) as client:
        async def get(u):
            async with sem:
                try:return await client.get(u)
                except Exception:return None
        # Shell + JS/JSON/XML resources, all at once.
        au=[SHELL]+sorted(asset_urls)
        rr=await asyncio.gather(*(get(u) for u in au))
        for u,r in zip(au,rr):
            if not r or r.status_code>=400: continue
            ct=r.headers.get("content-type","").lower()
            if any(x in ct for x in ("text","json","javascript","xml","html")):
                asset_meta.append({"url":u,"bytes":len(r.content)})
                for q in refs(r.text,u):
                    if q not in seen:seen.add(q);ordered.append(q)
        # Concurrent recursive topic crawl. Cache valid HTML to avoid re-fetching.
        pos=0
        while pos < len(ordered) and pos < 5000:
            batch=ordered[pos:min(len(ordered),pos+200)]; pos+=len(batch)
            rs=await asyncio.gather(*(get(urljoin(BASE,q)) for q in batch))
            for q,r in zip(batch,rs):
                status[q]=None if r is None else r.status_code
                if not r or r.status_code!=200: continue
                raw=r.text
                if len(raw)<100: continue
                cache[q]=raw
                for x in refs(raw,urljoin(BASE,q)):
                    if x not in seen and len(ordered)<5000:
                        seen.add(x); ordered.append(x)
        return ordered,cache,status,{"assets":asset_meta,"status_counts":{str(k):list(status.values()).count(k) for k in set(status.values())}}

PRINT_CSS="""
@media print {html,body{background:#fff!important}body{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}img,svg,canvas{max-width:100%!important;height:auto!important;break-inside:avoid}table{max-width:100%!important;border-collapse:collapse}pre,code{white-space:pre-wrap!important;overflow-wrap:anywhere}tr,pre,blockquote,.note,.tip,.warning{break-inside:avoid}a{color:inherit;text-decoration:none}}
.rag-source-banner{font:10.5px/1.45 Arial,Helvetica,sans-serif;color:#4b5865;background:#f5f8fb;border-left:4px solid #4f86c6;padding:8px 11px;margin:0 0 16px;break-inside:avoid}.rag-source-banner strong{color:#1d2a36}
"""

async def render_all(articles):
    PDFROOT.mkdir(parents=True,exist_ok=True); failures=[]; used=set(); lock=asyncio.Lock(); sem=asyncio.Semaphore(6)
    async with async_playwright() as pw:
        b=await pw.chromium.launch(headless=True)
        c=await b.new_context(user_agent=UA,locale="nb-NO",viewport={"width":1365,"height":960})
        async def one(a):
            async with sem:
                pp=PurePosixPath(a.path); folders=[slug(x,50) for x in pp.parts[:-1]]
                folder=PDFROOT.joinpath(*folders);folder.mkdir(parents=True,exist_ok=True)
                base=f"{a.order:04d}_{slug(a.title)}.pdf"; rel=(Path(*folders)/base if folders else Path(base))
                async with lock:
                    if str(rel) in used:
                        base=f"{a.order:04d}_{slug(a.title)}_{hashlib.sha1(a.path.encode()).hexdigest()[:7]}.pdf";rel=(Path(*folders)/base if folders else Path(base))
                    used.add(str(rel))
                out=PDFROOT/rel; p=await c.new_page(); p.set_default_timeout(15000)
                try:
                    resp=await p.goto(a.url,wait_until="domcontentloaded",timeout=25000)
                    if not resp or resp.status>=400: raise RuntimeError(f"HTTP {resp.status if resp else 'none'}")
                    try: await p.wait_for_load_state("load",timeout=4500)
                    except PWTimeout: pass
                    try:
                        await p.evaluate("""async()=>{const a=[...document.images];await Promise.race([Promise.all(a.map(i=>i.complete?Promise.resolve():new Promise(r=>{i.addEventListener('load',r,{once:true});i.addEventListener('error',r,{once:true})}))),new Promise(r=>setTimeout(r,2500))])}""")
                    except Exception: pass
                    banner=f'<div class="rag-source-banner"><strong>Public 360° Hjelp · versjon 6.10</strong><br>Artikkel: {html.escape(a.title)}<br>Kilde: {html.escape(a.url)}</div>'
                    try: await p.locator("body").evaluate("(el,b)=>el.insertAdjacentHTML('afterbegin',b)",banner)
                    except Exception: pass
                    await p.add_style_tag(content=PRINT_CSS)
                    await p.pdf(path=str(out),format="A4",print_background=True,margin={"top":"17mm","right":"15mm","bottom":"18mm","left":"15mm"},display_header_footer=True,header_template=f'<div style="font:9px Arial;color:#67727e;width:100%;padding:0 15mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Public 360° · {html.escape(a.title[:85])}</div>',footer_template='<div style="font:9px Arial;color:#7b8590;width:100%;padding:0 15mm;text-align:right">Side <span class="pageNumber"></span> av <span class="totalPages"></span></div>',tagged=True)
                    with fitz.open(out) as d:
                        a.pages=d.page_count;a.text_chars=sum(len(x.get_text("text")) for x in d)
                    if a.pages<1 or a.text_chars<30: raise RuntimeError(f"weak pdf {a.pages}/{a.text_chars}")
                    a.sha256=hashlib.sha256(out.read_bytes()).hexdigest();a.pdf_path=str(rel).replace(os.sep,"/")
                except Exception as e:
                    if out.exists():out.unlink()
                    failures.append({"path":a.path,"error":repr(e)})
                finally: await p.close()
        for s in range(0,len(articles),60):
            chunk=articles[s:s+60]
            await asyncio.gather(*(one(a) for a in chunk))
            log(f"PDF progress {min(s+60,len(articles))}/{len(articles)}")
        await b.close()
    return failures

async def index_pdf(articles):
    rows=[];last=None
    for a in articles:
        if not a.pdf_path:continue
        if a.section!=last:last=a.section;rows.append(f'<h2>{html.escape(last)}</h2>')
        rows.append(f'<div class="row" style="padding-left:{min(a.level,5)*12}px"><span>{a.order:04d}</span><b>{html.escape(a.title)}</b><small>{html.escape(a.path)}</small></div>')
    h=f'''<!doctype html><meta charset=utf-8><style>@page{{size:A4;margin:18mm 15mm}}body{{font:10.5pt Arial;color:#202b35}}h1{{font-size:27pt;margin:0}}.sub{{color:#5b6773;margin:2mm 0 8mm}}h2{{font-size:16pt;border-bottom:1px solid #ccd5df;padding-bottom:2mm;margin-top:7mm}}.row{{display:grid;grid-template-columns:44px 1fr;gap:2px 8px;padding:2mm 0;border-bottom:1px solid #edf1f5;break-inside:avoid}}small{{grid-column:2;color:#74808c;overflow-wrap:anywhere}}</style><h1>Public 360° Hjelp</h1><div class=sub>Versjon 6.10 · separate PDF-artikler for RAG</div><p>Kilde: {html.escape(ROOT)}<br>Artikler: {sum(bool(a.pdf_path) for a in articles)} · Generert: {time.strftime('%Y-%m-%d %H:%M UTC',time.gmtime())}</p>{''.join(rows)}'''
    async with async_playwright() as pw:
        b=await pw.chromium.launch(headless=True);p=await b.new_page();await p.set_content(h)
        await p.pdf(path=str(PDFROOT/"0000_INDEKS_Public360_Hjelp_6.10.pdf"),format="A4",print_background=True,display_header_footer=True,margin={"top":"14mm","right":"12mm","bottom":"16mm","left":"12mm"},header_template="<div></div>",footer_template='<div style="font:9px Arial;color:#7b8590;width:100%;padding:0 12mm;text-align:right">Side <span class="pageNumber"></span> av <span class="totalPages"></span></div>',tagged=True);await b.close()

def manifests(articles,diag):
    data=[asdict(a) for a in articles if a.pdf_path]
    (PDFROOT/"manifest.json").write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding="utf-8")
    with (PDFROOT/"manifest.csv").open("w",encoding="utf-8-sig",newline="") as f:
        w=csv.DictWriter(f,fieldnames=list(data[0]) if data else ["path"]);w.writeheader();w.writerows(data)
    with (PDFROOT/"articles.ndjson").open("w",encoding="utf-8") as f:
        for x in data:f.write(json.dumps(x,ensure_ascii=False)+"\n")
    (PDFROOT/"README.txt").write_text(f"Public 360° Hjelp 6.10 — PDF-artikler for RAG\n\nKilde: {ROOT}\nArtikler: {len(data)}\n\nHver PDF inneholder kilde-URL. manifest.json/csv og articles.ndjson gir ingest-metadata.\n",encoding="utf-8")
    TMP.mkdir(parents=True,exist_ok=True);(TMP/"diagnostics.json").write_text(json.dumps(diag,ensure_ascii=False,indent=2),encoding="utf-8")

def verify_and_zip(articles):
    pdfs=sorted(PDFROOT.rglob("*.pdf"));bad=[]
    for p in pdfs:
        try:
            with fitz.open(p) as d:
                if d.page_count<1:bad.append(str(p))
        except Exception:bad.append(str(p))
    if bad:raise RuntimeError(f"PDF validation failed: {bad[:10]}")
    DIST.mkdir(parents=True,exist_ok=True)
    if ZIP.exists():ZIP.unlink()
    with zipfile.ZipFile(ZIP,"w",zipfile.ZIP_DEFLATED,compresslevel=7) as z:
        for p in sorted(PDFROOT.rglob("*")):
            if p.is_file():z.write(p,p.relative_to(PDFROOT.parent))
    return len(pdfs)

async def main():
    shutil.rmtree(OUT,ignore_errors=True);shutil.rmtree(DIST,ignore_errors=True);PDFROOT.mkdir(parents=True,exist_ok=True)
    ordered,tmap,lmap,assets,bdiag=await browser_discovery();log(f"browser topics={len(ordered)} assets={len(assets)}")
    ordered,cache,status,hdiag=await http_discovery(ordered,assets);log(f"crawl candidates={len(ordered)} cached={len(cache)}")
    articles=[];rejected=[]
    for q in ordered:
        raw=cache.get(q)
        if not raw:continue
        chars=body_chars(raw)
        if chars<80:rejected.append({"path":q,"chars":chars});continue
        t=title_of(raw,q);pp=PurePosixPath(q);sec=pp.parts[0] if len(pp.parts)>1 else "Generelt"
        articles.append(Article(q,urljoin(BASE,q),t,len(articles)+1,lmap.get(q,max(0,len(pp.parts)-1)),sec))
    diag={"browser":bdiag,"http":hdiag,"candidates":len(ordered),"valid_articles":len(articles),"rejected":rejected[:500]}
    log(f"valid articles={len(articles)}")
    if len(articles)<40:
        manifests([],diag);raise RuntimeError(f"Only {len(articles)} valid articles found; refusing incomplete package")
    failures=await render_all(articles);diag["render_failures"]=failures
    good=[a for a in articles if a.pdf_path]
    log(f"rendered={len(good)}/{len(articles)}")
    if len(good)<max(35,int(len(articles)*.90)):
        manifests(good,diag);raise RuntimeError("Too many render failures")
    await index_pdf(good);manifests(good,diag);pdf_count=verify_and_zip(good)
    summary={"source":ROOT,"articles_discovered":len(articles),"articles_rendered":len(good),"pdf_files_including_index":pdf_count,"zip_bytes":ZIP.stat().st_size,"sections":sorted({a.section for a in good}),"render_failures":failures[:20]}
    (DIST/"build_summary.json").write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding="utf-8")
    log("BUILD SUMMARY "+json.dumps(summary,ensure_ascii=False))

if __name__=="__main__":asyncio.run(main())
