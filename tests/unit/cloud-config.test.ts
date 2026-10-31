import { afterEach, expect, it, vi } from 'vitest';
vi.mock('server-only',()=>({}));
import { cloudConfiguration } from '../../src/lib/supabase/config';
afterEach(()=>vi.unstubAllEnvs());
it('configuração é opcional e recusa chaves administrativas',()=>{
  vi.stubEnv('SUPABASE_URL','');vi.stubEnv('SUPABASE_PUBLISHABLE_KEY','');expect(cloudConfiguration()).toBeNull();
  vi.stubEnv('SUPABASE_URL','https://project.example.test');vi.stubEnv('SUPABASE_PUBLISHABLE_KEY','sb_secret_do_not_use');expect(cloudConfiguration()).toBeNull();
  const jwt=(role:string)=>'header.'+Buffer.from(JSON.stringify({role})).toString('base64url')+'.signature';
  vi.stubEnv('SUPABASE_PUBLISHABLE_KEY',jwt('service_role'));expect(cloudConfiguration()).toBeNull();
  vi.stubEnv('SUPABASE_PUBLISHABLE_KEY',jwt('anon'));expect(cloudConfiguration()).not.toBeNull();
  vi.stubEnv('SUPABASE_URL','http://unsafe.example.test');expect(cloudConfiguration()).toBeNull();
});
