import { z } from 'zod';
export class HttpError extends Error { constructor(readonly status: number, message: string) { super(message); } }
export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
export async function readBody(request: Request, limit = 524288): Promise<unknown> {
  const origin = request.headers.get('origin');
  const expected = new URL(process.env.APP_ORIGIN || request.url).origin;
  if (!origin || origin !== expected) throw new HttpError(403, 'Origem da solicitação inválida.');
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new HttpError(415, 'Formato da solicitação inválido.');
  if (!request.body) throw new HttpError(400, 'Solicitação vazia.');
  const reader = request.body.getReader(); let size = 0; const chunks: Uint8Array[] = [];
  while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > limit) { await reader.cancel(); throw new HttpError(413, 'Cópia muito grande.'); } chunks.push(part.value); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new HttpError(400, 'Solicitação inválida.'); }
}
export async function endpoint(work: () => Promise<Response>) {
  try { return await work(); } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    if (error instanceof z.ZodError) return json({ error: 'Dados inválidos. Confira a solicitação.' }, 400);
    return json({ error: 'Não foi possível concluir agora. Seu progresso local foi preservado.' }, 503);
  }
}
