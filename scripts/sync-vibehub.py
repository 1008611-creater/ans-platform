"""Synchronize public VibeHub pages, catalog membership, and Agent data.

No upstream JavaScript is copied or executed. Public HTML is parsed, stripped of
active content, and internal links point at ANS. CSS is scoped in a separate step.
Run from the ANS repository root: python scripts/sync-vibehub.py
"""
from __future__ import annotations
import concurrent.futures, hashlib, html, json, re, sys, time, urllib.request, os, tempfile, subprocess
from dataclasses import dataclass, field
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse

sys.stdout.reconfigure(encoding='utf-8')
ROOT = Path.cwd()
SITE = 'https://vibe-hub.org'
DATA = ROOT / 'src/data/vibehub'
PUBLIC = ROOT / 'public/vibe-hub/source'
CACHE = Path(os.environ.get('VIBEHUB_SYNC_CACHE', str(Path(tempfile.gettempdir()) / 'ans-vibehub-source-cache')))
for directory in (DATA, PUBLIC, CACHE): directory.mkdir(parents=True, exist_ok=True)
VOID = set('area base br col embed hr img input link meta param source track wbr'.split())
BLOCKED = set('script iframe object embed base meta link style template'.split())
ASSETS = set()
CSS = set()

@dataclass
class Node:
    tag: str
    attrs: dict = field(default_factory=dict)
    children: list = field(default_factory=list)
    parent: object = None
    def has(self, classname): return classname in self.attrs.get('class', '').split()
    def walk(self):
        yield self
        for child in self.children:
            if isinstance(child, Node): yield from child.walk()
    def first(self, predicate): return next((n for n in self.walk() if predicate(n)), None)
    def text(self):
        if self.tag in BLOCKED: return ''
        return ' '.join(c.text() if isinstance(c, Node) else c for c in self.children)
    def clean_text(self): return re.sub(r'\s+', ' ', self.text()).strip()

class Tree(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.root = Node('root'); self.stack = [self.root]; self.feed(source)
        ids = {n.attrs.get('id'): n for n in self.root.walk() if n.attrs.get('id')}
        # Next streaming sections are declared outside main. Materialize them
        # without retaining the streaming scripts or executable RSC payloads.
        for node in list(self.root.walk()):
            key = node.attrs.get('id', '')
            if node.tag == 'template' and key.startswith('B:'):
                streamed = ids.get('S:' + key[2:])
                if streamed and node.parent:
                    i = node.parent.children.index(node)
                    node.parent.children[i:i+1] = streamed.children
                    for child in streamed.children:
                        if isinstance(child, Node): child.parent = node.parent
                    streamed.children = []
    def handle_starttag(self, tag, attrs):
        n = Node(tag, dict(attrs), parent=self.stack[-1]); self.stack[-1].children.append(n)
        if tag not in VOID: self.stack.append(n)
    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID: self.handle_endtag(tag)
    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1, 0, -1):
            if self.stack[i].tag == tag: self.stack = self.stack[:i]; break
    def handle_data(self, text): self.stack[-1].children.append(text)


def load(path):
    key = hashlib.sha256(path.encode()).hexdigest()
    cached = CACHE / (key + '.html')
    if cached.exists() and os.environ.get('VIBEHUB_SYNC_REFRESH') != '1': return cached.read_text(encoding='utf-8')
    last = None
    for attempt in range(3):
        try:
            req = urllib.request.Request(urljoin(SITE, path), headers={'User-Agent': 'ANS-VibeHub-content-sync/1.0'})
            text = urllib.request.urlopen(req, timeout=35).read().decode('utf-8')
            cached.write_text(text, encoding='utf-8'); return text
        except Exception as error:
            last = error
            if attempt < 2: time.sleep(attempt + 1)
    raise last


def remap(value, attribute):
    if not value: return value
    if value.startswith('/vibe-hub/'): return value
    if re.match(r'\s*(javascript|vbscript|data):', value, re.I):
        return '' if not (attribute == 'src' and value.startswith('data:image/')) else value
    if attribute == 'href' and (value.startswith('/') or value.startswith(SITE + '/')):
        parsed = urlparse(urljoin(SITE, value)); path = parsed.path
        lang = 'en' if path == '/en' or path.startswith('/en/') else 'zh'
        path = re.sub(r'^/en(?=/|$)', '', path) or '/'
        aliases = {'/': '/vibe-hub', '/vibehub-skill': '/vibe-hub/vibehub-skill', '/anti-ai-flavor': '/vibe-hub/anti-ai-flavor', '/practice': '/vibe-hub/practice', '/vibehub-skill/lab': '/vibe-hub/lab', '/changelog': '/vibe-hub/updates'}
        if path.startswith('/topics/'):
            target = '/vibe-hub/topics?topic=' + path.rsplit('/', 1)[-1] + '&lang=' + lang
        else:
            target = aliases.get(path, '/vibe-hub' + path) + '?lang=' + lang
        return target + ('#' + parsed.fragment if parsed.fragment else '')
    if attribute in ('src', 'poster') and value == '/assets/logo.png': return '/vibe-hub/vh-logo-v4-tight.png'
    if attribute in ('src', 'poster') and value.startswith('/assets/'):
        ASSETS.add(value); return '/vibe-hub/source' + value
    if attribute in ('src', 'poster') and value.startswith('/'): return urljoin(SITE, value)
    return value


def serialize(n):
    if isinstance(n, str): return html.escape(n)
    if n.tag in BLOCKED: return ''
    if n.attrs.get('hidden') is not None: return ''
    attrs = []
    for key, value in n.attrs.items():
        if key.startswith('on') or key in ('srcdoc', 'nonce', 'integrity'): continue
        if key in ('action', 'formaction'): continue
        if key == 'srcset': continue
        if key == 'style' and value:
            if re.search(r'(expression\s*\(|javascript:)', value, re.I): continue
            def localize_style(match):
                asset = match.group(1)
                if asset == '/assets/logo.png': return 'url("/vibe-hub/vh-logo-v4-tight.png")'
                ASSETS.add(asset)
                return 'url("/vibe-hub/source' + asset + '")'
            value = re.sub(r'url\([\"\']?(/assets/[^)\"\']+)[\"\']?\)', localize_style, value)
        if value is not None:
            if key in ('href', 'src', 'poster'): value = remap(value, key)
            attrs.append(f'{key}="{html.escape(value, quote=True)}"')
        else: attrs.append(key)
    if n.tag == 'a' and n.attrs.get('href', '').startswith('http'):
        attrs = [a for a in attrs if not a.startswith('rel=')]
        attrs.append('rel="noopener noreferrer"')
    if n.tag == 'form': attrs.append('data-local-demo="true"')
    inner = ''.join(serialize(c) for c in n.children)
    attr = (' ' + ' '.join(attrs)) if attrs else ''
    return f'<{n.tag}{attr}>' + ('' if n.tag in VOID else inner + f'</{n.tag}>')



def markdown(node):
    if isinstance(node, str): return node
    if node.tag in BLOCKED: return ''
    # Diagrams are visual teaching aids, not part of the copied prose.
    if node.has('dh-demo') or node.has('interactive-demo') or node.has('flow-journey') or node.has('oil-ui-pro-recommendation'): return ''
    inner = ''.join(markdown(child) for child in node.children)
    if node.tag in ['h1', 'h2', 'h3', 'h4']: return '\n\n' + '#' * int(node.tag[1]) + ' ' + inner.strip() + '\n\n'
    if node.tag == 'a' and node.attrs.get('href'): return '[' + inner.strip() + '](' + node.attrs['href'] + ')'
    if node.tag == 'li': return '\n- ' + inner.strip()
    if node.tag == 'blockquote': return '\n\n> ' + inner.strip().replace('\n', '\n> ') + '\n\n'
    if node.tag in ['p', 'section', 'ul', 'ol', 'pre', 'div']: return '\n' + inner.strip() + '\n'
    if node.tag in ['strong', 'b']: return '**' + inner.strip() + '**'
    if node.tag == 'br': return '\n'
    return inner


def write_json(path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')


def document(path):
    raw = load(path); root = Tree(raw).root
    for n in root.walk():
        if n.tag == 'link' and n.attrs.get('rel') == 'stylesheet': CSS.add(n.attrs.get('href'))
    return root


def catalogs():
    entries = {}; topics = []
    for topic in ['frontend', 'backend', 'product', 'testing', 'technology', 'ai', 'git', 'design']:
        localized = {}
        for lang in ['en', 'zh']:
            path = ('/en' if lang == 'en' else '') + ('' if topic == 'frontend' else '/topics/' + topic)
            root = document(path or '/')
            heading = root.first(lambda n: n.tag == 'h1')
            groups = []
            for section in root.walk():
                if not section.has('cat-section'): continue
                title_node = section.first(lambda n: n.has('cat-title'))
                if not title_node: continue
                # The count lives in a span and is not part of the group name.
                title = ' '.join(c if isinstance(c, str) else c.clean_text() for c in title_node.children if not isinstance(c, Node) or c.tag != 'span').strip()
                slugs = []
                for card in section.walk():
                    if card.tag != 'article' or not card.attrs.get('data-id'): continue
                    slug = card.attrs['data-id']; slugs.append(slug)
                    name = card.first(lambda n: n.tag == 'h3')
                    quote = card.first(lambda n: n.has('card-tagline'))
                    demo = card.first(lambda n: n.has('card-demo'))
                    data = entries.setdefault(slug, {'slug': slug, 'macroCategory': topic})
                    data[lang] = {'name': name.clean_text() if name else slug, 'quote': quote.clean_text() if quote else '', 'category': title, 'preview': serialize(demo) if demo else ''}
                groups.append({'title': title, 'slugs': slugs})
            localized[lang] = {'title': heading.clean_text() if heading else topic, 'groups': groups}
        topics.append({'slug': topic, **localized})
    write_json(DATA / 'catalog.json', {'topics': topics, 'entries': list(entries.values())})
    return entries


def fetch_term(item):
    slug, catalog = item
    summaries = {}
    for lang in ['en', 'zh']:
        path = ('/en/' if lang == 'en' else '/') + slug
        root = document(path)
        body = root.first(lambda n: n.has('detail-body'))
        if body is None: raise ValueError('No detail body: ' + path)
        title = body.first(lambda n: n.tag == 'h1')
        summary = body.first(lambda n: n.has('dh-tagline'))
        quote = body.first(lambda n: n.has('dh-quote-text'))
        agent = body.first(lambda n: n.has('lesson-agent-prompt')) or body.first(lambda n: n.has('flow-agent-prompt'))
        prompt = agent.first(lambda n: n.tag == 'p') if agent else None
        # Quick-check options need official answer feedback, loaded from the
        # Agent lesson snapshot below rather than inferred from markup.
        for node in list(body.walk()):
            if node.has('lesson-practice') or node.has('pronunciation-button'):
                if node.parent: node.parent.children.remove(node)
        summaries[lang] = {
            'name': ''.join(c for c in title.children if isinstance(c, str)).strip() if title else catalog[lang]['name'],
            'description': summary.clean_text() if summary else '',
            'quote': quote.clean_text() if quote else catalog[lang]['quote'],
            'agentPrompt': prompt.clean_text() if prompt else '',
            'html': serialize(body),
            'markdown': re.sub(r'\n{3,}', '\n\n', markdown(body)).strip(),
            'sourceUrl': SITE + path,
        }
        write_json(DATA / 'entries' / lang / (slug + '.json'), summaries[lang])
        try:
            payload = json.loads(load('/api/agent/v1/lessons/' + slug + '?locale=' + lang))
            write_json(DATA / 'lessons' / lang / (slug + '.json'), payload)
        except Exception as error:
            print('LESSON_UNAVAILABLE', slug, lang, str(error), flush=True)
    return {
        'slug': slug, 'name': summaries['en']['name'], 'zhName': summaries['zh']['name'],
        'title': summaries['en']['name'], 'zhTitle': summaries['zh']['name'],
        'description': summaries['en']['description'], 'zhDescription': summaries['zh']['description'],
        'quote': summaries['en']['quote'], 'zhQuote': summaries['zh']['quote'],
        'category': catalog['en']['category'], 'zhCategory': catalog['zh']['category'],
        'macroCategory': catalog['macroCategory'], 'href': '/en/' + slug,
        'sections': [], 'zhSections': [],
    }



def hydrate_catalog_previews():
    # Use the official compact catalog illustrations. Detail-page diagrams are
    # different content and must not silently replace these thumbnails.
    preview_path = DATA / 'catalog-previews.json'
    if not preview_path.exists():
        raise ValueError('Run extract-vibehub-interactions.mjs first to extract official catalog previews')
    previews = json.loads(preview_path.read_text(encoding='utf-8'))
    catalog_path = DATA / 'catalog.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf-8'))
    for entry in catalog['entries']:
        source = previews.get(entry['slug'])
        if not source: raise ValueError('Missing official catalog preview: ' + entry['slug'])
        for lang in ['en', 'zh']:
            root = Tree(source[lang]).root
            cleaned = ''.join(serialize(child) for child in root.children)
            if not cleaned.strip(): raise ValueError('Empty official preview: ' + entry['slug'])
            entry[lang]['preview'] = cleaned
            source[lang] = cleaned
    write_json(preview_path, previews)
    write_json(catalog_path, catalog)


def specials():
    activity_preview = {}
    for slug in ['practice', 'anti-ai-flavor', 'vibehub-skill', 'changelog', 'vibehub-skill/lab']:
        for lang in ['en', 'zh']:
            path = ('/en/' if lang == 'en' else '/') + slug
            root = document(path)
            main = root.first(lambda n: n.tag == 'main')
            title = main.first(lambda n: n.tag == 'h1') if main else None
            if not main: raise ValueError('No main: ' + path)
            expected = {'practice': 'practice-page', 'anti-ai-flavor': 'aif-catalog-page', 'vibehub-skill': 'skill-page', 'changelog': 'changelog-page', 'vibehub-skill/lab': 'learning-lab-page'}[slug]
            if not main.first(lambda n: n.has(expected)):
                if slug == 'changelog':
                    subprocess.run(['node', 'scripts/render-vibehub-specials.mjs'], check=True)
                    continue
                raise ValueError('Unexpected homepage fallback: ' + path)
            write_json(DATA / 'specials' / lang / (slug.replace('/', '-') + '.json'), {'title': title.clean_text() if title else slug, 'html': serialize(main), 'sourceUrl': SITE + path})
            if slug == 'vibehub-skill/lab':
                product = main.first(lambda n: n.has('learning-product'))
                if product:
                    product.attrs['class'] = 'learning-product priority-value'
                    activity_preview[lang] = serialize(product)
    write_json(DATA / 'activity-preview.json', activity_preview)


def agent_data():
    manifest = json.loads(load('/.well-known/vibehub.json'))
    write_json(DATA / 'manifest.json', manifest)
    for lang in ['en', 'zh']:
        payload = json.loads(load('/api/agent/v1/journeys?limit=20&locale=' + lang))
        write_json(DATA / ('journeys-' + lang + '.json'), payload)
        for item in payload.get('data', {}).get('results', []):
            detail = json.loads(load('/api/agent/v1/journeys/' + item['id'] + '?locale=' + lang))
            write_json(DATA / 'journeys' / lang / (item['id'] + '.json'), detail)


def assets():
    # Preserve upstream cascade order for a reproducible, offline CSS build.
    css_order = re.findall(r'<link[^>]+href="[^\"]*/([^/\"]+\.css)(?:\?[^\"]*)?"', load('/en/tooltip'))
    write_json(PUBLIC / 'stylesheets.json', list(dict.fromkeys(css_order)))
    for path in sorted(CSS):
        text = load(path)
        # Keep an exact upstream stylesheet for the scoped build step.
        (PUBLIC / (urlparse(path).path.rsplit('/',1)[-1])).write_text(text, encoding='utf-8')
    for path in sorted(ASSETS):
        target = PUBLIC / path.lstrip('/')
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.exists(): continue
        try: target.write_bytes(urllib.request.urlopen(SITE + path, timeout=30).read())
        except Exception as error: print('ASSET_UNAVAILABLE', path, str(error), flush=True)


def main():
    entries = catalogs(); print('CATALOG', len(entries), flush=True)
    summaries = []; failures = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        tasks = {pool.submit(fetch_term, item): item[0] for item in entries.items()}
        for done, task in enumerate(concurrent.futures.as_completed(tasks), 1):
            try: summaries.append(task.result())
            except Exception as error: failures.append({'slug': tasks[task], 'error': str(error)})
            if done % 30 == 0: print('CONTENT', done, '/', len(entries), flush=True)
    if failures:
        write_json(CACHE / 'failures.json', failures)
        raise RuntimeError('Incomplete content sync: ' + str(failures))
    order = {slug: index for index, slug in enumerate(entries)}
    summaries.sort(key=lambda item: order[item['slug']])
    for path in [ROOT/'src/app/vibe-hub/terms.json', ROOT/'src/app/api/vibe-hub/terms/terms.json', DATA/'terms.json']:
        write_json(path, summaries)
    hydrate_catalog_previews(); specials(); agent_data(); assets()
    hashes = {str(p.relative_to(ROOT)).replace('\\','/'): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(DATA.rglob('*.json')) if p.name != 'provenance.json'}
    write_json(DATA / 'provenance.json', {'source': SITE, 'retrievedAt': datetime.now(timezone.utc).isoformat(), 'termCount': len(entries), 'files': hashes})
    print('COMPLETE', len(entries), 'terms;', len(CSS), 'stylesheets;', len(ASSETS), 'assets', flush=True)

if __name__ == '__main__':
    if '--previews-only' in sys.argv: hydrate_catalog_previews()
    else: main()
