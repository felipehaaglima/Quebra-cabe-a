// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222';
let db: PGlite;
const board = { schemaVersion: 1, puzzleId: 'lago-sereno-24-v1', definitionKey: 'test', model: { state: {}, bags: [], bagReturns: [], order: [], guideEnabled: true } };
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
    create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text);
    alter table storage.objects enable row level security; grant usage on schema storage to authenticated,anon; grant select,insert on storage.objects to authenticated;
    create function storage.foldername(name text) returns text[] language sql immutable as $$select (string_to_array(name,'/'))[1:greatest(array_length(string_to_array(name,'/'),1)-1,0)]$$;`);
  await db.exec(await readFile(new URL('../../supabase/migrations/202610310001_accounts_and_backups.sql', import.meta.url), 'utf8'));
  await db.query('insert into auth.users(id) values($1),($2)',[A,B]);
}, 30000);
afterAll(async () => { await db.close(); });
async function asUser(id: string, work: () => Promise<void>) {
  await db.exec('set role authenticated'); await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
  try { await work(); } finally { await db.exec('reset role'); }
}
describe('migração PostgreSQL e isolamento de dados', () => {
  it('cria perfis e permite ler somente o próprio', async () => {
    await asUser(A, async () => { expect((await db.query<{ id: string }>('select id from public.profiles')).rows).toEqual([{id:A}]); });
    await db.exec('set role anon'); try { await expect(db.query('select * from public.profiles')).rejects.toThrow(); } finally { await db.exec('reset role'); }
  });
  it('cria cópia própria, oculta de outro usuário e bloqueia dono forjado', async () => {
    let id = '';
    await asUser(A, async () => {
      const result = await db.query<{id:string}>('insert into public.cloud_saves(owner_id,request_id,puzzle_id,snapshot) values($1,gen_random_uuid(),$2,$3) returning id',[A,board.puzzleId,board]); id=result.rows[0].id;
      await expect(db.query('insert into public.cloud_saves(owner_id,request_id,puzzle_id,snapshot) values($1,gen_random_uuid(),$2,$3)',[B,board.puzzleId,board])).rejects.toThrow(/row-level security/);
      await expect(db.query('update public.cloud_saves set snapshot=$1 where id=$2',[board,id])).rejects.toThrow();
      await expect(db.query('delete from public.cloud_saves where id=$1',[id])).rejects.toThrow();
    });
    await asUser(B, async () => { expect((await db.query('select * from public.cloud_saves where id=$1',[id])).rows).toEqual([]); });
    await db.exec('set role anon'); try { await expect(db.query('select * from public.cloud_saves')).rejects.toThrow(); } finally { await db.exec('reset role'); }
  });
  it('nega moedas e controle de timestamp/identidade pelo cliente', async () => {
    await asUser(A, async () => {
      await expect(db.query('insert into public.cloud_saves(owner_id,request_id,puzzle_id,snapshot) values($1,gen_random_uuid(),$2,$3)',[A,board.puzzleId,{...board,model:{...board.model,localCoinBalance:999}}])).rejects.toThrow(/board_snapshot_shape/);
      await expect(db.query('insert into public.cloud_saves(id,owner_id,request_id,puzzle_id,snapshot,created_at) values(gen_random_uuid(),$1,gen_random_uuid(),$2,$3,now())',[A,board.puzzleId,board])).rejects.toThrow(/permission denied/);
    });
  });
  it('Storage é privado e restringe escrita/leitura à pasta do dono', async () => {
    await asUser(A, async () => {
      await db.query('insert into storage.objects(bucket_id,name) values($1,$2)',['puzzle-private',`${A}/foto.png`]);
      await expect(db.query('insert into storage.objects(bucket_id,name) values($1,$2)',['puzzle-private',`${B}/foto.png`])).rejects.toThrow(/row-level security/);
      expect((await db.query('select name from storage.objects')).rows).toHaveLength(1);
    });
    await asUser(B, async () => { expect((await db.query('select name from storage.objects')).rows).toHaveLength(0); });
    expect((await db.query<{public:boolean}>('select public from storage.buckets')).rows[0].public).toBe(false);
  });
});
