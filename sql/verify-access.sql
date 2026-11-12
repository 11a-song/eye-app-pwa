-- Real database policy checks. All test content is rolled back; no Auth users are created.
begin;
insert into public.content_pages(page_key,title,content,is_published) values('faq','__access_probe__','draft',false);
set local role anon;
do $check$
begin
  if exists(select 1 from public.content_pages where title='__access_probe__') then raise exception 'Anonymous draft disclosure'; end if;
  begin
    insert into public.doctors(name) values('__access_probe__');
    raise exception 'Anonymous write was allowed';
  exception when insufficient_privilege then null; end;
end $check$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","user_metadata":{"role":"admin"}}',true);
set local role authenticated;
do $check$
begin
  if private.is_admin() then raise exception 'Ordinary user became admin'; end if;
  if exists(select 1 from public.content_pages where title='__access_probe__') then raise exception 'Ordinary user draft disclosure'; end if;
  begin
    insert into public.doctors(name) values('__access_probe__');
    raise exception 'Ordinary user write was allowed';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.profiles(id,role) values(auth.uid(),'admin');
    raise exception 'Role escalation was allowed';
  exception when insufficient_privilege then null; end;
  begin
    insert into storage.objects(bucket_id,name) values('clinic-assets','__access_probe__.jpg');
    raise exception 'Ordinary user upload was allowed';
  exception when insufficient_privilege then null; end;
end $check$;
reset role;
rollback;
select 'PASS: anonymous/ordinary writes, draft disclosure, role escalation and storage upload blocked; tests rolled back' as result;
