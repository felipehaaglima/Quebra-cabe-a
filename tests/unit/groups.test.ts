import { describe, expect, it } from 'vitest';
import { rotate, WORLD, type Vec2 } from '../../src/game/core/camera/camera';
import { DEMO, generatePieces, type Placement } from '../../src/game/core/puzzle/puzzle';
import { boundGroup, canonicalCenter, canonicalConnections, connectionId, createPuzzleState, groupPlacements, puzzleProgress, rotateGroup, snapGroup, snapTolerance, type PuzzleState } from '../../src/game/core/puzzle/groups';
import { PieceController } from '../../src/game/input/piece-controller';

const pieces = generatePieces(DEMO);
function pose(id: string, translation: Vec2, quarterTurn: Placement['quarterTurn'] = 0): Placement {
  const point = rotate(canonicalCenter(id, DEMO), quarterTurn * Math.PI / 2);
  return { pieceId: id, quarterTurn, center: { x: point.x + translation.x, y: point.y + translation.y } };
}
function assertMembers(state: PuzzleState, count = 24) {
  const ids = state.groups.flatMap((group) => group.pieceIds);
  expect(ids).toHaveLength(count);
  expect(new Set(ids).size).toBe(count);
  expect(new Set(state.confirmedConnections).size).toBe(state.confirmedConnections.length);
}

describe('encaixes e grupos', () => {
  for (const turn of [0, 1, 2, 3] as const) {
    it(`encaixa só vizinhas alinhadas no giro ${turn} e não altera o estado anterior`, () => {
      const state = createPuzzleState([pose('0:0', { x: 0, y: 0 }, turn), pose('0:1', { x: 10, y: -6 }, turn)], DEMO);
      const before = structuredClone(state);
      const next = snapGroup(state, '0:1', 18, pieces, DEMO);
      expect(next.groups).toHaveLength(1);
      expect(next.groups[0].translation).toEqual({ x: 0, y: 0 });
      expect(next.confirmedConnections).toEqual([connectionId('0:0', '0:1')]);
      expect(state).toEqual(before);
      assertMembers(next, 2);
      expect(snapGroup(next, next.groups[0].id, 18, pieces, DEMO)).toBe(next);
    });
  }
  it('rejeita orientação errada, diagonal, peça distante e encontro com não vizinha', () => {
    for (const [id, translation, turn] of [
      ['0:1', { x: 0, y: 0 }, 1], ['0:1', { x: 60, y: 0 }, 0], ['1:1', { x: 0, y: 0 }, 0], ['0:2', { x: 0, y: 0 }, 0],
    ] as const) {
      const state = createPuzzleState([pose('0:0', { x: 0, y: 0 }), pose(id, translation, turn)], DEMO);
      expect(snapGroup(state, id, 48, pieces, DEMO)).toBe(state);
    }
  });
  it('não aceita encaixe que colocaria parte do grupo fora da mesa', () => {
    const state = createPuzzleState([pose('0:0', { x: -800, y: 0 }), pose('0:1', { x: -810, y: 0 })], DEMO);
    expect(snapGroup(state, '0:0', 48, pieces, DEMO)).toBe(state);
  });
  it('conta todas as conexões do ciclo sem duplicar a primeira ao fechar um retângulo', () => {
    let state = createPuzzleState(['0:0', '0:1', '1:0', '1:1'].map((id) => pose(id, { x: 0, y: 0 })), DEMO);
    for (const id of ['0:1', '1:0', '1:1']) state = snapGroup(state, id, 18, pieces, DEMO);
    expect(state.groups).toHaveLength(1);
    expect(state.confirmedConnections).toHaveLength(4);
    expect(new Set(state.confirmedConnections).size).toBe(4);
    expect(puzzleProgress(state, DEMO).completed).toBe(false);
  });
  it('limita e gira o grupo inteiro em torno da peça selecionada', () => {
    const state = createPuzzleState(['0:0', '0:1'].map((id) => pose(id, { x: 0, y: 0 })), DEMO);
    const merged = snapGroup(state, '0:1', 18, pieces, DEMO).groups[0];
    let current = merged;
    const anchor = groupPlacements(merged, DEMO)[0];
    for (let i = 0; i < 4; i++) {
      current = rotateGroup(current, anchor.pieceId, DEMO);
      const actual = groupPlacements(current, DEMO)[0];
      expect(actual.center.x).toBeCloseTo(anchor.center.x, 9);
      expect(actual.center.y).toBeCloseTo(anchor.center.y, 9);
      const bounded = boundGroup({ ...current, translation: { x: 1e6, y: -1e6 } }, pieces, DEMO);
      for (const placement of groupPlacements(bounded, DEMO)) {
        const shape = pieces.find((piece) => piece.id === placement.pieceId)!;
        for (const point of shape.polygon) {
          const offset = rotate({ x: point.x - DEMO.imageWidth / DEMO.columns / 2, y: point.y - DEMO.imageHeight / DEMO.rows / 2 }, placement.quarterTurn * Math.PI / 2);
          expect(placement.center.x + offset.x).toBeLessThanOrEqual(WORLD.width / 2 + 1e-7);
          expect(placement.center.y + offset.y).toBeGreaterThanOrEqual(-WORLD.height / 2 - 1e-7);
        }
      }
    }
    expect(current.translation.x).toBeCloseTo(merged.translation.x, 9);
    expect(current.translation.y).toBeCloseTo(merged.translation.y, 9);
    expect(current.quarterTurn).toBe(merged.quarterTurn);
  });
  it.each([0.1, 0.5, 1, 4])('tolera um erro pequeno no zoom %s, com limites para o magnetismo', (zoom) => {
    const state = createPuzzleState([pose('0:0', { x: 0, y: 0 }), pose('0:1', { x: 2, y: 2 })], DEMO);
    expect(snapGroup(state, '0:1', snapTolerance(zoom), pieces, DEMO).groups).toHaveLength(1);
    expect(snapTolerance(zoom)).toBeGreaterThanOrEqual(6);
    expect(snapTolerance(zoom)).toBeLessThanOrEqual(48);
  });
  for (const [rows, columns] of [[4, 6], [6, 8], [10, 10]]) {
    it(`reúne ${rows * columns} peças sem perdas, completa e mantém o ledger em movimentos posteriores`, () => {
      const definition = { ...DEMO, rows, columns };
      const shapes = generatePieces(definition);
      let state = createPuzzleState(shapes.map((piece) => ({ pieceId: piece.id, center: canonicalCenter(piece.id, definition), quarterTurn: 0 as const })), definition);
      while (state.groups.length > 1) {
        const before = state;
        for (const group of state.groups) {
          const next = snapGroup(state, group.id, 18, shapes, definition);
          if (next !== state) { state = next; break; }
        }
        expect(state).not.toBe(before);
        assertMembers(state, rows * columns);
      }
      expect(state.confirmedConnections).toHaveLength(canonicalConnections(definition).length);
      expect(puzzleProgress(state, definition).completed).toBe(true);
      const moved = { ...state, groups: [{ ...state.groups[0], translation: { x: 100, y: 50 } }] };
      expect(snapGroup(moved, moved.groups[0].id, 48, shapes, definition)).toBe(moved);
      expect(puzzleProgress(moved, definition).completed).toBe(true);
    });
  }
  it('o controlador move/gira/cancela grupos e só encaixa na soltura válida', () => {
    const initial = [pose('0:0', { x: 0, y: 0 }), pose('0:1', { x: 80, y: 0 })];
    const input = new PieceController(pieces, initial, DEMO, () => {});
    input.begin(initial[1].center);
    const target = pose('0:1', { x: 4, y: 0 }).center;
    input.move(target); input.end(false);
    expect(input.state.groups).toHaveLength(2);
    expect(input.state.confirmedConnections).toHaveLength(0);
    input.begin(initial[1].center); input.move(target); input.end(true, 1);
    expect(input.state.groups).toHaveLength(1);
    const original = input.state.groups[0];
    input.begin(input.placements.find((item) => item.pieceId === '0:0')!.center);
    input.move({ x: 200, y: 200 }); input.end(false);
    expect(input.state.groups[0]).toEqual(original);
    input.nudge({ x: 10, y: -10 }); input.rotate();
    expect(input.state.groups).toHaveLength(1);
    expect(input.state.confirmedConnections).toHaveLength(1);
    expect(input.alignCompleted()).toBe(false);
  });
});
