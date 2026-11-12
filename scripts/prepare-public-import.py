"""Build a one-time, guarded import from public API and local reference HTML."""
import json, re
from pathlib import Path
from html.parser import HTMLParser

ROOT = Path(__file__).resolve().parent.parent
SOURCE = Path('C:/Users/2025w/OneDrive/Desktop/Git-song22/song-22')

class Element:
    def __init__(self, tag='', attrs=()):
        self.tag, self.attrs, self.children = tag, dict(attrs), []
    def find(self, predicate):
        for child in self.children:
            if isinstance(child, Element):
                if predicate(child):
                    yield child
                yield from child.find(predicate)
    def text(self):
        value = ''.join(c.text() if isinstance(c, Element) else c for c in self.children)
        if self.tag in ('th', 'td'):
            return value + ' | '
        return value + ('\n' if self.tag in ('p','li','h2','h3','h4','h5','tr','section','summary','br') else '')

class Parser(HTMLParser):
    def __init__(self):
        super().__init__(); self.root=Element(); self.stack=[self.root]
    def handle_starttag(self, tag, attrs):
        node=Element(tag,attrs); self.stack[-1].children.append(node)
        if tag not in ('area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'):
            self.stack.append(node)
    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1,0,-1):
            if self.stack[i].tag==tag:
                self.stack=self.stack[:i]; break
    def handle_data(self, text): self.stack[-1].children.append(text)

def clean(node):
    return '\n'.join(line.strip() for line in node.text().splitlines() if line.strip())

data=json.loads((ROOT/'data/reference-public.json').read_text(encoding='utf-8'))
pages=[]
def page(key,title,content,image=None,published=True):
    pages.append(dict(page_key=key,title=title,content=content,image_url=image,sort_order=len(pages),is_published=published))

parser=Parser(); parser.feed((SOURCE/'vision.html').read_text(encoding='utf-8'))
for section_id,key in [('beforeSurgery','before'),('afterSurgery','after')]:
    section=next(parser.root.find(lambda n:n.attrs.get('id')==section_id))
    for detail in section.find(lambda n:n.tag=='details'):
        summary=next(detail.find(lambda n:n.tag=='summary'))
        title=clean(summary)
        content=clean(detail)
        if content.startswith(title): content=content[len(title):].strip()
        page(key,title,content)
page('guide','내원 안내','시력교정 검사 및 수술은 3층 시력교정수술센터로 내원해 주세요.\n예약 변경은 최소 하루 전에 병원으로 연락해 주세요.\n시력교정수술센터 064-727-2703', 'assets/clinic.jpg')
app=(ROOT/'app.js').read_text(encoding='utf-8')
faq_text=app.split('const faqs = [',1)[1].split('\n];',1)[0]
for title,content in re.findall(r"\['([^']*)','([^']*)'\]",faq_text): page('faq',title,content)
page('dream','드림렌즈 안내','병원에서 확인한 상세 안내를 준비 중입니다. 현재 사용 중인 렌즈의 관리 방법은 병원에서 받은 안내를 확인해 주세요.')
data['content_pages']=pages
data['app_settings']=[dict(id=k,value=v) for k,v in {
    'clinic_name':'연세제일안과','logo_url':'assets/logo.svg',
    'kakao_url':'https://pf.kakao.com/_mRjtn/chat',
    'naver_url':'https://m.booking.naver.com/booking/13/bizes/1336750?theme=place&lang=ko&area=pll',
    'phone':'064-727-2700'}.items()]
(ROOT/'data/public-import.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
payload=json.dumps(data,ensure_ascii=False)
assert '$clinic_import$' not in payload
# All IDs are allocated by the target. Foreign keys are remapped from RETURNING.
sql="""begin;
select pg_advisory_xact_lock(hashtext('clinic_public_initial_import'));
do $import$
declare
  source jsonb := $clinic_import$"""+payload+"""$clinic_import$::jsonb;
  row_data jsonb; doctor_ids jsonb := '{}'; new_id bigint; old_id text;
  table_name text; columns_sql text; values_sql text;
begin
  if exists(select 1 from public.doctors) or exists(select 1 from public.content_pages)
     or exists(select 1 from public.equipment) or exists(select 1 from public.notices)
     or exists(select 1 from public.blog_posts) or exists(select 1 from public.clinic_hours)
     or exists(select 1 from public.app_settings) then
    raise exception 'Initial import requires empty target content tables; no data changed';
  end if;
  for row_data in select value from jsonb_array_elements(source->'doctors') loop
    old_id := row_data->>'id';
    insert into public.doctors(name,initial,color,photo_url)
    values(row_data->>'name',row_data->>'initial',row_data->>'color',row_data->>'photo_url') returning id into new_id;
    doctor_ids := doctor_ids || jsonb_build_object(old_id,new_id);
  end loop;
  foreach table_name in array array['doctor_weekly_schedules','doctor_date_schedules','doctor_closures','clinic_hours','doctor_about_profiles','equipment','notices','blog_posts','content_pages','app_settings'] loop
    for row_data in select value from jsonb_array_elements(source->table_name) loop
      if row_data ? 'doctor_id' then
        if not doctor_ids ? (row_data->>'doctor_id') then raise exception 'Unmapped doctor'; end if;
        row_data := jsonb_set(row_data,'{doctor_id}',doctor_ids->(row_data->>'doctor_id'));
      end if;
      select string_agg(format('%I',key),',' order by key),string_agg(format('r.%I',key),',' order by key)
        into columns_sql,values_sql from jsonb_object_keys(row_data) as keys(key);
      execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I,$1) r',table_name,columns_sql,values_sql,table_name) using row_data;
    end loop;
  end loop;
end $import$;
commit;
"""
(ROOT/'sql/import-public-content.sql').write_text(sql,encoding='utf-8')
print(json.dumps({table:len(rows) for table,rows in data.items()},ensure_ascii=False))
