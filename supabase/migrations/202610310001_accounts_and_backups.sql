-- Run through Supabase migrations, separately in preview and production.
begin;
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy profiles_read_self on public.profiles for select to authenticated using ((select auth.uid()) = id);
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
create function public.initialize_puzzle_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
revoke all on function public.initialize_puzzle_profile() from public, anon, authenticated;
create trigger on_puzzle_user_created after insert on auth.users for each row execute function public.initialize_puzzle_profile();
insert into public.profiles (id) select id from auth.users on conflict do nothing;

-- Immutable, private copies. They are not financial or multiplayer authority.
create table public.cloud_saves (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  request_id uuid not null,
  puzzle_id text not null check (puzzle_id in ('lago-sereno-24-v1', 'lago-sereno-48-v1')),
  snapshot jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  unique (owner_id, request_id),
  constraint board_snapshot_shape check (coalesce((
    jsonb_typeof(snapshot) = 'object'
    and snapshot ?& array['schemaVersion','puzzleId','definitionKey','model']
    and snapshot ->> 'schemaVersion' = '1'
    and snapshot ->> 'puzzleId' = puzzle_id
    and jsonb_typeof(snapshot -> 'model') = 'object'
    and snapshot -> 'model' ?& array['state','bags','bagReturns','order','guideEnabled']
    and not (snapshot -> 'model' ?| array['localCoinBalance','rewardLedger','preferences','camera'])
    and not (snapshot ?| array['owner_id','camera','localCoinBalance','rewardLedger'])
    and octet_length(snapshot::text) <= 524288
  ), false))
);
create index cloud_saves_owner_recent on public.cloud_saves (owner_id, created_at desc, id desc);
alter table public.cloud_saves enable row level security;
create policy cloud_saves_read_self on public.cloud_saves for select to authenticated using ((select auth.uid()) = owner_id);
create policy cloud_saves_create_self on public.cloud_saves for insert to authenticated with check ((select auth.uid()) = owner_id);
revoke all on public.cloud_saves from anon, authenticated;
grant select on public.cloud_saves to authenticated;
grant insert (owner_id, request_id, puzzle_id, snapshot) on public.cloud_saves to authenticated;

-- Private storage foundation. Demo assets remain versioned in the app; no upload UI yet.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('puzzle-private', 'puzzle-private', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
create policy puzzle_private_read on storage.objects for select to authenticated
using (bucket_id = 'puzzle-private' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy puzzle_private_insert on storage.objects for insert to authenticated
with check (bucket_id = 'puzzle-private' and (storage.foldername(name))[1] = (select auth.uid())::text);
-- No update/delete grants or policies for immutable backups/assets in this phase.
commit;
