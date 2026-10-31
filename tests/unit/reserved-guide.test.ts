import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { DEMO, DEMO48, generatePieces, distributePieces, type PuzzleDefinition } from '../../src/game/core/puzzle/puzzle';
import { canonicalCenter } from '../../src/game/core/puzzle/groups';
import { hoveredSlots, validMatPlacement } from '../../src/game/core/puzzle/mat-guide';
import { PieceController } from '../../src/game/input/piece-controller';
import { LocalSaveSession, PuzzleDatabase } from '../../src/game/persistence/local-save';
import { decodeSave, definitionKey } from '../../src/game/persistence/snapshot';
function setup(definition: PuzzleDefinition) {
  const pieces = generatePieces(definition);
  return new PieceController(pieces, distributePieces(pieces, definition.seed), definition, () => {});
}
function pose(model: PieceController, id = '0:0') { return model.placements.find((item) => item.pieceId === id)!; }
function orient(model: PieceController, id = '0:0') { model.select(id); while (pose(model,id).quarterTurn !== 0) model.rotate(); }
function drop(model: PieceController, target: { x: number; y: number }, id = '0:0', commit = true) {
  model.begin(pose(model,id).center); model.move(target); model.end(commit, 0.2);
}
for (const definition of [DEMO, DEMO48]) describe(`reservas ${definition.rows * definition.columns}`, () => {
  it('liga por padrão e ilumina a célula sob a peça sem revelar sua identidade/orientação', () => {
    const model = setup(definition); expect(model.guideEnabled).toBe(true);
    model.select('0:0'); const group = model.state.groups.find((item) => item.id === '0:0')!;
    const wrong = { ...group, quarterTurn: 0 as const, translation: { x: definition.imageWidth / definition.columns, y: 0 } };
    expect(hoveredSlots(wrong, definition)).toEqual(['0:1']); expect(validMatPlacement(wrong,definition)).toBe(false);
    const rotated = { ...wrong, quarterTurn: 1 as const };
    expect(hoveredSlots(rotated,definition).every((id) => /^\d+:\d+$/.test(id))).toBe(true);
  });
  it('aceita o interior inteiro do espaço certo e devolve erros sem pagar moedas', () => {
    const model = setup(definition); orient(model); const before = structuredClone(pose(model));
    drop(model, canonicalCenter('0:1',definition)); expect(pose(model)).toEqual(before);
    expect(model.localCoinBalance).toBe(0); expect(model.notice).toContain('local anterior');
    model.rotate(); const rotated = structuredClone(pose(model)); drop(model,canonicalCenter('0:0',definition)); expect(pose(model)).toEqual(rotated);
    orient(model); const center = canonicalCenter('0:0',definition);
    drop(model,{ x: center.x + definition.imageWidth / definition.columns * 0.4, y: center.y + definition.imageHeight / definition.rows * 0.4 });
    expect(pose(model).center).toEqual(center); expect(model.localCoinBalance).toBe(0);
  });
  it('retorna à bolsa após erro, inclusive com reload, preservando orientação e inventário', async () => {
    const model = setup(definition); const original = structuredClone(pose(model)); model.select('0:0'); model.storeSelected('bag-1'); model.takePiece('bag-1','0:0');
    const db = new PuzzleDatabase(`guide-${definition.id}`), save = new LocalSaveSession(definition, () => {}, db);
    try {
      await save.load(); save.schedule({ model: model.exportModel(), camera: { center: { x: 0,y: 0 }, relativeZoom: 1,angleRad: 0 } },true); await save.flush();
      const reader = new LocalSaveSession(definition, () => {}, db); const saved = await reader.load(); expect(saved).not.toBeNull();
      const restored = setup(definition); restored.restore(saved!.model); orient(restored); drop(restored, canonicalCenter('0:1',definition));
      expect(restored.bags[0].pieceIds).toEqual(['0:0']); expect(pose(restored)).toEqual(original); expect(restored.bagReturns).toHaveLength(0);
      expect(restored.placements).toHaveLength(definition.rows*definition.columns); expect(restored.localCoinBalance).toBe(0);
      expect(restored.selectedId).toBeNull();
    } finally { await db.delete(); }
  });
  it('cancela tentativa da bolsa e conclui tentativa válida sem manter origem antiga', () => {
    const model = setup(definition); model.select('0:0'); model.storeSelected('bag-1'); model.takePiece('bag-1','0:0');
    drop(model,canonicalCenter('0:1',definition),'0:0',false); expect(model.bags[0].pieceIds).toEqual(['0:0']);
    model.takePiece('bag-1','0:0'); orient(model); drop(model,canonicalCenter('0:0',definition));
    expect(model.bags[0].pieceIds).toHaveLength(0); expect(model.bagReturns).toHaveLength(0);
    const before = structuredClone(pose(model)); drop(model,canonicalCenter('0:1',definition)); expect(pose(model)).toEqual(before); expect(model.bags[0].pieceIds).toHaveLength(0);
  });
  it('preserva grupo, conexões e saldo ao rejeitar deslocamento no tapete', () => {
    const model = setup(definition);
    for (const id of ['0:0','0:1']) { orient(model,id); drop(model,canonicalCenter(id,definition),id); }
    expect(model.localCoinBalance).toBe(1); const before = structuredClone(model.state);
    const p = canonicalCenter('1:0',definition); drop(model,p);
    expect(model.state).toEqual(before); expect(model.localCoinBalance).toBe(1);
    drop(model,{ x: -750,y: 0 }); expect(model.state.groups.find((g) => g.pieceIds.includes('0:0'))!.translation).not.toEqual({ x: 0,y: 0 });
  });
  it('migra v3 preservando montagem e preferência explícita, sem origens inventadas', () => {
    const model = setup(definition); model.setGuideEnabled(false);
    const { bagReturns: _origins, ...legacy } = model.exportModel(); void _origins;
    const saved = decodeSave({ schemaVersion: 3, model: legacy, camera: { center: { x: 0,y: 0 },relativeZoom: 1,angleRad: 0 }, puzzleId: definition.id, definitionKey: definitionKey(definition),revision: 1,savedAt: new Date().toISOString() },definition);
    expect(saved.schemaVersion).toBe(4); expect(saved.model.bagReturns).toEqual([]); expect(saved.model.guideEnabled).toBe(false);
  });
});
