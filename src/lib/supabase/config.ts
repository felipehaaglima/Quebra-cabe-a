import 'server-only';
export function cloudConfiguration() {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  try {
    const endpoint = new URL(url);
    if (endpoint.protocol !== 'https:' && !(endpoint.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(endpoint.hostname))) return null;
    if (key.startsWith('sb_secret_')) return null;
    if (!key.startsWith('sb_publishable_')) {
      const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8'));
      if (payload.role !== 'anon') return null;
    }
    return { url, key };
  } catch { return null; }
}
