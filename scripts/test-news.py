"""Deterministic, offline regression tests: python3 scripts/test-news.py."""
import importlib.util
from pathlib import Path
from datetime import datetime, timezone, timedelta
from email.utils import format_datetime
from html import escape
from io import BytesIO
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('news', ROOT / 'scripts/build-news.py')
news = importlib.util.module_from_spec(spec)
spec.loader.exec_module(news)


class NewsTests(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 9, 22, 12, tzinfo=timezone.utc)
        self.source = news.SOURCES[0]

    def feed(self, title='News about GDPR', url=None, date=None):
        url = url if url is not None else 'https://www.edpb.europa.eu/news/test'
        date = date if date is not None else format_datetime(self.now - timedelta(days=1))
        return ('<rss><channel><item><title>' + escape(title) + '</title><link>'
                + escape(url) + '</link><pubDate>' + escape(date)
                + '</pubDate></item></channel></rss>').encode()

    def record(self, **changes):
        item = dict(title='News about GDPR', url='https://www.edpb.europa.eu/news/test',
                    date=(self.now - timedelta(days=1)).isoformat(),
                    source=self.source['name'], topic=self.source['topic'])
        return dict(item, **changes)

    def data(self, items=None):
        return dict(checked=self.now.isoformat(), sources=[], items=items or [])

    def test_both_sources(self):
        for source in news.SOURCES:
            records = news.parse_feed(self.feed(url=f"https://{source['host']}/news/test"), source, self.now)
            self.assertEqual(len(records), 1)
            self.assertEqual(records[0]['source'], source['name'])

    def test_untrusted_urls(self):
        for url in ['javascript:alert(1)', 'http://www.edpb.europa.eu/news',
                    'https://evil.example/test', 'https://www.edpb.europa.eu@evil.example/test',
                    'https://user@www.edpb.europa.eu/news', 'https://www.edpb.europa.eu:444/news',
                    'https://www.edpb.europa.eu:bad/news', 'https://[invalid/news',
                    'https://www.edpb.europa.eu/\\evil', 'https://www.edpb.europa.eu/a b']:
            with self.subTest(url=url):
                self.assertEqual(news.parse_feed(self.feed(url=url), self.source, self.now), [])

    def test_invalid_old_and_future_dates(self):
        for date in ['nonsense', 'Mon, 21 Sep 2020 07:26:07 +0000',
                     format_datetime(self.now + timedelta(seconds=1))]:
            self.assertEqual(news.parse_feed(self.feed(date=date), self.source, self.now), [])

    def test_age_boundaries(self):
        for delta, expected in [(timedelta(days=180), 1), (timedelta(days=180, seconds=1), 0)]:
            self.assertEqual(len(news.parse_feed(self.feed(date=format_datetime(self.now - delta)), self.source, self.now)), expected)

    def test_timezone_normalisation(self):
        records = news.parse_feed(self.feed(date='Mon, 21 Sep 2026 09:00:00 +0200'), self.source, self.now)
        self.assertEqual(records[0]['date'], '2026-09-21T07:00:00+00:00')

    def test_job_filter(self):
        for title in ['Vacancy for archivist', 'Job vacancies', 'Internships', 'Recruitment update']:
            self.assertEqual(news.parse_feed(self.feed(title=title), self.source, self.now), [])
        self.assertTrue(news.parse_feed(self.feed(title='2025 NDSA Staffing Survey Report Now Available'), self.source, self.now))

    def test_blank_and_long_titles(self):
        self.assertEqual(news.parse_feed(self.feed(title='   '), self.source, self.now), [])
        self.assertEqual(len(news.parse_feed(self.feed(title='a' * 400), self.source, self.now)[0]['title']), 350)

    def test_html_escaping(self):
        item = self.record(title='<script>alert(1)</script>')
        html = news.render(self.data([item]))
        self.assertNotIn('<script>alert(1)', html)
        self.assertIn('&lt;script&gt;', html)

    def test_xml_declarations_rejected(self):
        for raw in [b'<!DOCTYPE rss [<!ENTITY x "test">]><rss><channel/></rss>',
                    b'<!ENTITY x "test"><rss><channel/></rss>']:
            with self.assertRaises(ValueError):
                news.parse_feed(raw, self.source, self.now)

    def test_non_rss_rejected(self):
        with self.assertRaises(ValueError):
            news.parse_feed(b'<html>upstream error</html>', self.source, self.now)

    def test_oversized_feed_rejected(self):
        with self.assertRaises(ValueError):
            news.parse_feed(b'x' * (news.MAX_BYTES + 1), self.source, self.now)

    def test_offline_fallback_is_validated(self):
        previous = self.data([self.record(), None, {}, self.record(date='invalid'),
                              self.record(date='2026-09-21'), self.record(url='https://evil.example'),
                              self.record(date='2020-01-01T00:00:00+00:00')])
        with patch.object(news.urllib.request, 'urlopen', side_effect=OSError('offline')):
            data = news.collect(previous, now=self.now)
        self.assertEqual(data['items'], [self.record()])
        self.assertTrue(all(not s['ok'] for s in data['sources']))
        self.assertIn('Kunne ikke oppdatere', news.render(data))

    def test_invalid_snapshot_shape(self):
        with patch.object(news.urllib.request, 'urlopen', side_effect=OSError('offline')):
            for previous in [None, [], {'items': None}, {'items': {}}]:
                self.assertEqual(news.collect(previous, now=self.now)['items'], [])

    def test_empty_upstream_retains_snapshot(self):
        with patch.object(news.urllib.request, 'urlopen', side_effect=lambda *a, **k: BytesIO(b'<rss><channel/></rss>')):
            data = news.collect(self.data([self.record()]), now=self.now)
        self.assertEqual(data['items'], [self.record()])
        self.assertTrue(all(not s['ok'] for s in data['sources']))

    def test_live_fetch_contract(self):
        requests = []
        def fetch(request, timeout):
            requests.append((request, timeout))
            source = next(s for s in news.SOURCES if s['url'] == request.full_url)
            return BytesIO(self.feed(url=f"https://{source['host']}/news/test"))
        with patch.object(news.urllib.request, 'urlopen', side_effect=fetch):
            data = news.collect({}, now=self.now)
        self.assertEqual(len(data['items']), 2)
        self.assertTrue(all(s['ok'] for s in data['sources']))
        self.assertTrue(all(r.get_header('User-agent') and timeout == 20 for r, timeout in requests))

    def test_sort_deduplicate_and_limit(self):
        items = [self.record(url=f'https://www.edpb.europa.eu/news/{i}',
                            date=(self.now - timedelta(days=i)).isoformat()) for i in range(80)]
        with patch.object(news.urllib.request, 'urlopen', side_effect=OSError('offline')):
            data = news.collect(self.data(items + items[:5]), now=self.now)
        self.assertEqual(len(data['items']), 60)
        self.assertEqual(data['items'], items[:60])

    def test_render_rejects_unsafe_cached_link(self):
        html = news.render(self.data([self.record(url='https://evil.example/')]))
        self.assertNotIn('evil.example', html)
        self.assertIn('Ingen saker tilgjengelige', html)

    def test_fixture_mode(self):
        with tempfile.TemporaryDirectory() as folder:
            for source in news.SOURCES:
                (Path(folder) / (source['id'] + '.xml')).write_bytes(self.feed(url=f"https://{source['host']}/news/test"))
            with patch.object(news.urllib.request, 'urlopen', side_effect=AssertionError('Must not access network')):
                data = news.collect({}, Path(folder), now=self.now)
        self.assertTrue(all(s['ok'] for s in data['sources']))
        self.assertEqual(len(data['items']), 2)

    def test_template_and_navigation(self):
        html = news.render(self.data([self.record()]))
        self.assertNotIn('{{', html)
        self.assertIn('22.09.2026 kl. 14:00 (Oslo)', html)
        self.assertIn('Content-Security-Policy', html)
        self.assertIn('href="./fagstrom/"', (ROOT / 'site/index.html').read_text())
        self.assertIn('Nasjonalarkivet', html)

    def test_workflow_integration(self):
        workflow = (ROOT / '.github/workflows/deploy-pages.yml').read_text()
        self.assertIn('23 */6 * * *', workflow)
        self.assertIn('contents: read', workflow)
        self.assertNotIn('contents: write', workflow)
        self.assertLess(workflow.index('run: python3 scripts/test-news.py'), workflow.index('run: python3 scripts/build-news.py'))
        self.assertLess(workflow.index('run: python3 scripts/build-news.py'), workflow.index('cp -R site/. _site/'))
        self.assertIn('cp -R arkivmuseet/dist _site/arkivmuseet', workflow)


if __name__ == '__main__':
    unittest.main(verbosity=2)
