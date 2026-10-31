import { z } from 'zod';
import { DEMO, DEMO48 } from '../core/puzzle/puzzle';
import { defaultPreferences } from '../core/preferences';
import { puzzleProgress } from '../core/puzzle/groups';
import { decodeSave, definitionKey, modelSchema, type LocalSave } from '../persistence/snapshot';

const boardModel = modelSchema.pick({ state: true, bags: true, bagReturns: true, order: true, guideEnabled: true }).strict();
const boardSchema = z.object({ schemaVersion: z.literal(1), puzzleId: z.enum([DEMO.id, DEMO48.id]), definitionKey: z.string(), model: boardModel }).strict();
export type CloudBoard = z.infer<typeof boardSchema>;
export const definitionFor = (id: string) => id === DEMO.id ? DEMO : id === DEMO48.id ? DEMO48 : null;

export function restoreBoard(raw: unknown, previous?: unknown): LocalSave {
  const board = boardSchema.parse(raw), definition = definitionFor(board.puzzleId)!;
  if (board.definitionKey !== definitionKey(definition)) throw new Error('Definição incompatível');
  const old = previous === undefined ? undefined : decodeSave(previous, definition);
  const ledger = [...(old?.model.rewardLedger ?? [])], claimed = new Set(ledger.map((entry) => entry.key));
  for (const id of board.model.state.confirmedConnections) if (!claimed.has(`connection:${id}`)) ledger.push({ key: `connection:${id}`, amount: 0 });
  const completed = puzzleProgress(board.model.state, definition).completed;
  if (completed && !claimed.has('completion')) ledger.push({ key: 'completion', amount: 0 });
  return decodeSave({ schemaVersion: 4, puzzleId: board.puzzleId, definitionKey: board.definitionKey, revision: (old?.revision ?? 0) + 1, savedAt: new Date().toISOString(), camera: { center: { x: 0, y: 0 }, relativeZoom: 1, angleRad: 0 }, model: { ...board.model, preferences: old?.model.preferences ?? defaultPreferences(), localCoinBalance: old?.model.localCoinBalance ?? 0, rewardLedger: ledger, completedAt: completed ? new Date().toISOString() : null } }, definition);
}
export function decodeBoard(raw: unknown): CloudBoard { const board = boardSchema.parse(raw); restoreBoard(board); return board; }
export function toCloudBoard(raw: unknown, puzzleId: string): CloudBoard {
  const definition = definitionFor(puzzleId); if (!definition) throw new Error('Puzzle desconhecido');
  const save = decodeSave(raw, definition), { state, bags, bagReturns, order, guideEnabled } = save.model;
  return decodeBoard({ schemaVersion: 1, puzzleId, definitionKey: save.definitionKey, model: { state, bags, bagReturns, order, guideEnabled } });
}
