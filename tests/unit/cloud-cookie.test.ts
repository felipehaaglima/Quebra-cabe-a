import { afterEach, expect, it, vi } from 'vitest';
vi.mock('server-only',()=>({}));
const mocks=vi.hoisted(()=>({create:vi.fn(),getAll:vi.fn(()=>[]),set:vi.fn()}));
vi.mock('@supabase/ssr',()=>({createServerClient:mocks.create}));
vi.mock('next/headers',()=>({cookies:async()=>({getAll:mocks.getAll,set:mocks.set})}));
import { cloudClient } from '../../src/lib/supabase/server';
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks();});
it('mantém tokens em cookies HttpOnly com SameSite, TLS em produção e refresh no servidor',async()=>{
  vi.stubEnv('SUPABASE_URL','https://project.example.test');vi.stubEnv('SUPABASE_PUBLISHABLE_KEY','sb_publishable_fake_for_test');vi.stubEnv('NODE_ENV','production');
  await cloudClient();
  const options=mocks.create.mock.calls[0][2];expect(options.cookieOptions).toMatchObject({httpOnly:true,sameSite:'lax',secure:true,path:'/'});
  options.cookies.setAll([{name:'session',value:'fake-token',options:{httpOnly:true,secure:true}}]);expect(mocks.set).toHaveBeenCalledWith('session','fake-token',{httpOnly:true,secure:true});
});
