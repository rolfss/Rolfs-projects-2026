#!/usr/bin/env python3
"""Build a RAG-friendly PDF corpus from the Public 360° 6.10 help site.

The script discovers topic pages from the rendered help shell, linked static assets,
and recursive intra-help links. It preserves the source hierarchy where possible,
prints each topic as a separate PDF, creates an index/manifest, validates the PDFs,
and packages everything into one ZIP.
"""
from __future__ import annotations

import asyncio
import csv
import hashlib
import html
import json
import os
import re
import shutil
import sys
import time
import unicodedata
import zipfile
from collections import deque
from dataclasses import dataclass, asdict
from pathlib import Path, PurePosixPath
from typing import Iterable
from urllib.parse import urljoin, urlparse, urldefrag, unquote

import fitz  # PyMuPDF
import requests
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError

ROOT_URL = "https://help.360online.com/6.10.0000/full_public_360/1044/360CompleteHelp/HH_Start.htm#!Search/utvidetsk.htm"
SHELL_URL = ROOT_URL.split("#!", 1)[0]
SEED_TOPIC = ROOT_URL.split("#!", 1)[1]
BASE_URL = SHELL_URL.rsplit("/", 1)[0] + "/"
BASE_PARSED = urlparse(BASE_URL)

WORK = Path("build/public360")
PDF_ROOT = WORK / "Public360_Hjelp_6.10_PDF-artikler"
TMP = WORK / "_tmp"
DIST = Path("dist")
FINAL_ZIP = DIST / "Public360_Hjelp_6.10_RAG_PDF-artikler.zip"

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36"
SESSION = requests.Session()
SESSION.headers.update({"User-Agent": UA, "Accept-Language": "nb-NO,nb;q=0.9,en;q=0.8"})

TOPIC_RE = re.compile(r"(?i)(?:#!)?([A-Za-z0-9_./%+\-æøåÆØÅ ()]+?\.html?)(?=[\"'?#<>)\s]|$)")
ASSET_RE = re.compile(r"(?i)([A-Za-z0-9_./%+\-]+?\.(?:js|json|xml|htm|html))(?=[\"'?#<>)\s]|$)")

SKIP_BASENAMES = {
    "HH_Start.htm", "HH_Start.html", "index.htm", "index.html",
    "hmcontent.htm", "hmkwindex.htm", "hmftsearch.htm", "hmsearch.htm",
}
SKIP_PATH_PARTS = {"javascript", "scripts", "script", "css", "styles", "images", "img", "fonts", "_hmwebhelp"}


@dataclass
class TocEntry:
    path: str
    title: str
    order: int
    level: int = 0
    source: str = "discovered"


@dataclass
class Article:
    path: str
    url: str
    title: str
    order: int
    level: int
    section: str
    pdf_path: str = ""
    page_count: int = 0
    text_chars: int = 0
    sha256: str = ""
    render_mode: str = "direct"


def log(msg: str) -> None:
    print(msg, flush=True)


def normalize_topic(value: str, base: str = BASE_URL) -> str | None:
    if not value:
        return None
    value = html.unescape(value).strip().strip("\"'")
    if value.lower().startswith(("javascript:", "mailto:", "tel:", "data:")):
        return None
    if "#!" in value:
        value = value.split("#!", 1)[1]
    value = value.split("#", 1)[0].split("?", 1)[0]
    if not re.search(r"(?i)\.html?$", value):
        return None
    full = urljoin(base, value)
    p = urlparse(full)
    if p.netloc.lower() != BASE_PARSED.netloc.lower():
        return None
    base_path = BASE_PARSED.path
    if not p.path.startswith(base_path):
        return None
    rel = unquote(p.path[len(base_path):]).lstrip("/")
    rel = re.sub(r"/{2,}", "/", rel)
    if not rel or PurePosixPath(rel).name in SKIP_BASENAMES:
        return None
    if PurePosixPath(rel).suffix.lower() not in {".htm", ".html"}:
        return None
    return rel


def likely_topic_path(path: str) -> bool:
    pp = PurePosixPath(path)
    lowparts = {x.lower() for x in pp.parts[:-1]}
    if lowparts & SKIP_PATH_PARTS:
        return False
    name = pp.name.lower()
    if name.startswith(("hh_", "hm", "jquery", "toc", "searchdata")) and len(pp.parts) == 1:
        return False
    return True


def extract_topic_refs(text: str, base: str = BASE_URL) -> set[str]:
    out: set[str] = set()
    if not text:
        return out
    # Hash links are common in this help system.
    for m in re.finditer(r"#!([^\"'<>\s]+?\.html?)", text, flags=re.I):
        p = normalize_topic(m.group(1), base)
        if p and likely_topic_path(p):
            out.add(p)
    # Plain .htm references in scripts, HTML, XML, JSON.
    for m in TOPIC_RE.finditer(text):
        p = normalize_topic(m.group(1), base)
        if p and likely_topic_path(p):
            out.add(p)
    return out


def safe_get(url: str, timeout: int = 25) -> requests.Response | None:
    try:
        r = SESSION.get(url, timeout=timeout, allow_redirects=True)
        return r
    except requests.RequestException as e:
        log(f"WARN request failed: {url} :: {e}")
        return None


def clean_title(s: str) -> str:
    s = BeautifulSoup(s or "", "html.parser").get_text(" ", strip=True)
    s = re.sub(r"\s+", " ", s).strip()
    s = re.sub(r"\s*[-|]\s*Public 360.*$", "", s, flags=re.I)
    return s[:240]


def title_from_html(text: str, fallback: str) -> str:
    soup = BeautifulSoup(text, "html.parser")
    for sel in ["h1", "h2", "[role=heading]", ".topic-title", ".title", "title"]:
        el = soup.select_one(sel)
        if el:
            t = clean_title(el.get_text(" ", strip=True))
            if t and len(t) > 1:
                return t
    return clean_title(PurePosixPath(fallback).stem.replace("_", " ").replace("-", " ").title())


def slugify(name: str, max_len: int = 92) -> str:
    name = unicodedata.normalize("NFKD", name)
    name = "".join(c for c in name if not unicodedata.combining(c))
    repl = {"æ": "ae", "Æ": "Ae", "ø": "o", "Ø": "O", "å": "a", "Å": "A"}
    name = "".join(repl.get(c, c) for c in name)
    name = re.sub(r"[^A-Za-z0-9._ -]+", "", name)
    name = re.sub(r"[\s._-]+", "_", name).strip("_")
    return (name or "artikkel")[:max_len]


def unique_pdf_path(article: Article, used: set[str]) -> Path:
    pp = PurePosixPath(article.path)
    folder_parts = [slugify(x, 50) for x in pp.parts[:-1]]
    folder = PDF_ROOT.joinpath(*folder_parts)
    folder.mkdir(parents=True, exist_ok=True)
    base = f"{article.order:04d}_{slugify(article.title)}.pdf"
    rel = str(Path(*folder_parts) / base) if folder_parts else base
    if rel in used:
        base = f"{article.order:04d}_{slugify(article.title)}_{hashlib.sha1(article.path.encode()).hexdigest()[:7]}.pdf"
        rel = str(Path(*folder_parts) / base) if folder_parts else base
    used.add(rel)
    return PDF_ROOT / rel


async def discover_with_browser() -> tuple[list[TocEntry], set[str], dict]:
    toc: list[TocEntry] = []
    candidates: set[str] = {SEED_TOPIC}
    diag: dict = {"root": ROOT_URL, "base": BASE_URL, "anchors": [], "resources": [], "frames": []}

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(user_agent=UA, locale="nb-NO", viewport={"width": 1440, "height": 1000})
        page = await context.new_page()
        try:
            await page.goto(ROOT_URL, wait_until="domcontentloaded", timeout=90000)
            try:
                await page.wait_for_load_state("networkidle", timeout=25000)
            except PlaywrightTimeoutError:
                pass
            await page.wait_for_timeout(3500)

            # Expand accessible tree nodes where possible. Ignore failures; this is only discovery.
            for _ in range(6):
                expanded = 0
                for selector in [
                    '[aria-expanded="false"]',
                    '.tree-toggle', '.toc-toggle', '.expander',
                    '[class*="expand"][class*="icon"]',
                ]:
                    loc = page.locator(selector)
                    try:
                        count = min(await loc.count(), 300)
                    except Exception:
                        continue
                    for i in range(count):
                        el = loc.nth(i)
                        try:
                            if await el.is_visible():
                                await el.click(timeout=1200)
                                expanded += 1
                        except Exception:
                            pass
                if not expanded:
                    break
                await page.wait_for_timeout(700)

            # Gather DOM anchors plus hierarchy hints.
            anchor_data = await page.locator("a").evaluate_all(
                """els => els.map((a,i) => ({
                    i, href: a.getAttribute('href') || '', text: (a.innerText || a.textContent || '').trim(),
                    title: a.getAttribute('title') || '', onclick: a.getAttribute('onclick') || '',
                    level: parseInt(a.getAttribute('aria-level') || (a.closest('[aria-level]')||{}).getAttribute?.('aria-level') || '0') || 0,
                    html: a.outerHTML.slice(0,1200)
                }))"""
            )
            diag["anchors"] = anchor_data[:5000]

            seen_toc = set()
            order = 1
            for a in anchor_data:
                blob = " ".join([a.get("href", ""), a.get("onclick", ""), a.get("html", "")])
                refs = extract_topic_refs(blob, page.url)
                for p in refs:
                    candidates.add(p)
                    title = clean_title(a.get("text") or a.get("title") or "")
                    if title and p not in seen_toc:
                        toc.append(TocEntry(p, title, order, int(a.get("level") or 0), "rendered_toc"))
                        seen_toc.add(p)
                        order += 1

            dom = await page.content()
            candidates |= extract_topic_refs(dom, page.url)
            diag["dom_topic_refs"] = sorted(extract_topic_refs(dom, page.url))

            resources = await page.evaluate("performance.getEntriesByType('resource').map(e => e.name)")
            diag["resources"] = resources
            for u in resources:
                candidates |= extract_topic_refs(u, u)

            frames = []
            for fr in page.frames:
                frames.append({"url": fr.url, "name": fr.name})
                candidates |= extract_topic_refs(fr.url, fr.url)
                try:
                    fc = await fr.content()
                    candidates |= extract_topic_refs(fc, fr.url or page.url)
                except Exception:
                    pass
            diag["frames"] = frames
        finally:
            await browser.close()
    return toc, candidates, diag


def discover_static(initial_candidates: set[str], browser_diag: dict) -> tuple[set[str], dict]:
    candidates = set(initial_candidates)
    diag = {"assets_scanned": [], "request_errors": [], "topic_http": {}}

    # Scan shell + browser-loaded textual resources for topic references.
    urls_to_scan = {SHELL_URL}
    for u in browser_diag.get("resources", []):
        p = urlparse(u)
        if p.netloc.lower() == BASE_PARSED.netloc.lower() and p.path.startswith(BASE_PARSED.path):
            if re.search(r"(?i)\.(?:js|json|xml|htm|html)(?:$|[?#])", u):
                urls_to_scan.add(urldefrag(u)[0])

    q = deque(urls_to_scan)
    scanned = set()
    while q and len(scanned) < 300:
        u = q.popleft()
        if u in scanned:
            continue
        scanned.add(u)
        r = safe_get(u)
        if not r or r.status_code >= 400:
            diag["request_errors"].append({"url": u, "status": getattr(r, "status_code", None)})
            continue
        ctype = (r.headers.get("content-type") or "").lower()
        if not any(x in ctype for x in ["text", "json", "javascript", "xml", "html"]):
            continue
        text = r.text
        diag["assets_scanned"].append({"url": u, "bytes": len(r.content)})
        candidates |= extract_topic_refs(text, u)
        # Follow same-site JS/JSON/XML assets referenced by those files.
        for m in ASSET_RE.finditer(text):
            ref = m.group(1)
            full = urldefrag(urljoin(u, ref))[0]
            pp = urlparse(full)
            if pp.netloc.lower() == BASE_PARSED.netloc.lower() and pp.path.startswith(BASE_PARSED.path):
                if full not in scanned and re.search(r"(?i)\.(?:js|json|xml)(?:$|[?#])", full):
                    q.append(full)

    # Recursive crawl of HTML topic links. This is the completeness backstop.
    topic_q = deque(sorted(candidates))
    visited: set[str] = set()
    while topic_q and len(visited) < 2500:
        path = topic_q.popleft()
        if path in visited or not likely_topic_path(path):
            continue
        visited.add(path)
        u = urljoin(BASE_URL, path)
        r = safe_get(u)
        if not r:
            diag["topic_http"][path] = None
            continue
        diag["topic_http"][path] = r.status_code
        if r.status_code != 200:
            continue
        ctype = (r.headers.get("content-type") or "").lower()
        if "html" not in ctype and not r.text.lstrip().startswith("<"):
            continue
        # Discover links from topic page itself.
        newrefs = extract_topic_refs(r.text, u)
        soup = BeautifulSoup(r.text, "html.parser")
        for tag in soup.find_all(["a", "frame", "iframe"]):
            ref = tag.get("href") or tag.get("src")
            p = normalize_topic(ref or "", u)
            if p and likely_topic_path(p):
                newrefs.add(p)
        for p in newrefs:
            if p not in candidates:
                candidates.add(p)
                topic_q.append(p)

    return candidates, diag


def filter_articles(candidates: Iterable[str], toc_entries: list[TocEntry]) -> tuple[list[Article], dict]:
    toc_map = {e.path: e for e in toc_entries}
    toc_order = max([e.order for e in toc_entries], default=0)
    valid: list[Article] = []
    rejects = []

    for path in sorted(set(candidates)):
        if not likely_topic_path(path):
            continue
        u = urljoin(BASE_URL, path)
        r = safe_get(u)
        if not r or r.status_code != 200:
            rejects.append({"path": path, "reason": f"http_{getattr(r, 'status_code', 'error')}"})
            continue
        text = r.text
        soup = BeautifulSoup(text, "html.parser")
        # Remove scripts/styles for content-density test only.
        for x in soup(["script", "style", "noscript"]):
            x.decompose()
        body_text = re.sub(r"\s+", " ", soup.get_text(" ", strip=True)).strip()
        low = body_text.lower()
        if len(body_text) < 80:
            rejects.append({"path": path, "reason": "too_little_text", "chars": len(body_text)})
            continue
        if "content is not shown because javascript is disabled" in low:
            rejects.append({"path": path, "reason": "shell_js_only"})
            continue
        # Exclude obvious navigation/search plumbing pages when they are not real topics.
        if PurePosixPath(path).name.lower() in {"hh_start.htm", "hh_start.html"}:
            continue

        e = toc_map.get(path)
        if e:
            order, level, title = e.order, e.level, e.title
        else:
            toc_order += 1
            order, level = toc_order, max(len(PurePosixPath(path).parts) - 1, 0)
            title = title_from_html(text, path)
        title = title_from_html(text, path) or title
        section = PurePosixPath(path).parts[0] if len(PurePosixPath(path).parts) > 1 else "Generelt"
        valid.append(Article(path, u, title, order, level, section))

    # Deduplicate by canonical path and stable order.
    by_path = {}
    for a in sorted(valid, key=lambda x: (x.order, x.path.lower())):
        by_path.setdefault(a.path.lower(), a)
    articles = list(by_path.values())
    # Re-number to ensure filenames are contiguous while preserving TOC order first.
    for i, a in enumerate(articles, 1):
        a.order = i
    return articles, {"rejects": rejects, "valid_count": len(articles)}


PRINT_CSS = r"""
@media print {
  html, body { background: white !important; }
  body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  img, svg, canvas { max-width: 100% !important; height: auto !important; break-inside: avoid; }
  table { max-width: 100% !important; border-collapse: collapse; break-inside: auto; }
  tr, pre, blockquote, .note, .tip, .warning { break-inside: avoid; }
  pre, code { white-space: pre-wrap !important; overflow-wrap: anywhere; }
  a { color: inherit; text-decoration: none; }
  nav, .nav, #nav, #toc, .toc, .navigation, .breadcrumbs.print-hide { display: none !important; }
}
.rag-source-banner {
  font: 11px/1.45 Arial, Helvetica, sans-serif;
  color: #46515d;
  background: #f5f8fb;
  border-left: 4px solid #4f86c6;
  padding: 9px 12px;
  margin: 0 0 18px 0;
  break-inside: avoid;
}
.rag-source-banner strong { color:#1d2a36; }
"""


async def wait_images(page) -> None:
    try:
        await page.evaluate("""async () => {
            const imgs = [...document.images];
            await Promise.all(imgs.map(img => img.complete ? Promise.resolve() : new Promise(r => { img.addEventListener('load', r, {once:true}); img.addEventListener('error', r, {once:true}); setTimeout(r, 7000); })));
            await Promise.all(imgs.map(img => (img.decode ? img.decode().catch(()=>{}) : Promise.resolve())));
        }""")
    except Exception:
        pass


async def render_articles(articles: list[Article]) -> dict:
    PDF_ROOT.mkdir(parents=True, exist_ok=True)
    used: set[str] = set()
    failures = []
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(user_agent=UA, locale="nb-NO", viewport={"width": 1365, "height": 960})
        page = await context.new_page()
        page.set_default_timeout(25000)

        for idx, a in enumerate(articles, 1):
            out = unique_pdf_path(a, used)
            log(f"[{idx}/{len(articles)}] PDF: {a.path} -> {out.relative_to(PDF_ROOT)}")
            try:
                response = await page.goto(a.url, wait_until="domcontentloaded", timeout=70000)
                if not response or response.status >= 400:
                    raise RuntimeError(f"HTTP {response.status if response else 'none'}")
                try:
                    await page.wait_for_load_state("networkidle", timeout=12000)
                except PlaywrightTimeoutError:
                    pass
                await page.wait_for_timeout(500)
                await wait_images(page)
                # Add provenance unobtrusively; helps RAG and auditability.
                banner = (
                    f'<div class="rag-source-banner"><strong>Public 360° Hjelp - versjon 6.10</strong><br>'
                    f'Artikkel: {html.escape(a.title)}<br>Kilde: {html.escape(a.url)}</div>'
                )
                try:
                    await page.locator("body").evaluate("(el, b) => el.insertAdjacentHTML('afterbegin', b)", banner)
                except Exception:
                    pass
                await page.add_style_tag(content=PRINT_CSS)
                header_title = html.escape(a.title[:90])
                await page.pdf(
                    path=str(out), format="A4", print_background=True,
                    margin={"top": "17mm", "right": "15mm", "bottom": "18mm", "left": "15mm"},
                    display_header_footer=True,
                    header_template=f'<div style="font:9px Arial;color:#67727e;width:100%;padding:0 15mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Public 360° - {header_title}</div>',
                    footer_template='<div style="font:9px Arial;color:#7b8590;width:100%;padding:0 15mm;text-align:right;">Side <span class="pageNumber"></span> av <span class="totalPages"></span></div>',
                    prefer_css_page_size=False,
                    tagged=True,
                )
                a.pdf_path = str(out.relative_to(PDF_ROOT)).replace(os.sep, "/")
                with fitz.open(out) as doc:
                    a.page_count = doc.page_count
                    a.text_chars = sum(len(p.get_text("text")) for p in doc)
                a.sha256 = hashlib.sha256(out.read_bytes()).hexdigest()
                if a.page_count < 1 or a.text_chars < 30:
                    raise RuntimeError(f"PDF validation weak: pages={a.page_count} text={a.text_chars}")
            except Exception as e:
                failures.append({"path": a.path, "url": a.url, "error": repr(e)})
                log(f"ERROR rendering {a.path}: {e}")
                if out.exists():
                    out.unlink()
        await browser.close()
    return {"failures": failures, "rendered": len(articles) - len(failures)}


async def create_index_pdf(articles: list[Article]) -> None:
    rows = []
    current_section = None
    for a in articles:
        if not a.pdf_path:
            continue
        if a.section != current_section:
            current_section = a.section
            rows.append(f'<h2>{html.escape(current_section)}</h2>')
        indent = min(a.level, 5) * 14
        rows.append(
            f'<div class="row" style="padding-left:{indent}px"><span class="num">{a.order:04d}</span>'
            f'<span class="title">{html.escape(a.title)}</span>'
            f'<span class="path">{html.escape(a.path)}</span></div>'
        )
    doc_html = f"""<!doctype html><html lang='nb'><head><meta charset='utf-8'><title>Public 360° Hjelp 6.10 - indeks</title>
<style>
@page {{ size:A4; margin:18mm 15mm 18mm; }}
body{{font-family:Arial,Helvetica,sans-serif;color:#202b35;font-size:10.5pt;line-height:1.35}}
h1{{font-size:28pt;margin:0 0 4mm}} .sub{{color:#5b6773;margin-bottom:10mm}}
h2{{font-size:16pt;border-bottom:1px solid #ccd5df;padding-bottom:2mm;margin-top:8mm}}
.row{{display:grid;grid-template-columns:45px minmax(0,1fr);gap:0 8px;padding:2.2mm 0;border-bottom:1px solid #edf1f5;break-inside:avoid}}
.num{{color:#6a7784}} .title{{font-weight:600}} .path{{grid-column:2;color:#74808c;font-size:8.5pt;overflow-wrap:anywhere}}
.meta{{background:#f5f8fb;border-left:4px solid #4f86c6;padding:3mm 4mm;margin:7mm 0}}
</style></head><body>
<h1>Public 360° Hjelp</h1><div class='sub'>Versjon 6.10 - PDF-artikler for RAG og intern kunnskapssøk</div>
<div class='meta'>Kilde: {html.escape(ROOT_URL)}<br>Antall PDF-artikler: {sum(1 for a in articles if a.pdf_path)}<br>Generert: {time.strftime('%Y-%m-%d %H:%M UTC', time.gmtime())}</div>
{''.join(rows)}</body></html>"""
    out = PDF_ROOT / "0000_INDEKS_Public360_Hjelp_6.10.pdf"
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        p = await browser.new_page()
        await p.set_content(doc_html, wait_until="load")
        await p.pdf(path=str(out), format="A4", print_background=True, display_header_footer=True,
                    margin={"top":"14mm","right":"12mm","bottom":"16mm","left":"12mm"},
                    footer_template='<div style="font:9px Arial;color:#7b8590;width:100%;padding:0 12mm;text-align:right;">Side <span class="pageNumber"></span> av <span class="totalPages"></span></div>',
                    header_template='<div></div>', tagged=True)
        await browser.close()


def write_manifests(articles: list[Article], diagnostics: dict) -> None:
    PDF_ROOT.mkdir(parents=True, exist_ok=True)
    data = [asdict(a) for a in articles if a.pdf_path]
    (PDF_ROOT / "manifest.json").write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    with (PDF_ROOT / "manifest.csv").open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(data[0].keys()) if data else ["path"])
        w.writeheader()
        if data:
            w.writerows(data)
    with (PDF_ROOT / "articles.ndjson").open("w", encoding="utf-8") as f:
        for row in data:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
    readme = f"""Public 360° Hjelp - versjon 6.10\nPDF-artikler for RAG\n\nKilde:\n{ROOT_URL}\n\nInnhold:\n- 0000_INDEKS_Public360_Hjelp_6.10.pdf: lesbar indeks\n- Én PDF per oppdaget hjelpeartikkel, organisert etter original sti\n- manifest.json / manifest.csv / articles.ndjson: metadata for ingest\n\nGenerert: {time.strftime('%Y-%m-%d %H:%M UTC', time.gmtime())}\nAntall artikler: {len(data)}\n\nMerk:\nDette er en teknisk transformasjon av det offentlige hjelpesenteret. Original kildeadresse er\nlagt inn i hver PDF slik at svar fra en RAG-løsning kan spores tilbake til kilden.\n"""
    (PDF_ROOT / "README.txt").write_text(readme, encoding="utf-8")
    (TMP / "diagnostics.json").parent.mkdir(parents=True, exist_ok=True)
    (TMP / "diagnostics.json").write_text(json.dumps(diagnostics, ensure_ascii=False, indent=2), encoding="utf-8")


def verify_rendered_pdfs() -> dict:
    pdfs = sorted(PDF_ROOT.rglob("*.pdf"))
    failures = []
    samples = []
    if not pdfs:
        return {"ok": False, "failures": ["No PDFs generated"], "samples": []}
    idxs = sorted(set([0, len(pdfs)//2, len(pdfs)-1]))
    verify_dir = TMP / "verify"
    verify_dir.mkdir(parents=True, exist_ok=True)
    for i in idxs:
        p = pdfs[i]
        try:
            with fitz.open(p) as d:
                if d.page_count < 1:
                    raise RuntimeError("zero pages")
                page = d[0]
                pix = page.get_pixmap(matrix=fitz.Matrix(1.2, 1.2), alpha=False)
                png = verify_dir / f"sample_{i:04d}.png"
                pix.save(png)
                if pix.width < 100 or pix.height < 100:
                    raise RuntimeError("render dimensions too small")
                samples.append({"pdf": str(p.relative_to(PDF_ROOT)), "png": str(png), "w": pix.width, "h": pix.height})
        except Exception as e:
            failures.append({"pdf": str(p), "error": repr(e)})
    return {"ok": not failures, "failures": failures, "samples": samples}


def make_zip() -> None:
    DIST.mkdir(parents=True, exist_ok=True)
    if FINAL_ZIP.exists():
        FINAL_ZIP.unlink()
    with zipfile.ZipFile(FINAL_ZIP, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=7) as z:
        for p in sorted(PDF_ROOT.rglob("*")):
            if p.is_file():
                z.write(p, p.relative_to(PDF_ROOT.parent))
    log(f"ZIP: {FINAL_ZIP} ({FINAL_ZIP.stat().st_size/1024/1024:.1f} MiB)")


async def main() -> int:
    shutil.rmtree(WORK, ignore_errors=True)
    shutil.rmtree(DIST, ignore_errors=True)
    PDF_ROOT.mkdir(parents=True, exist_ok=True)
    TMP.mkdir(parents=True, exist_ok=True)

    log(f"Source: {ROOT_URL}")
    toc, candidates, browser_diag = await discover_with_browser()
    log(f"Browser discovery: {len(toc)} TOC entries, {len(candidates)} candidate topics")
    candidates, static_diag = discover_static(candidates, browser_diag)
    log(f"Static/recursive discovery: {len(candidates)} candidate topics")
    articles, filter_diag = filter_articles(candidates, toc)
    log(f"Validated topic articles: {len(articles)}")

    diagnostics = {"browser": browser_diag, "static": static_diag, "filter": filter_diag,
                   "toc_count": len(toc), "candidate_count": len(candidates), "article_count": len(articles)}

    # A complete Public 360 help corpus should contain substantially more than a handful of topics.
    # Fail loudly rather than shipping a deceptively incomplete package.
    if len(articles) < 40:
        write_manifests([], diagnostics)
        log("FATAL: fewer than 40 valid topics discovered; refusing to publish an incomplete corpus")
        return 2

    render_diag = await render_articles(articles)
    diagnostics["render"] = render_diag
    rendered_articles = [a for a in articles if a.pdf_path]
    if len(rendered_articles) < max(35, int(len(articles) * 0.85)):
        write_manifests(rendered_articles, diagnostics)
        log(f"FATAL: only {len(rendered_articles)}/{len(articles)} articles rendered")
        return 3

    await create_index_pdf(rendered_articles)
    write_manifests(rendered_articles, diagnostics)
    verify = verify_rendered_pdfs()
    diagnostics["verification"] = verify
    (TMP / "diagnostics.json").write_text(json.dumps(diagnostics, ensure_ascii=False, indent=2), encoding="utf-8")
    if not verify["ok"]:
        log(f"FATAL verification failure: {verify['failures']}")
        return 4

    make_zip()
    summary = {
        "source": ROOT_URL,
        "articles_discovered": len(articles),
        "articles_rendered": len(rendered_articles),
        "zip": str(FINAL_ZIP),
        "zip_bytes": FINAL_ZIP.stat().st_size,
        "sections": sorted({a.section for a in rendered_articles}),
        "render_failures": render_diag["failures"][:20],
    }
    (DIST / "build_summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    log("BUILD SUMMARY: " + json.dumps(summary, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
