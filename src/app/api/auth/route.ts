import { z } from 'zod';
import { cloudClient } from '@/lib/supabase/server';
import { endpoint, HttpError, json, readBody } from '@/lib/cloud/http';
const schema = z.discriminatedUnion('action', [z.object({ action: z.literal('send'), email: z.email().max(254) }).strict(), z.object({ action: z.literal('verify'), email: z.email().max(254), token: z.string().regex(/^\d{6,8}$/) }).strict(), z.object({ action: z.literal('logout') }).strict()]);
export async function POST(request: Request) {
  return endpoint(async () => {
    const body = schema.parse(await readBody(request, 2048));
    const client = await cloudClient(); if (!client) throw new HttpError(503, 'Contas ainda não estão disponíveis. Continue jogando neste aparelho.');
    if (body.action === 'send') {
      const { error } = await client.auth.signInWithOtp({ email: body.email, options: { shouldCreateUser: true } });
      if (error) throw new HttpError(error.status === 429 ? 429 : 503, 'Não foi possível enviar o código agora. Aguarde um pouco e tente novamente.');
      return json({ message: 'Se o endereço puder receber acesso, um código será enviado. Confira também o spam.' });
    }
    if (body.action === 'verify') {
      const { error } = await client.auth.verifyOtp({ email: body.email, token: body.token, type: 'email' });
      if (error) throw new HttpError(401, 'Código inválido ou expirado. Solicite outro e tente novamente.');
      return json({ message: 'Conta conectada.' });
    }
    const { error } = await client.auth.signOut({ scope: 'local' }); if (error) throw new HttpError(503, 'Não foi possível sair agora. Tente novamente.');
    return json({ message: 'Você saiu da conta. O progresso deste aparelho continua salvo.' });
  });
}
