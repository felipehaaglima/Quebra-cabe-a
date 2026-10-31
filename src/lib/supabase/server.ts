import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { cloudConfiguration } from './config';
export async function cloudClient() {
  const configuration = cloudConfiguration(); if (!configuration) return null;
  const store = await cookies();
  return createServerClient(configuration.url, configuration.key, {
    cookieOptions: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' },
    cookies: { getAll: () => store.getAll(), setAll: (values) => { for (const { name, value, options } of values) store.set(name, value, options); } },
  });
}
