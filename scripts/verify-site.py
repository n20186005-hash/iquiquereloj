"""Check built routes, reciprocal alternates, sitemap and local asset/anchor links."""
import json,re
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
from xml.etree import ElementTree as ET
root=Path('dist');base='https://iquiquereloj.com';issues=[]
assert (root/'es/index.html').exists() and (root/'en/index.html').exists(), 'Wrong or empty build directory'
class Page(HTMLParser):
 def __init__(self,p):
  super().__init__();self.path=p;self.h1=0;self.links=[];self.alts={};self.ids=set();self.canonical=None;self.robots='';self.title='';self.in_title=False;self.lang='';self.feed(p.read_text())
 def handle_starttag(self,t,a):
  a=dict(a)
  if t=='html':self.lang=a.get('lang','')
  if t=='h1':self.h1+=1
  if a.get('id'):self.ids.add(a['id'])
  if t=='a' and a.get('href'):self.links.append(a['href'])
  if t in ['img','script','source']:
   v=a.get('src') or a.get('srcset')
   if v:self.links.append(v.split()[0])
  if t=='link':
   if a.get('rel')=='canonical':self.canonical=a.get('href')
   if a.get('rel')=='alternate':self.alts[a.get('hreflang')]=a.get('href')
   if a.get('rel') in ['stylesheet','manifest','icon','apple-touch-icon']:self.links.append(a.get('href',''))
  if t=='meta' and a.get('name')=='robots':self.robots=a.get('content','')
  if t=='title':self.in_title=True
 def handle_endtag(self,t):
  if t=='title':self.in_title=False
 def handle_data(self,d):
  if self.in_title:self.title+=d
pages={('/'+str(p.relative_to(root)).replace('index.html','')):Page(p) for p in root.rglob('index.html')}
assert len(pages)==33, len(pages)
for url,page in pages.items():
 if url=='/':continue
 if page.h1!=1:issues.append(f'{url}: H1 count {page.h1}')
 if page.canonical!=base+url:issues.append(f'{url}: canonical {page.canonical}')
 if not page.title.strip() or '<' in page.title:issues.append(f'{url}: invalid title')
 expected_lang=url.split('/')[1];expected_lang='zh-CN' if expected_lang=='zh' else expected_lang
 if page.lang!=expected_lang:issues.append(f'{url}: html lang {page.lang}')
 for lang,target in page.alts.items():
  path=urlsplit(target).path
  if path not in pages:issues.append(f'{url}: missing alternate {target}')
  elif lang!='x-default' and pages[path].alts.get(url.split('/')[1])!=base+url:issues.append(f'{url}: nonreciprocal alternate {target}')
 for link in page.links:
  u=urlsplit(link)
  if u.scheme and u.netloc!='iquiquereloj.com':continue
  if link.startswith('//'):continue
  path=unquote(u.path) or url
  if not path.startswith('/'):continue
  if path.rstrip('/') and not (root/path.lstrip('/')).exists():issues.append(f'{url}: missing target {link}')
  if u.fragment and path in pages and unquote(u.fragment) not in pages[path].ids:issues.append(f'{url}: missing anchor {link}')
 if any(k in url for k in ['privacy-policy','terms-of-service','cookie-settings']) and 'noindex' not in page.robots:issues.append(f'{url}: legal page indexable')
xml=ET.parse(root/'sitemap.xml');urls={n.text for n in xml.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')}
expected={base+u for u,p in pages.items() if u!='/' and 'noindex' not in p.robots}
if urls!=expected:issues.append(f'sitemap mismatch missing={expected-urls}, extra={urls-expected}')
assert (root/'404.html').exists() and 'noindex' in (root/'404.html').read_text()
for issue in issues: print(issue)
assert not issues, f'{len(issues)} failed checks'
print(f'PASS: {len(pages)} normal routes, {len(urls)} sitemap entries, H1, canonical, reciprocal hreflang, local links/assets/anchors, legal exclusions and 404 noindex')
