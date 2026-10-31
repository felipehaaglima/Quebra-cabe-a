import { cloudClient } from '@/lib/supabase/server';
import { endpoint, json } from '@/lib/cloud/http';
export const dynamic = 'force-dynamic';
export async function GET() {
  return endpoint(async () => {
    const client = await cloudClient(); if (!client) return json({ configured: false, user: null });
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) return json({ configured: true, user: null });
    return json({ configured: true, user: { id: data.user.id, email: data.user.email } });
  });
}
