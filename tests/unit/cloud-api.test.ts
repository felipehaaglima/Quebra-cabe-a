import { beforeEach, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
const fake = vi.hoisted(() => ({ client: null as SupabaseClient | null }));
vi.mock('server-only',()=>({}));
vi.mock('../../src/lib/supabase/server',()=>({cloudClient:async()=>fake.client}));
import { GET as account } from '../../src/app/api/account/route';
import { POST as auth } from '../../src/app/api/auth/route';
import { GET as list, POST as upload } from '../../src/app/api/backups/route';
import { GET as retrieve } from '../../src/app/api/backups/[id]/route';
import { DEMO, generatePieces, distributePieces } from '../../src/game/core/puzzle/puzzle';
import { PieceController } from '../../src/game/input/piece-controller';
import { toCloudBoard } from '../../src/game/cloud/board';
import { definitionKey } from '../../src/game/persistence/snapshot';
const A='11111111-1111-4111-8111-111111111111', ID='22222222-2222-4222-8222-222222222222';
const model=new PieceController(generatePieces(DEMO),distributePieces(generatePieces(DEMO),DEMO.seed),DEMO,()=>{});
const board=toCloudBoard({schemaVersion:4,puzzleId:DEMO.id,definitionKey:definitionKey(DEMO),revision:1,savedAt:new Date().toISOString(),model:model.exportModel(),camera:{center:{x:0,y:0},relativeZoom:1,angleRad:0}},DEMO.id);
const row={id:ID,puzzle_id:DEMO.id,snapshot:board,created_at:new Date().toISOString()};
const getUser=vi.fn(), send=vi.fn(), verify=vi.fn(), logout=vi.fn();
function client(results: unknown[] = []) {
  const result=()=>Promise.resolve(results.shift()??{data:[],error:null});
  const q={ select:vi.fn(),eq:vi.fn(),order:vi.fn(),limit:vi.fn(),or:vi.fn(),insert:vi.fn(),single:vi.fn(result),maybeSingle:vi.fn(result),then:(resolve:(value:unknown)=>unknown,reject:(reason:unknown)=>unknown)=>result().then(resolve,reject) };
  for(const method of [q.select,q.eq,q.order,q.limit,q.or,q.insert])method.mockReturnValue(q);
  const from=vi.fn(()=>q);
  fake.client={auth:{getUser,signInWithOtp:send,verifyOtp:verify,signOut:logout},from} as unknown as SupabaseClient;
  return {q,from};
}
const request=(path:string,body:unknown,origin='http://localhost')=>new Request(`http://localhost${path}`,{method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify(body)});
beforeEach(()=>{vi.clearAllMocks();fake.client=null;getUser.mockResolvedValue({data:{user:{id:A,email:'pessoa@example.test'}},error:null});send.mockResolvedValue({error:null});verify.mockResolvedValue({error:null});logout.mockResolvedValue({error:null});});
it('degrada sem configuração e não oferece login fictício',async()=>{
  const response=await account();expect(await response.json()).toEqual({configured:false,user:null});
  expect((await auth(request('/api/auth',{action:'send',email:'pessoa@example.test'}))).status).toBe(503);
});
it('exige origem correta, corpo limitado e código válido antes de autenticar',async()=>{
  client();expect((await auth(request('/api/auth',{action:'send',email:'pessoa@example.test'},'https://outro.test'))).status).toBe(403);expect(send).not.toHaveBeenCalled();
  expect((await auth(request('/api/auth',{action:'send',email:'a'.repeat(3000)}))).status).toBe(413);
  expect((await auth(request('/api/auth',{action:'verify',email:'pessoa@example.test',token:'1'}))).status).toBe(400);expect(verify).not.toHaveBeenCalled();
});
it('envia e confirma OTP somente pelo servidor e sai sem apagar estado local',async()=>{
  client();const sent=await auth(request('/api/auth',{action:'send',email:'pessoa@example.test'}));expect(sent.status).toBe(200);expect(send).toHaveBeenCalledWith({email:'pessoa@example.test',options:{shouldCreateUser:true}});
  const confirmed=await auth(request('/api/auth',{action:'verify',email:'pessoa@example.test',token:'123456'}));expect(confirmed.status).toBe(200);expect(verify).toHaveBeenCalledWith({email:'pessoa@example.test',token:'123456',type:'email'});
  expect((await auth(request('/api/auth',{action:'logout'}))).status).toBe(200);expect(logout).toHaveBeenCalledWith({scope:'local'});
});
it('sem sessão não lê ou cria cópias',async()=>{
  const {from}=client();getUser.mockResolvedValue({data:{user:null},error:new Error('Expired')});
  expect((await list(new Request('http://localhost/api/backups'))).status).toBe(401);
  expect((await upload(request('/api/backups',{requestId:ID,board}))).status).toBe(401);expect(from).not.toHaveBeenCalled();
});
it('valida a montagem e sempre deriva dono da sessão, rejeitando campos forjados',async()=>{
  const {q}=client([{data:row,error:null}]);
  const response=await upload(request('/api/backups',{requestId:ID,board}));expect(response.status).toBe(201);expect(q.insert).toHaveBeenCalledWith({owner_id:A,puzzle_id:DEMO.id,request_id:ID,snapshot:board});expect(response.headers.get('cache-control')).toBe('no-store');
  expect((await upload(request('/api/backups',{requestId:ID,board,owner_id:ID}))).status).toBe(400);
  expect((await upload(request('/api/backups',{requestId:ID,board:{...board,model:{...board.model,order:[]}}}))).status).toBe(400);
  expect((await upload(request('/api/backups',{requestId:ID,board:{...board,camera:{}}}))).status).toBe(400);
});
it('idempotência preserva cópia anterior e rejeita reutilização com conteúdo diferente',async()=>{
  client([{data:null,error:{code:'23505'}},{data:row,error:null}]);expect((await upload(request('/api/backups',{requestId:ID,board}))).status).toBe(200);
  client([{data:null,error:{code:'23505'}},{data:{...row,snapshot:{...board,model:{...board.model,guideEnabled:false}}},error:null}]);expect((await upload(request('/api/backups',{requestId:ID,board}))).status).toBe(409);
});
it('consulta filtra pelo dono, e ID de outro usuário resulta em 404',async()=>{
  const {q}=client([{data:null,error:null}]);const response=await retrieve(new Request('http://localhost/api/backups/'+ID),{params:Promise.resolve({id:ID})});expect(response.status).toBe(404);expect(q.eq).toHaveBeenCalledWith('owner_id',A);
});
it('pagina por data e ID, sem perder cópias com mesmo timestamp',async()=>{
  const {q}=client([{data:Array.from({length:20},()=>row),error:null}]);const first=await list(new Request('http://localhost/api/backups'));const result=await first.json();expect(result.next).toBeTruthy();
  client([{data:[],error:null}]);const second=await list(new Request('http://localhost/api/backups?cursor='+encodeURIComponent(result.next)));expect(second.status).toBe(200);
  expect(q.eq).toHaveBeenCalledWith('owner_id',A);
  expect((await list(new Request('http://localhost/api/backups?cursor=malformed'))).status).toBe(400);
});
