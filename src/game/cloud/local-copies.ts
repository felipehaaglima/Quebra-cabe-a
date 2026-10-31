import { PuzzleDatabase } from '../persistence/local-save';
import { decodeSave } from '../persistence/snapshot';
import { decodeBoard, definitionFor, restoreBoard, toCloudBoard } from './board';

export async function listLocalCopies(database = new PuzzleDatabase()) {
  try {
    const saves = await database.saves.toArray();
    return saves.map((raw) => {
      try { const board = toCloudBoard(raw, raw.puzzleId); return { puzzleId: raw.puzzleId, savedAt: raw.savedAt, board }; }
      catch { return { puzzleId: raw.puzzleId, savedAt: raw.savedAt, unavailable: true as const }; }
    });
  } finally { database.close(); }
}
export async function restoreCloudCopy(raw: unknown, expectedRevision: number | null, provided?: PuzzleDatabase) {
  const database = provided ?? new PuzzleDatabase();
  try {
    const board = decodeBoard(raw), definition = definitionFor(board.puzzleId)!;
    await database.transaction('rw', database.saves, database.archives, async () => {
      const previous = await database.saves.get(board.puzzleId);
      if ((previous?.revision ?? null) !== expectedRevision) throw new Error('A montagem local mudou em outra aba. Atualize a página e revise novamente.');
      const next = restoreBoard(board, previous);
      if (previous) { decodeSave(previous, definition); await database.archives.add({ puzzleId: board.puzzleId, savedAt: new Date().toISOString(), save: previous }); }
      await database.saves.put(next);
    });
    return board.puzzleId;
  } finally { if (!provided) database.close(); }
}
export async function localRevision(puzzleId: string) {
  const database = new PuzzleDatabase();
  try {
    const raw = await database.saves.get(puzzleId);
    if (raw) { const definition = definitionFor(puzzleId); if (!definition) throw new Error('Puzzle inválido'); decodeSave(raw, definition); }
    return raw?.revision ?? null;
  } finally { database.close(); }
}
export async function listArchives() {
  const database = new PuzzleDatabase();
  try { return await database.archives.orderBy('id').reverse().toArray(); } finally { database.close(); }
}
export async function restoreArchive(id: number, expectedRevision: number | null, provided?: PuzzleDatabase) {
  const database = provided ?? new PuzzleDatabase();
  try {
    await database.transaction('rw', database.saves, database.archives, async () => {
      const archived = await database.archives.get(id); if (!archived) throw new Error('Cópia não encontrada.');
      const definition = definitionFor(archived.puzzleId); if (!definition) throw new Error('Puzzle inválido');
      const saved = decodeSave(archived.save, definition), previous = await database.saves.get(archived.puzzleId);
      if ((previous?.revision ?? null) !== expectedRevision) throw new Error('A montagem local mudou em outra aba. Revise novamente.');
      if (previous) { decodeSave(previous, definition); await database.archives.add({ puzzleId: archived.puzzleId, savedAt: new Date().toISOString(), save: previous }); }
      const ledger = new Map(saved.model.rewardLedger.map((entry) => [entry.key, entry.amount]));
      for (const entry of previous?.model.rewardLedger ?? []) ledger.set(entry.key, Math.max(ledger.get(entry.key) ?? 0, entry.amount));
      const rewardLedger = [...ledger].map(([key, amount]) => ({ key, amount }));
      const model = { ...saved.model, preferences: previous?.model.preferences ?? saved.model.preferences, rewardLedger, localCoinBalance: rewardLedger.reduce((sum, entry) => sum + entry.amount, 0) };
      const next = decodeSave({ ...saved, model, revision: (previous?.revision ?? 0) + 1, savedAt: new Date().toISOString() }, definition);
      await database.saves.put(next);
    });
  } finally { if (!provided) database.close(); }
}
