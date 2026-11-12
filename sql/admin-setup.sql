-- 새 app-PWA-eye 전용 초기 설정. 아직 원격 DB에 실행하지 않았습니다.
-- 기존 홈페이지 DB에 실행하지 마세요. 테이블이 이미 있다면 구조/정책을 먼저 검토하세요.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('admin','user'))
);
alter table public.profiles enable row level security;
revoke all on public.profiles from public,anon,authenticated;
grant select on public.profiles to authenticated;
create policy "read_own_role" on public.profiles for select to authenticated using (id=(select auth.uid()));

create or replace function private.is_admin() returns boolean
language sql stable security invoker set search_path = '' as $$
  select exists(select 1 from public.profiles where id=(select auth.uid()) and role='admin');
$$;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

create table public.doctors (
  id bigint generated always as identity primary key,
  name text not null, initial text not null default '', color text not null default '#2d83f5',photo_url text
);
create table public.doctor_weekly_schedules (
  id bigint generated always as identity primary key,
  doctor_id bigint not null references public.doctors(id),weekday integer not null check(weekday between 0 and 6),
  period text not null check(period in ('morning','full')),end_time time,
  saturday_weeks text not null default 'all' check(saturday_weeks in ('all','first_third','second_fourth')),
  unique(doctor_id,weekday)
);
create table public.doctor_date_schedules (
  id bigint generated always as identity primary key,
  doctor_id bigint not null references public.doctors(id),schedule_date date not null,
  period text not null check(period in ('morning','full')),end_time time,unique(doctor_id,schedule_date)
);
create table public.doctor_closures (
  id bigint generated always as identity primary key,
  doctor_id bigint not null references public.doctors(id),start_date date not null,end_date date not null,
  check(end_date>=start_date),unique(doctor_id,start_date,end_date)
);
create table public.clinic_hours (
  id text primary key check(id in ('weekday','saturday','holiday','substitute','lunch')),
  start_time time not null,end_time time not null,check(end_time>start_time)
);
create table public.doctor_about_profiles (
  doctor_id bigint primary key references public.doctors(id),greeting text,
  career jsonb not null default '[]',activities jsonb not null default '[]',specialties jsonb not null default '[]',
  profile_photo_url text,is_visible boolean not null default true,
  check(jsonb_typeof(career)='array' and jsonb_typeof(activities)='array' and jsonb_typeof(specialties)='array')
);
create table public.equipment (
  id bigint generated always as identity primary key,category text not null check(category in ('exam','surgery','treatment')),
  title text not null,description text,image_url text
);
create table public.content_pages (
  id bigint generated always as identity primary key,page_key text not null check(page_key in ('guide','before','after','dream','faq')),
  title text not null,content text not null,image_url text,sort_order integer not null default 0,is_published boolean not null default false
);
create table public.notices (
  id bigint generated always as identity primary key,notice_date date not null,title text not null,content text not null,
  image_url text,is_published boolean not null default false
);
create table public.blog_posts (
  id bigint generated always as identity primary key,post_date date not null,title text not null,content text not null,
  source text,source_url text,image_url text,is_published boolean not null default false
);
create table public.app_settings (
  id text primary key check(id in ('clinic_name','logo_url','kakao_url','naver_url','phone')),value text not null
);
create index on public.doctor_date_schedules(schedule_date);
create index on public.doctor_closures(start_date,end_date);
create index on public.content_pages(page_key,sort_order,id);

do $$
declare table_name text;
begin
  foreach table_name in array array['doctors','doctor_weekly_schedules','doctor_date_schedules','doctor_closures','clinic_hours','doctor_about_profiles','equipment','content_pages','notices','blog_posts','app_settings'] loop
    execute format('alter table public.%I enable row level security',table_name);
    execute format('revoke all on table public.%I from public,anon,authenticated',table_name);
    execute format('grant select on table public.%I to anon,authenticated',table_name);
    execute format('grant insert,update,delete on table public.%I to authenticated',table_name);
    if table_name in ('content_pages','notices','blog_posts') then
      execute format('create policy public_read on public.%I for select to anon,authenticated using(is_published)',table_name);
    elsif table_name='doctor_about_profiles' then
      execute format('create policy public_read on public.%I for select to anon,authenticated using(is_visible)',table_name);
    else
      execute format('create policy public_read on public.%I for select to anon,authenticated using(true)',table_name);
    end if;
    execute format('create policy admin_manage on public.%I for all to authenticated using((select private.is_admin())) with check((select private.is_admin()))',table_name);
  end loop;
end $$;
grant usage on schema public to anon,authenticated;
-- 이 설정으로 만든 ID 시퀀스에만 권한을 부여합니다.
do $$
declare table_name text; sequence_name text;
begin
  foreach table_name in array array['doctors','doctor_weekly_schedules','doctor_date_schedules','doctor_closures','equipment','content_pages','notices','blog_posts'] loop
    sequence_name:=pg_get_serial_sequence('public.'||table_name,'id');
    execute format('grant usage,select on sequence %s to authenticated',sequence_name);
  end loop;
end $$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('clinic-assets','clinic-assets',true,5242880,array['image/jpeg','image/png','image/webp','image/gif']);
create policy clinic_assets_read on storage.objects for select to anon,authenticated using(bucket_id='clinic-assets');
create policy clinic_assets_insert on storage.objects for insert to authenticated with check(bucket_id='clinic-assets' and (select private.is_admin()));
create policy clinic_assets_update on storage.objects for update to authenticated using(bucket_id='clinic-assets' and (select private.is_admin())) with check(bucket_id='clinic-assets' and (select private.is_admin()));
create policy clinic_assets_delete on storage.objects for delete to authenticated using(bucket_id='clinic-assets' and (select private.is_admin()));
commit;

-- Supabase Auth의 Users에서 관리자 계정을 만든 뒤 DB 관리자가 실행합니다.
-- insert into public.profiles(id,role) values ('관리자-계정-UUID','admin')
-- on conflict(id) do update set role=excluded.role;
