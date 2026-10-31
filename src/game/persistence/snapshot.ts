import { z } from 'zod';
import { defaultPreferences } from '../core/preferences';
import { rewardRules } from '../core/puzzle/rewards';
import { WORLD } from '../core/camera/camera';
import { boundGroup, canonicalConnections, connectionId } from '../core/puzzle/groups';
import { boundBag } from '../core/puzzle/bags';
import { generatePieces, type PuzzleDefinition } from '../core/puzzle/puzzle';

const vector = z.object({ x: z.number().finite(), y: z.number().finite() });
const group = z.object({ id: z.string().min(1).max(80), pieceIds: z.array(z.string()).min(1).max(500), translation: vector, quarterTurn: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]) });
const bag = z.object({ id: z.string().min(1).max(80), label: z.string().trim().min(1).max(40), center: vector, pieceIds: z.array(z.string()).max(500) });
export const modelSchema = z.object({ state: z.object({ groups: z.array(group).min(1).max(500), confirmedConnections: z.array(z.string()).max(1000) }), bags: z.array(bag).max(16), order: z.array(z.string()).max(500), bagReturns: z.array(z.object({ pieceId: z.string(), bagId: z.string(), original: group })).max(500), guideEnabled: z.boolean(), completedAt: z.string().datetime().nullable(), localCoinBalance: z.number().int().nonnegative().max(1000000000), rewardLedger: z.array(z.object({ key: z.string(), amount: z.number().int().nonnegative() })).max(1001), preferences: z.object({ muted: z.boolean(), volume: z.number().min(0).max(1), reducedMotion: z.boolean(), quality: z.enum(['auto', 'low']) }) });
export type ModelSnapshot = z.infer<typeof modelSchema>;
const cameraSchema = z.object({ center: vector, relativeZoom: z.number().min(0.5).max(4), angleRad: z.number().finite() });
export type CameraSnapshot = z.infer<typeof cameraSchema>;
export type SavePayload = { model: ModelSnapshot; camera: CameraSnapshot };
const saveSchema = z.object({ schemaVersion: z.literal(4), puzzleId: z.string(), definitionKey: z.string(), revision: z.number().int().nonnegative(), savedAt: z.string().datetime(), model: modelSchema, camera: cameraSchema });
export type LocalSave = z.infer<typeof saveSchema>;
export const definitionKey = (definition: PuzzleDefinition) => JSON.stringify(definition);

export function decodeSave(raw: unknown, definition: PuzzleDefinition): LocalSave {
  // V1 lacked guide preference and the reserved local wallet field.
  const legacy = z.object({ schemaVersion: z.literal(1), model: z.record(z.string(), z.unknown()) }).passthrough().safeParse(raw);
  if (legacy.success) raw = { ...legacy.data, schemaVersion: 2, model: { ...legacy.data.model, guideEnabled: true, localCoinBalance: legacy.data.model.localCoinBalance ?? 0, completedAt: legacy.data.model.completedAt ?? null } };
  // Existing connections are marked claimed at zero: migration never pays twice.
  const v2 = z.object({ schemaVersion: z.literal(2), model: z.object({ state: z.object({ confirmedConnections: z.array(z.string()) }).passthrough(), completedAt: z.string().nullable(), localCoinBalance: z.literal(0) }).passthrough() }).passthrough().safeParse(raw);
  if (v2.success) raw = { ...v2.data, schemaVersion: 3, model: { ...v2.data.model, preferences: defaultPreferences(), rewardLedger: [...v2.data.model.state.confirmedConnections.map((id) => ({ key: `connection:${id}`, amount: 0 })), ...(v2.data.model.completedAt ? [{ key: 'completion', amount: 0 }] : [])] } };
  const v3 = z.object({ schemaVersion: z.literal(3), model: z.record(z.string(), z.unknown()) }).passthrough().safeParse(raw);
  if (v3.success) raw = { ...v3.data, schemaVersion: 4, model: { ...v3.data.model, bagReturns: [] } };
  const save = saveSchema.parse(raw);
  if (save.puzzleId !== definition.id || save.definitionKey !== definitionKey(definition)) throw new Error('Definição incompatível');
  const expected = generatePieces(definition), ids = new Set(expected.map((piece) => piece.id));
  const members = save.model.state.groups.flatMap((item) => item.pieceIds);
  if (members.length !== ids.size || new Set(members).size !== ids.size || members.some((id) => !ids.has(id))) throw new Error('Inventário inválido');
  const order = save.model.order;
  if (order.length !== ids.size || new Set(order).size !== ids.size || order.some((id) => !ids.has(id))) throw new Error('Ordem inválida');
  if (new Set(save.model.state.groups.map((item) => item.id)).size !== save.model.state.groups.length) throw new Error('Grupos duplicados');
  const pairs = canonicalConnections(definition), connections: string[] = [];
  for (const item of save.model.state.groups) {
    const bounded = boundGroup(item, expected, definition);
    if (Math.hypot(bounded.translation.x - item.translation.x, bounded.translation.y - item.translation.y) > 1e-6) throw new Error('Grupo fora da mesa');
    const internal = pairs.filter(([a, b]) => item.pieceIds.includes(a) && item.pieceIds.includes(b));
    const visited = new Set([item.pieceIds[0]]);
    for (let i = 0; i < item.pieceIds.length; i++) for (const [a, b] of internal) { if (visited.has(a)) visited.add(b); if (visited.has(b)) visited.add(a); }
    if (visited.size !== item.pieceIds.length) throw new Error('Grupo desconectado');
    connections.push(...internal.map(([a, b]) => connectionId(a, b)));
  }
  if (JSON.stringify([...connections].sort()) !== JSON.stringify([...save.model.state.confirmedConnections].sort())) throw new Error('Conexões inválidas');
  const bagged = save.model.bags.flatMap((item) => item.pieceIds);
  if (new Set(save.model.bags.map((item) => item.id)).size !== save.model.bags.length || new Set(bagged).size !== bagged.length) throw new Error('Bolsas duplicadas');
  for (const item of save.model.bags) {
    const bounded = boundBag(item.center);
    if (bounded.x !== item.center.x || bounded.y !== item.center.y || item.pieceIds.some((id) => !ids.has(id) || !save.model.state.groups.some((g) => g.pieceIds.length === 1 && g.pieceIds[0] === id))) throw new Error('Conteúdo de bolsa inválido');
  }
  if (Math.abs(save.camera.center.x) > WORLD.width / 2 || Math.abs(save.camera.center.y) > WORLD.height / 2) throw new Error('Câmera inválida');
  const allowed = new Map(pairs.map(([a,b]) => [`connection:${connectionId(a,b)}`, rewardRules(definition).connection]));
  allowed.set('completion', rewardRules(definition).completion);
  const ledger = save.model.rewardLedger;
  if (new Set(ledger.map((entry) => entry.key)).size !== ledger.length || ledger.some((entry) => !allowed.has(entry.key) || (entry.amount !== 0 && entry.amount !== allowed.get(entry.key))) || ledger.reduce((sum, entry) => sum + entry.amount, 0) !== save.model.localCoinBalance) throw new Error('Recompensas inválidas');
  if (save.model.state.confirmedConnections.some((id) => !ledger.some((entry) => entry.key === `connection:${id}`))) throw new Error('Conexão sem registro de recompensa');
  if (new Set(save.model.bagReturns.map((origin) => origin.pieceId)).size !== save.model.bagReturns.length) throw new Error('Origens duplicadas');
  for (const origin of save.model.bagReturns) {
    const current = save.model.state.groups.find((item) => item.pieceIds.includes(origin.pieceId));
    const bounded = boundGroup(origin.original, expected, definition);
    if (!save.model.bags.some((item) => item.id === origin.bagId) || bagged.includes(origin.pieceId) || !current || current.pieceIds.length !== 1 || origin.original.id !== current.id || origin.original.pieceIds.length !== 1 || origin.original.pieceIds[0] !== origin.pieceId || Math.hypot(bounded.translation.x - origin.original.translation.x, bounded.translation.y - origin.original.translation.y) > 1e-6) throw new Error('Origem de bolsa inválida');
  }
  return save;
}
