"""Extract the user-selected public homepage into app-native guide data.

Input: .tmp/reference/{index,about,veterans}.html (downloaded read-only).
The designation date is corrected to January 2026 per the clinic's instruction.
"""
import json
from html.parser import HTMLParser
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
class Node:
    def __init__(self,tag='',attrs=()): self.tag,self.attrs,self.children=tag,dict(attrs),[]
    def find(self,predicate):
        for child in self.children:
            if isinstance(child,Node):
                if predicate(child): yield child
                yield from child.find(predicate)
    def text(self):
        text=''.join(c.text() if isinstance(c,Node) else c for c in self.children)
        return text+(' ' if self.tag in ('br','p','small','strong','span') else '')
class Parser(HTMLParser):
    def __init__(self): super().__init__();self.root=Node();self.stack=[self.root]
    def handle_starttag(self,tag,attrs):
        node=Node(tag,attrs);self.stack[-1].children.append(node)
        if tag not in ('area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'): self.stack.append(node)
    def handle_endtag(self,tag):
        for i in range(len(self.stack)-1,0,-1):
            if self.stack[i].tag==tag:self.stack=self.stack[:i];break
    def handle_data(self,text):self.stack[-1].children.append(text)
def load(name):
    p=Parser();p.feed((ROOT/'.tmp/reference'/f'{name}.html').read_text(encoding='utf-8'));return p.root
def by_class(name):return lambda n:name in n.attrs.get('class','').split()
def one(node,predicate):return next(node.find(predicate))
def text(node):return ' '.join(node.text().split())
def tag(name):return lambda n:n.tag==name

home,about,veterans=load('index'),load('about'),load('veterans')
summary=one(home,by_class('home-veterans'))
details=one(summary,by_class('home-veterans-details'))
intro=text(one(veterans,by_class('veterans-intro'))).replace('2025년 1월','2026년 1월')
data={
  'logo':'assets/veterans-logo.svg',
  'summary':{'details':[{'label':text(one(row,tag('dt'))),'value':text(one(row,tag('dd')))} for row in details.children if isinstance(row,Node)],
             'support':[text(n) for n in one(summary,by_class('home-medical-support')).find(tag('li'))]},
  'veterans':{'intro':intro,'notice':text(one(veterans,by_class('veterans-notice'))),'groups':[],'footnotes':[],'conditions':[]},
  'facilities':[],'doctorOrder':[n.attrs['data-doctor-name'] for n in about.find(lambda n:'data-doctor-name' in n.attrs)],
  'equipmentOrder':[n.attrs['data-equipment-category'] for n in about.find(lambda n:'data-equipment-category' in n.attrs)],
  'history':[]
}
for row in one(veterans,by_class('veterans-support-table')).find(tag('tr')):
    th=list(row.find(tag('th')));td=list(row.find(tag('td')))
    if not td:continue
    person=one(th[0],tag('small'))
    target=''.join(c.text() if isinstance(c,Node) else c for c in th[0].children if c is not person)
    data['veterans']['groups'].append({'target':' '.join(target.split()),'person':text(person),'care':text(td[0]),'medicine':text(td[1])})
for p in veterans.find(by_class('veterans-footnote')):
    body=''.join(c.text() if isinstance(c,Node) else c for c in p.children if not isinstance(c,Node) or c.tag!='a')
    data['veterans']['footnotes'].append({'text':' '.join(body.split()),'links':[{'label':text(a),'url':a.attrs['href']} for a in p.find(tag('a'))]})
for row in one(veterans,by_class('veterans-conditions')).find(tag('tr')):
    td=list(row.find(tag('td')))
    if td:data['veterans']['conditions'].append({'label':text(one(row,tag('th'))),'value':text(td[0])})
for floor in about.find(by_class('facility-floor')):
    heading=one(floor,by_class('facility-floor-heading'))
    photos=[]
    for figure in floor.find(tag('figure')):
        img=one(figure,tag('img'))
        photos.append({'src':img.attrs['src'],'alt':img.attrs.get('alt',''),'caption':text(one(figure,tag('figcaption')))})
    data['facilities'].append({'floor':text(one(heading,tag('h3'))),'description':text(one(heading,tag('p'))),'photos':photos})
for year in about.find(by_class('about-history-year')):
    data['history'].append({'year':text(one(year,tag('h4'))),'items':[text(n) for n in one(year,tag('ul')).children if isinstance(n,Node) and n.tag=='li']})
(ROOT/'scripts/guide-reference.js').write_text('// Public website snapshot, 2026-11-12. Designation date corrected by clinic.\nwindow.clinicGuideReference = '+json.dumps(data,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
(ROOT/'.tmp/reference/guide-assets.json').write_text(json.dumps([photo['src'] for floor in data['facilities'] for photo in floor['photos']]+[one(summary,tag('img')).attrs['src']]),encoding='utf-8')
print(json.dumps({'facilities':len(data['facilities']),'photos':sum(len(f['photos']) for f in data['facilities']),'veteranGroups':len(data['veterans']['groups']),'historyYears':len(data['history']),'doctorOrder':data['doctorOrder']},ensure_ascii=False))
