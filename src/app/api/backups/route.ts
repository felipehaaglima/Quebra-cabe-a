import { z } from 'zod';
import { decodeBoard } from '@/game/cloud/board';
import { accountContext, backupSummary } from '@/lib/cloud/backups';
import { endpoint, HttpError, json, readBody } from '@/lib/cloud/http';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  return endpoint(async () => {
    const { client, user } = await accountContext();
    const token = new URL(request.url).searchParams.get('cursor');
    let cursor: { at: string; id: string } | null = null;
    if (token) {
      try { if (token.length > 256) throw new Error(); cursor = z.object({ at: z.iso.datetime({ offset: true }), id: z.uuid() }).strict().parse(JSON.parse(Buffer.from(token, 'base64url').toString('utf8'))); }
      catch { throw new HttpError(400, 'Página inválida. Atualize a lista.'); }
    }
    let query = client.from('cloud_saves').select('id,puzzle_id,snapshot,created_at').eq('owner_id', user.id).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(20);
    if (cursor) query = query.or(`created_at.lt.${cursor.at},and(created_at.eq.${cursor.at},id.lt.${cursor.id})`);
    const { data, error } = await query; if (error) throw new HttpError(503, 'Não foi possível listar suas cópias.');
    const items = (data ?? []).map((row) => { try { return backupSummary(row); } catch { return { id: row.id, puzzleId: row.puzzle_id, createdAt: row.created_at, unavailable: true }; } });
    return json({ items, next: data?.length === 20 ? Buffer.from(JSON.stringify({ at: data[19].created_at, id: data[19].id })).toString('base64url') : null });
  });
}
export async function POST(request: Request) {
  return endpoint(async () => {
    const body = z.object({ requestId: z.uuid(), board: z.unknown() }).strict().parse(await readBody(request));
    const { client, user } = await accountContext();
    let board; try { board = decodeBoard(body.board); } catch { throw new HttpError(400, 'A montagem não pôde ser validada. O save local foi preservado.'); }
    const { data, error } = await client.from('cloud_saves').insert({ owner_id: user.id, puzzle_id: board.puzzleId, request_id: body.requestId, snapshot: board }).select('id,puzzle_id,snapshot,created_at').single();
    if (!error && data) return json({ item: backupSummary(data) }, 201);
    if (error?.code === '23505') {
      const existing = await client.from('cloud_saves').select('id,puzzle_id,snapshot,created_at').eq('owner_id', user.id).eq('request_id', body.requestId).single();
      if (!existing.error && existing.data && JSON.stringify(decodeBoard(existing.data.snapshot)) === JSON.stringify(board)) return json({ item: backupSummary(existing.data) });
      throw new HttpError(409, 'Esta solicitação já foi usada para outra cópia. Atualize a lista antes de tentar novamente.');
    }
    throw new HttpError(503, 'Não foi possível guardar a cópia. O progresso deste aparelho foi preservado.');
  });
}
