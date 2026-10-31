import { decodeBoard } from '@/game/cloud/board';
import { accountContext, backupId, backupSummary } from '@/lib/cloud/backups';
import { endpoint, HttpError, json } from '@/lib/cloud/http';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return endpoint(async () => {
    const { id } = await params; if (!backupId.safeParse(id).success) throw new HttpError(404, 'Cópia não encontrada.');
    const { client, user } = await accountContext();
    const { data, error } = await client.from('cloud_saves').select('id,puzzle_id,snapshot,created_at').eq('id', id).eq('owner_id', user.id).maybeSingle();
    if (error) throw new HttpError(503, 'Não foi possível recuperar esta cópia.');
    if (!data) throw new HttpError(404, 'Cópia não encontrada.');
    return json({ item: backupSummary(data), board: decodeBoard(data.snapshot) });
  });
}
