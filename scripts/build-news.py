"""Build Fagstrøm from public RSS. Standard library only; no keys or model calls."""
import argparse
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime
from html import escape
from pathlib import Path
from zoneinfo import ZoneInfo
import json
import re
import urllib.request
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'site' / 'fagstrom'
MAX_BYTES = 2_000_000
MAX_AGE = timedelta(days=180)
SOURCES = [
    dict(id='edpb', name='European Data Protection Board', topic='Personvern og styring', url='https://www.edpb.europa.eu/feed/news_en', host='www.edpb.europa.eu'),
    dict(id='dpc', name='Digital Preservation Coalition', topic='Arkiv og bevaring', url='https://www.dpconline.org/news?format=feed&type=rss', host='www.dpconline.org'),
]
JOBS = re.compile(r'job-vacanc|\bvacanc(?:y|ies)\b|\binternships?\b|\bjob openings?\b|\brecruitment\b', re.I)


def safe_url(url, source):
    """Only HTTPS publisher links, including for the checked-in fallback."""
    if not isinstance(url, str) or re.search(r'[\x00-\x20\x7f\\]', url):
        return False
    try:
        parsed = urlsplit(url)
        return (parsed.scheme == 'https' and parsed.hostname == source['host']
                and parsed.username is None and parsed.password is None
                and parsed.port in (None, 443))
    except ValueError:
        return False


def normalise_item(item, source, now):
    if not isinstance(item, dict):
        return None
    title, url, date = item.get('title'), item.get('url'), item.get('date')
    if not isinstance(title, str) or not isinstance(date, str) or not safe_url(url, source):
        return None
    title = ' '.join(title.split())
    if not title or JOBS.search(url + ' ' + title):
        return None
    try:
        date = datetime.fromisoformat(date)
        if date.tzinfo is None:
            return None
        date = date.astimezone(timezone.utc)
        if not now - MAX_AGE <= date <= now:
            return None
    except (ValueError, TypeError, OverflowError):
        return None
    return dict(title=title[:350], url=url, date=date.isoformat(),
                source=source['name'], topic=source['topic'])


def parse_feed(raw, source, now):
    if len(raw) > MAX_BYTES:
        raise ValueError('Feed too large')
    text = raw.decode('utf-8-sig')
    if '<!DOCTYPE' in text.upper() or '<!ENTITY' in text.upper():
        raise ValueError('Unsupported XML declarations')
    root = ET.fromstring(text)
    if root.tag != 'rss' or root.find('channel') is None:
        raise ValueError('Expected RSS')
    entries = []
    for item in root.findall('./channel/item'):
        try:
            date = parsedate_to_datetime(item.findtext('pubDate') or '')
            if date.tzinfo is None:
                date = date.replace(tzinfo=timezone.utc)
            record = normalise_item(dict(title=item.findtext('title') or '',
                url=(item.findtext('link') or '').strip(), date=date.isoformat()), source, now)
            if record:
                entries.append(record)
        except (ValueError, TypeError, OverflowError):
            continue
    return entries


def collect(previous, fixtures=None, now=None):
    now = now or datetime.now(timezone.utc)
    records, states = [], []
    cached = previous.get('items', []) if isinstance(previous, dict) else []
    cached = cached if isinstance(cached, list) else []
    for source in SOURCES:
        try:
            if fixtures:
                raw = (fixtures / (source['id'] + '.xml')).read_bytes()
            else:
                request = urllib.request.Request(source['url'], headers={
                    'User-Agent': 'RolfFagstrom/1.0 (+https://rolfss.github.io/Click-here-for-newest-projects/)'
                })
                with urllib.request.urlopen(request, timeout=20) as response:
                    raw = response.read(MAX_BYTES + 1)
            entries = parse_feed(raw, source, now)
            if not entries:
                raise ValueError('No usable recent items')
            records.extend(entries)
            states.append(dict(name=source['name'], ok=True))
        except (OSError, ValueError, ET.ParseError, OverflowError) as exc:
            print(f"Warning: {source['name']}: {type(exc).__name__}: {exc}")
            for item in cached:
                if isinstance(item, dict) and item.get('source') == source['name']:
                    record = normalise_item(item, source, now)
                    if record:
                        records.append(record)
            states.append(dict(name=source['name'], ok=False))
    unique = {}
    for item in records:
        if item['url'] not in unique or item['date'] > unique[item['url']]['date']:
            unique[item['url']] = item
    return dict(checked=now.isoformat(), sources=states,
                items=sorted(unique.values(), key=lambda x: (x['date'], x['url']), reverse=True)[:60])


def render(data):
    now = datetime.fromisoformat(data['checked'])
    cards = []
    for item in data['items']:
        source = next((s for s in SOURCES if s['name'] == item.get('source')), None) if isinstance(item, dict) else None
        item = normalise_item(item, source, now) if source else None
        if not item:
            continue
        e = {key: escape(value, quote=True) for key, value in item.items()}
        date_label = datetime.fromisoformat(item['date']).astimezone(ZoneInfo('Europe/Oslo')).strftime('%d.%m.%Y')
        cards.append(f'<article data-topic="{e["topic"]}"><div class="meta"><span>{e["topic"]}</span><time datetime="{e["date"]}">{date_label}</time></div><h2><a href="{e["url"]}" rel="noreferrer">{e["title"]} <span aria-hidden="true">↗</span></a></h2><p>{e["source"]}</p></article>')
    failed = [s['name'] for s in data['sources'] if not s['ok']]
    warning = '<p class="warning">Kunne ikke oppdatere: ' + escape(', '.join(failed)) + '. Eventuelle tidligere saker beholdes med opprinnelig publiseringsdato.</p>' if failed else ''
    template = (OUT / 'template.html').read_text(encoding='utf-8')
    checked_label = now.astimezone(ZoneInfo('Europe/Oslo')).strftime('%d.%m.%Y kl. %H:%M') + ' (Oslo)'
    return (template.replace('{{checked}}', escape(data['checked'], quote=True))
            .replace('{{checked_label}}', checked_label).replace('{{warning}}', warning)
            .replace('{{cards}}', '\n'.join(cards) or '<p>Ingen saker tilgjengelige. Bruk kildelenkene nedenfor.</p>'))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--fixtures', type=Path, help='Local XML for testing; production fetches RSS directly.')
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    try:
        previous = json.loads((OUT / 'news.json').read_text(encoding='utf-8'))
    except (OSError, ValueError):
        previous = {}
    data = collect(previous, args.fixtures)
    html = render(data)
    (OUT / 'news.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (OUT / 'index.html').write_text(html, encoding='utf-8')
    print(f"Generated {len(data['items'])} articles; {sum(s['ok'] for s in data['sources'])}/{len(SOURCES)} sources refreshed")


if __name__ == '__main__':
    main()
