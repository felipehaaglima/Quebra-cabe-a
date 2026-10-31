import { describe, expect, it, vi } from 'vitest';
import { PieceController } from '../../src/game/input/piece-controller';
import { DEMO, DEMO48, distributePieces, generatePieces, type PuzzleDefinition } from '../../src/game/core/puzzle/puzzle';
import { canonicalCenter, canonicalConnections } from '../../src/game/core/puzzle/groups';
import { rewardRules } from '../../src/game/core/puzzle/rewards';
import { decodeSave, definitionKey } from '../../src/game/persistence/snapshot';

function setup(definition = DEMO) {
  const pieces = generatePieces(definition), feedback = vi.fn();
  return { model: new PieceController(pieces, distributePieces(pieces, definition.seed), definition, () => {}, feedback), feedback };
}
function assemble(model: PieceController, definition: PuzzleDefinition) {
  for (const piece of generatePieces(definition)) {
    model.select(piece.id);
    while (model.placements.find((pose) => pose.pieceId === piece.id)!.quarterTurn !== 0) model.rotate();
    const pose = model.placements.find((pose) => pose.pieceId === piece.id)!;
    model.begin(pose.center); model.move(canonicalCenter(piece.id, definition)); model.end(true, 0.2);
  }
}
for (const definition of [DEMO, DEMO48]) describe(`recompensas ${definition.rows * definition.columns}`, () => {
  it('paga cada conexão e bônus uma vez e não permite farming ao recomeçar/restaurar', () => {
    const { model, feedback } = setup(definition); assemble(model, definition);
    const total = canonicalConnections(definition).length + rewardRules(definition).completion;
    expect(model.localCoinBalance).toBe(total);
    expect(model.rewardLedger).toHaveLength(canonicalConnections(definition).length + 1);
    expect(feedback.mock.calls.filter(([event]) => event === 'complete')).toHaveLength(1);
    model.snap(); model.alignCompleted(); model.rotate(); expect(model.localCoinBalance).toBe(total);
    const save = decodeSave({ schemaVersion: 3, puzzleId: definition.id, definitionKey: definitionKey(definition), revision: 1, savedAt: new Date().toISOString(), model: model.exportModel(), camera: { center: { x: 0, y: 0 }, relativeZoom: 1, angleRad: 0 } }, definition);
    const restored = setup(definition).model; restored.restore(save.model); restored.newPuzzle();
    expect(restored.localCoinBalance).toBe(total); expect(restored.completedAt).toBeNull();
    expect(restored.bags.every((bag) => !bag.pieceIds.length)).toBe(true);
    assemble(restored, definition); expect(restored.localCoinBalance).toBe(total);
  });
  it('migra saves v2 concluídos sem pagar conexões/bônus retroativamente', () => {
    const { model } = setup(definition); assemble(model, definition);
    const snapshot = model.exportModel();
    const { rewardLedger: _ledger, preferences: _preferences, ...legacy } = snapshot;
    void _ledger; void _preferences;
    const save = decodeSave({ schemaVersion: 2, puzzleId: definition.id, definitionKey: definitionKey(definition), revision: 1, savedAt: new Date().toISOString(), model: { ...legacy, localCoinBalance: 0 }, camera: { center: { x: 0, y: 0 }, relativeZoom: 1, angleRad: 0 } }, definition);
    expect(save.schemaVersion).toBe(3); expect(save.model.rewardLedger.every((entry) => entry.amount === 0)).toBe(true);
    const restored = setup(definition).model; restored.restore(save.model); restored.newPuzzle(); assemble(restored, definition);
    expect(restored.localCoinBalance).toBe(0);
  });
});
it('cancelar, guardar e ajustar uma peça isolada no guia não paga moedas', () => {
  const { model } = setup(); model.setGuideEnabled(true); model.select('0:0');
  while (model.placements.find((p) => p.pieceId === '0:0')!.quarterTurn !== 0) model.rotate();
  const first = model.placements.find((p) => p.pieceId === '0:0')!;
  model.begin(first.center); model.move(canonicalCenter('0:0', DEMO)); model.end(false);
  expect(model.localCoinBalance).toBe(0);
  model.begin(first.center); model.move(canonicalCenter('0:0', DEMO)); model.end(true);
  expect(model.localCoinBalance).toBe(0); model.storeSelected('bag-1'); expect(model.localCoinBalance).toBe(0);
});
