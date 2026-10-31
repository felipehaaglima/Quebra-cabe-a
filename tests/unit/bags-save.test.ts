import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEMO, DEMO48, distributePieces, generatePieces } from '../../src/game/core/puzzle/puzzle';
import { canonicalCenter } from '../../src/game/core/puzzle/groups';
import { PieceController } from '../../src/game/input/piece-controller';
import { LocalSaveSession, PuzzleDatabase } from '../../src/game/persistence/local-save';
import { decodeSave, definitionKey, type SavePayload } from '../../src/game/persistence/snapshot';

let serial = 0;
const databases: PuzzleDatabase[] = [];
afterEach(async () => { for (const db of databases.splice(0)) await db.delete(); });
function setup(definition = DEMO) {
  const pieces = generatePieces(definition), placements = distributePieces(pieces, definition.seed);
  const model = new PieceController(pieces, placements, definition, () => {});
  const db = new PuzzleDatabase(`test-puzzle-${++serial}`); databases.push(db);
  const status = vi.fn(); const session = new LocalSaveSession(definition, status, db);
  const payload = (): SavePayload => ({ model: model.exportModel(), camera: { center: { x: 120, y: -80 }, relativeZoom: 2, angleRad: Math.PI / 2 } });
  return { definition, model, placements, db, status, session, payload };
}

describe('bolsas e salvamento', () => {
  for (const definition of [DEMO, DEMO48]) it(`guarda, retira, move e renomeia sem perder inventário: ${definition.rows * definition.columns}`, () => {
    const { model, placements } = setup(definition);
    model.select(placements[0].pieceId); expect(model.storeSelected('bag-1')).toBe(true);
    expect(model.bags[0].pieceIds).toEqual([placements[0].pieceId]);
    expect(model.begin(placements[0].center)).toBe(false);
    expect(model.placements).toHaveLength(placements.length);
    model.renameBag('bag-1', 'Azul'); model.moveBag('bag-1', { x: 80, y: 0 });
    expect(model.bags[0].label).toBe('Azul'); expect(model.bags[0].center.x).toBe(-480);
    model.takePiece('bag-1', placements[0].pieceId);
    expect(model.bags[0].pieceIds).toHaveLength(0);
    expect(model.selectedId).toBe(placements[0].pieceId);
    expect(new Set(model.placements.map((p) => p.pieceId)).size).toBe(placements.length);
  });
  it('soltar uma peça numa bolsa guarda e cancelar o arraste da bolsa restaura sua posição', () => {
    const { model, placements } = setup();
    model.begin(placements[0].center); model.move(model.bags[0].center); model.end(true);
    expect(model.bags[0].pieceIds).toEqual([placements[0].pieceId]);
    const before = structuredClone(model.bags[1]);
    expect(model.begin(before.center)).toBe(true);
    model.move({ x: before.center.x + 100, y: before.center.y + 100 }); model.end(false);
    expect(model.bags[1]).toEqual(before);
  });
  it('não guarda grupos nem encaixa peças que estão guardadas', () => {
    const { model } = setup();
    model.state = { groups: [{ id: 'g', pieceIds: ['0:0', '0:1'], translation: { x: 0, y: 0 }, quarterTurn: 0 }, ...model.state.groups.filter((g) => !['0:0','0:1'].includes(g.id))], confirmedConnections: ['0:0|0:1'] };
    model.select('0:0'); expect(model.storeSelected('bag-1')).toBe(false);
    expect(model.bags[0].pieceIds).toHaveLength(0);
    model.select('0:2'); expect(model.storeSelected('bag-1')).toBe(true);
    model.select('0:2'); expect(model.selectedId).toBe(null);
  });
  it('exporta estado confirmado durante um arraste e mantém o guia em pequenos ajustes', () => {
    const { model, placements } = setup();
    const original = model.exportModel();
    model.begin(placements[0].center); model.move({ x: 0, y: 0 });
    expect(model.exportModel().state).toEqual(original.state);
    model.end(false); model.setGuideEnabled(true);
    const p = canonicalCenter(placements[0].pieceId, DEMO);
    model.select(placements[0].pieceId); while (model.placements.at(-1)!.quarterTurn !== 0) model.rotate();
    model.begin(model.placements.at(-1)!.center); model.move({ x: p.x + 4, y: p.y + 3 }); model.end(true, 0.2);
    expect(model.state.groups.find((g) => g.pieceIds.includes('0:0'))?.translation).toEqual({ x: 0, y: 0 });
  });
  for (const definition of [DEMO, DEMO48]) it(`persiste e restaura posições, bolsas, guia e câmera: ${definition.rows * definition.columns}`, async () => {
    const { model, placements, db, session, payload } = setup(definition);
    expect(await session.load()).toBeNull();
    model.setGuideEnabled(true); model.select(placements[0].pieceId); model.storeSelected('bag-1');
    model.renameBag('bag-1', 'Céu'); model.createBag('Verdes');
    const value = payload(); session.schedule(value, true); await session.flush();
    const reader = new LocalSaveSession(definition, () => {}, db);
    const restored = await reader.load();
    expect(restored?.model).toEqual(value.model); expect(restored?.camera).toEqual(value.camera);
    expect(restored?.revision).toBe(1);
  });
  it('migra V1 e rejeita inventário incompleto, duplicado, formato futuro e conexões adulteradas', () => {
    const { payload } = setup();
    const current = { ...payload(), schemaVersion: 3, puzzleId: DEMO.id, definitionKey: definitionKey(DEMO), revision: 1, savedAt: new Date().toISOString() };
    const v1 = { ...current, schemaVersion: 1, model: { ...current.model, guideEnabled: undefined, localCoinBalance: undefined } };
    expect(decodeSave(v1, DEMO).schemaVersion).toBe(3);
    expect(decodeSave(v1, DEMO).model.guideEnabled).toBe(false);
    expect(() => decodeSave({ ...current, schemaVersion: 99 }, DEMO)).toThrow();
    expect(() => decodeSave({ ...current, model: { ...current.model, state: { ...current.model.state, groups: current.model.state.groups.slice(1) } } }, DEMO)).toThrow();
    expect(() => decodeSave({ ...current, model: { ...current.model, state: { ...current.model.state, confirmedConnections: ['0:0|0:1'] } } }, DEMO)).toThrow();
    expect(() => decodeSave({ ...current, model: { ...current.model, bags: [{ id: 'b', label: 'x', center: { x: 0, y: 0 }, pieceIds: ['0:0', '0:0'] }] } }, DEMO)).toThrow();
  });
  it('guarda e retira todo o inventário em ambas as dificuldades', () => {
    for (const definition of [DEMO, DEMO48]) {
      const { model, placements } = setup(definition);
      for (const pose of placements) { model.select(pose.pieceId); expect(model.storeSelected('bag-1')).toBe(true); }
      expect(model.bags[0].pieceIds).toHaveLength(placements.length);
      expect(new Set(model.bags[0].pieceIds).size).toBe(placements.length);
      for (const pose of placements) model.takePiece('bag-1', pose.pieceId);
      expect(model.bags[0].pieceIds).toHaveLength(0);
      expect(new Set(model.placements.map((pose) => pose.pieceId)).size).toBe(placements.length);
    }
  });
  it('não sobrescreve snapshots incompatíveis nem alterações de outra aba', async () => {
    const { db, session, payload, status } = setup();
    await db.saves.put({ puzzleId: DEMO.id, schemaVersion: 99 } as never);
    expect(await session.load()).toBeNull(); session.schedule(payload(), true); await session.flush();
    expect((await db.saves.get(DEMO.id))?.schemaVersion).toBe(99);
    expect(status).toHaveBeenLastCalledWith(expect.stringContaining('preservados'));
    await db.saves.delete(DEMO.id);
    const a = new LocalSaveSession(DEMO, () => {}, db), b = new LocalSaveSession(DEMO, status, db);
    await a.load(); await b.load(); a.schedule(payload(), true); await a.flush();
    b.schedule(payload(), true); await b.flush();
    expect((await db.saves.get(DEMO.id))?.revision).toBe(1);
    expect(status).toHaveBeenLastCalledWith(expect.stringContaining('preservado'));
  });
});
