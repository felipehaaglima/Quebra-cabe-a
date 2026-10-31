import 'server-only';
import { z } from 'zod';
import { cloudClient } from '../supabase/server';
import { decodeBoard } from '@/game/cloud/board';
import { puzzleProgress } from '@/game/core/puzzle/groups';
import { definitionFor } from '@/game/cloud/board';
import { HttpError } from './http';
export async function accountContext() {
  const client = await cloudClient(); if (!client) throw new HttpError(503, 'Contas ainda não estão disponíveis.');
  const { data, error } = await client.auth.getUser(); if (error || !data.user) throw new HttpError(401, 'Entre na sua conta para continuar.');
  return { client, user: data.user };
}
export const backupId = z.uuid();
export function backupSummary(row: { id: string; puzzle_id: string; snapshot: unknown; created_at: string }) {
  const board = decodeBoard(row.snapshot); if (row.puzzle_id !== board.puzzleId) throw new Error('Puzzle incompatível');
  const definition = definitionFor(board.puzzleId)!;
  return { id: row.id, puzzleId: board.puzzleId, pieces: definition.rows * definition.columns, connections: puzzleProgress(board.model.state, definition).connections, createdAt: row.created_at };
}
