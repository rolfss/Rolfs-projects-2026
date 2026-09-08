"""Owner-run ingestion. Never run this script from a public request or Hermes tool.
Only explicitly reviewed files are imported; there is no recursive disk crawl.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import urllib.request

ROOT = Path(__file__).resolve().parent
MAX_FILE = 10_000_000


def chunks(text, size=1800, overlap=180):
    text = re.sub(r"\s+", " ", text).strip()
    start = 0
    while start < len(text):
        end = min(start + size, len(text))
        if end < len(text):
            end = max(text.rfind(" ", start + size // 2, end), start + size // 2)
        part = text[start:end].strip()
        if len(part) >= 20:
            yield part
        if end == len(text):
            break
        start = max(start + 1, end - overlap)


def local_path(relative):
    path = (ROOT / relative).resolve()
    if not path.is_relative_to((ROOT / '.local').resolve()):
        raise ValueError('Inputs and generated corpus must stay under .local/')
    return path


def check_bytes(data, source):
    if len(data) > MAX_FILE:
        raise ValueError('Source too large')
    expected = source.get('sha256')
    if source.get('input') != 'pdf' and not expected:
        raise ValueError('Reviewed local sources need an explicit sha256')
    if expected and hashlib.sha256(data).hexdigest() != expected:
        raise ValueError('Reviewed file changed; approval must be renewed')
    blob = source.get('gitBlobSha')
    if blob and hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest() != blob:
        raise ValueError('GitHub PDF does not match the reviewed blob')


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError('Unexpected source redirect')


def fetch_master(source):
    url = source['downloadUrl']
    expected_prefix = 'https://raw.githubusercontent.com/rolfss/Master-Thesis---Mystical-Experience-and-Reform-in-the-Spanish-Golden-Age---Teresa-of-Avila/'
    if not url.startswith(expected_prefix):
        raise ValueError('Only the approved thesis repository can be downloaded')
    with urllib.request.build_opener(NoRedirect).open(url, timeout=30) as response:
        data = response.read(MAX_FILE + 1)
    check_bytes(data, source)
    path = local_path(source['path'])
    path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    path.write_bytes(data)
    os.chmod(path, 0o600)


def make_chunk(source, text, number, page=None):
    result = {key: source[key] for key in ('title', 'kind', 'author', 'url')}
    result.update(id=f"{source['id']}:{page or 0}:{number}", text=text, page=page, approved=True)
    if source.get('date'):
        result['date'] = source['date']
    if source.get('originalAuthor'):
        result['originalAuthor'] = source['originalAuthor']
    return result


def build(manifest):
    output, statuses = [], []
    for source in manifest['sources']:
        before = len(output)
        try:
            if source.get('approved') is not True:
                statuses.append({'id':source['id'], 'status':source['status'], 'chunks':0})
                continue
            kind = source['input']
            if kind == 'seed':
                for n, part in enumerate(json.loads((ROOT / 'public-seed.json').read_text(encoding='utf-8'))):
                    output.append(make_chunk({**source,'title':part['title']},part['text'],n))
            else:
                data = local_path(source['path']).read_bytes()
                check_bytes(data, source)
                if kind == 'pdf':
                    if not data.startswith(b'%PDF-') or not shutil.which('pdftotext'):
                        raise ValueError('Verified PDF and patched pdftotext are required')
                    # No shell; fixed executable and owner-approved input. Run importer in an offline sandbox for untrusted PDFs.
                    proc = subprocess.run(['pdftotext','-layout','-enc','UTF-8',str(local_path(source['path'])),'-'],
                        check=True,capture_output=True,timeout=30)
                    if len(proc.stdout) > 4_000_000:
                        raise ValueError('Extracted document too large')
                    pages = proc.stdout.decode('utf-8').split('\f')
                    if len(pages) > 500:
                        raise ValueError('Page limit')
                    for page, text in enumerate(pages, 1):
                        for n, part in enumerate(chunks(text)):
                            output.append(make_chunk(source,part,n,page))
                elif kind == 'text':
                    for n, part in enumerate(chunks(data.decode('utf-8'))):
                        output.append(make_chunk(source,part,n))
                elif kind == 'social':
                    posts = json.loads(data)
                    if not isinstance(posts,list) or len(posts) > 5000:
                        raise ValueError('Invalid reviewed social export')
                    for n, post in enumerate(posts):
                        if post.get('approved') is not True:
                            continue
                        if post.get('kind') not in ('original-post','repost') or not re.fullmatch(r'https://x\.com/[A-Za-z0-9_]{1,15}/status/\d+',post.get('url',''),re.I):
                            raise ValueError('Invalid post provenance')
                        if post['kind'] == 'original-post' and not re.fullmatch(r'https://x\.com/rolfsselas/status/\d+',post['url'],re.I):
                            raise ValueError('Original post must be authored by the owner')
                        if not isinstance(post.get('date'),str) or not re.match(r'^\d{4}-\d{2}-\d{2}',post['date']):
                            raise ValueError('Post date required')
                        if post['kind'] == 'repost' and not post.get('originalAuthor'):
                            raise ValueError('Reposts require originalAuthor; never infer endorsement')
                        item = {**source,**post,'author':'Rolf Selås','id':f"social-{n}"}
                        for c, part in enumerate(chunks(post['text'])):
                            output.append(make_chunk(item,part,c))
                else:
                    raise ValueError('Unknown input type')
            if len(output) == before:
                raise ValueError('No readable text')
            statuses.append({'id':source['id'],'status':'indexed','chunks':len(output)-before})
        except (OSError, ValueError, KeyError, subprocess.SubprocessError):
            del output[before:]
            statuses.append({'id':source['id'],'status':'not-indexed: missing, changed, or invalid source','chunks':0})
    if len(output) > 10_000:
        raise ValueError('Corpus exceeds service capacity')
    return {'version':1,'chunks':output,'sourceStatus':statuses}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--fetch-master', action='store_true', help='Download ONLY the pinned public thesis PDF')
    parser.add_argument('--strict', action='store_true', help='Require every approved source to be indexed')
    args = parser.parse_args()
    manifest = json.loads((ROOT / 'sources.json').read_text(encoding='utf-8'))
    if args.fetch_master:
        fetch_master(next(s for s in manifest['sources'] if s['id'] == 'master'))
    corpus = build(manifest)
    if args.strict and any(s['status'].startswith('not-indexed') for s in corpus['sourceStatus']):
        raise SystemExit('Missing approved sources; no corpus was written.')
    dest = local_path('.local/corpus.json')
    dest.parent.mkdir(mode=0o700, exist_ok=True)
    fd, name = tempfile.mkstemp(dir=dest.parent)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            json.dump(corpus, f, ensure_ascii=False)
        os.chmod(name, 0o600)
        os.replace(name, dest)
    finally:
        if os.path.exists(name):
            os.unlink(name)
    print(json.dumps({'chunks':len(corpus['chunks']),'sources':corpus['sourceStatus']},ensure_ascii=False,indent=2))


if __name__ == '__main__':
    main()
