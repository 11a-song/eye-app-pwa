-- Anonymous, capability-authenticated Web Push. No patient names or check records.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create table public.medication_push_config (
  id boolean primary key default true check (id),
  public_key text,
  private_secret uuid,
  dispatch_secret uuid not null
);
insert into public.medication_push_config(id,dispatch_secret)
select true,vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'jeileye_reminder_dispatch');

create table public.medication_push_devices (
  id uuid primary key,
  token_hash text not null,
  endpoint_hash text not null unique,
  subscription jsonb not null,
  revision bigint not null default 0,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  last_test_at timestamptz
);
create table public.medication_push_jobs (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.medication_push_devices(id) on delete cascade,
  plan_id text not null,
  slot integer not null check(slot between 0 and 3),
  fire_at timestamptz not null,
  state text not null default 'pending' check(state in ('pending','processing','sent','failed')),
  attempts integer not null default 0,
  leased_at timestamptz,
  unique(device_id,plan_id,slot,fire_at)
);
create index medication_push_due on public.medication_push_jobs(fire_at) where state in ('pending','processing');
alter table public.medication_push_config enable row level security;
alter table public.medication_push_devices enable row level security;
alter table public.medication_push_jobs enable row level security;
create policy service_only on public.medication_push_config to service_role using(true) with check(true);
create policy service_only on public.medication_push_devices to service_role using(true) with check(true);
create policy service_only on public.medication_push_jobs to service_role using(true) with check(true);
revoke all on public.medication_push_config,public.medication_push_devices,public.medication_push_jobs from public,anon,authenticated;
grant all on public.medication_push_config,public.medication_push_devices,public.medication_push_jobs to service_role;

-- Only the Edge Function service role can read encrypted signing/dispatch secrets.
create function public.medication_push_keys(p_public text default null,p_private text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.medication_push_config; s uuid;
begin
  if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'unauthorized' using errcode='28000'; end if;
  select * into c from public.medication_push_config where id for update;
  if c.public_key is null and p_public is not null and p_private is not null then
    s:=vault.create_secret(p_private,'jeileye_reminder_vapid');
    update public.medication_push_config set public_key=p_public,private_secret=s where id returning * into c;
  end if;
  return jsonb_build_object('publicKey',c.public_key,
    'privateKey',(select decrypted_secret from vault.decrypted_secrets where id=c.private_secret),
    'dispatchToken',(select decrypted_secret from vault.decrypted_secrets where id=c.dispatch_secret));
end; $$;

-- Replace a device's pending jobs atomically; capability secret is never stored in plaintext.
create function public.medication_push_save(p_id uuid,p_hash text,p_endpoint_hash text,p_subscription jsonb,p_revision bigint,p_jobs jsonb)
returns boolean language plpgsql security invoker set search_path='' as $$
declare d public.medication_push_devices; expiry timestamptz;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  select * into d from public.medication_push_devices where id=p_id for update;
  if found and d.token_hash<>p_hash then raise exception 'unauthorized' using errcode='28000'; end if;
  if d.revision is not null and d.revision>=p_revision then return false; end if;
  select coalesce(max((j->>'fire_at')::timestamptz),now())+interval '1 day' into expiry from jsonb_array_elements(p_jobs) j;
  insert into public.medication_push_devices(id,token_hash,endpoint_hash,subscription,revision,expires_at)
  values(p_id,p_hash,p_endpoint_hash,p_subscription,p_revision,expiry)
  on conflict(id) do update set subscription=excluded.subscription,endpoint_hash=excluded.endpoint_hash,
    revision=excluded.revision,expires_at=excluded.expires_at,updated_at=now();
  delete from public.medication_push_jobs where device_id=p_id and state in ('pending','processing');
  insert into public.medication_push_jobs(device_id,plan_id,slot,fire_at)
  select p_id,j->>'plan_id',(j->>'slot')::integer,(j->>'fire_at')::timestamptz
  from jsonb_array_elements(p_jobs) j on conflict do nothing;
  return true;
end; $$;

create function public.medication_push_claim()
returns setof public.medication_push_jobs language sql security invoker set search_path='' as $$
  update public.medication_push_jobs set state='processing',attempts=attempts+1,leased_at=now()
  where id in (select id from public.medication_push_jobs
    where fire_at<=now() and fire_at>now()-interval '10 minutes' and attempts<3
      and (state='pending' or (state='processing' and leased_at<now()-interval '2 minutes'))
    order by fire_at for update skip locked limit 100)
  returning *;
$$;

revoke all on function public.medication_push_keys(text,text),public.medication_push_save(uuid,text,text,jsonb,bigint,jsonb),public.medication_push_claim() from public,anon,authenticated;
grant execute on function public.medication_push_keys(text,text),public.medication_push_save(uuid,text,text,jsonb,bigint,jsonb),public.medication_push_claim() to service_role;

select cron.schedule('jeileye-eye-drop-push','* * * * *',$cron$
  select net.http_post(
    url:='https://issyhftzmzpudoeidoum.supabase.co/functions/v1/medication-reminders/dispatch',
    headers:=jsonb_build_object('Content-Type','application/json','x-reminder-dispatch',
      (select decrypted_secret from vault.decrypted_secrets where id=(select dispatch_secret from public.medication_push_config where id))),
    body:='{}'::jsonb,timeout_milliseconds:=15000);
$cron$);
select cron.schedule('jeileye-eye-drop-push-cleanup','17 3 * * *',$cron$
  delete from public.medication_push_devices where expires_at<now();
  delete from public.medication_push_jobs where fire_at<now()-interval '1 day';
$cron$);
