import { describe, expect, it } from 'vitest';
import { DEMO, DEMO48, generatePieces, distributePieces, type PuzzleDefinition } from '../../src/game/core/puzzle/puzzle';
import { canonicalCenter, canonicalConnections, createPuzzleState, groupPlacements, puzzleProgress, type PuzzleState } from '../../src/game/core/puzzle/groups';
import { guideGroup, matGuideHint, releaseWithGuide } from '../../src/game/core/puzzle/mat-guide';
import { PieceController } from '../../src/game/input/piece-controller';

function stateFor(definition: PuzzleDefinition, ids: string[], x: number, y = 0) {
  return createPuzzleState(ids.map((id) => { const p = canonicalCenter(id, definition); return { pieceId: id, quarterTurn: 0 as const, center: { x: p.x + x, y: p.y + y } }; }), definition);
}

describe('guia opcional no tapete', () => {
  for (const definition of [DEMO, DEMO48]) {
    const pieces = generatePieces(definition);
    it(`ajusta a posição canônica sem mudar tamanho, geometria ou inventar conexões: ${definition.rows * definition.columns}`, () => {
      const state = stateFor(definition, ['0:0'], 8, -6);
      const before = structuredClone(state);
      const next = guideGroup(state, '0:0', 12);
      expect(next.groups[0].translation).toEqual({ x: 0, y: 0 });
      expect(next.groups[0].pieceIds).toEqual(['0:0']);
      expect(next.groups[0].quarterTurn).toBe(0);
      expect(next.confirmedConnections).toBe(state.confirmedConnections);
      expect(groupPlacements(next.groups[0], definition)[0].center).toEqual(canonicalCenter('0:0', definition));
      expect(state).toEqual(before);
      expect(guideGroup(next, '0:0', 12)).toBe(next);
    });
    it(`recusa lugar distante e orientação incorreta: ${definition.rows * definition.columns}`, () => {
      const far = stateFor(definition, ['0:0'], 100);
      expect(guideGroup(far, '0:0', 48)).toBe(far);
      for (const quarterTurn of [1, 2, 3] as const) {
        const state = { ...far, groups: [{ ...far.groups[0], translation: { x: 0, y: 0 }, quarterTurn }] };
        expect(guideGroup(state, '0:0', 48)).toBe(state);
        expect(matGuideHint(state.groups[0], 48)).toBe('wrong-orientation');
      }
    });
    it(`reúne todos os vizinhos já alinhados sem deriva ou contagem duplicada: ${definition.rows * definition.columns}`, () => {
      let state = stateFor(definition, pieces.map((piece) => piece.id), 0);
      // One release can join all exactly aligned neighboring groups.
      state = releaseWithGuide(state, '0:0', 1, true, pieces, definition);
      expect(state.groups).toHaveLength(1);
      expect(state.confirmedConnections).toHaveLength(canonicalConnections(definition).length);
      expect(new Set(state.groups[0].pieceIds).size).toBe(pieces.length);
      expect(puzzleProgress(state, definition).completed).toBe(true);
      expect(releaseWithGuide(state, state.groups[0].id, 1, true, pieces, definition)).toBe(state);
    });
    it(`move grupos inteiros para o tapete e permite removê-los depois: ${definition.rows * definition.columns}`, () => {
      let state: PuzzleState = { groups: [{ id: 'g', pieceIds: ['0:0', '0:1'], translation: { x: 5, y: -5 }, quarterTurn: 0 }], confirmedConnections: ['0:0|0:1'] };
      const input = new PieceController(pieces, groupPlacements(state.groups[0], definition), definition, () => {});
      input.state = state;
      input.select('0:0');
      input.setGuideEnabled(true);
      expect(input.snap(1)).toBe(true);
      state = input.state;
      expect(state.groups[0].translation).toEqual({ x: 0, y: 0 });
      expect(state.confirmedConnections).toEqual(['0:0|0:1']);
      input.nudge({ x: 100, y: 50 });
      expect(input.state.groups[0].translation).toEqual({ x: 100, y: 50 });
      input.setGuideEnabled(false);
      expect(input.state.groups[0].translation).toEqual({ x: 100, y: 50 });
    });
    it(`não aplica guia em cancelamento nem ao ativar/desativar: ${definition.rows * definition.columns}`, () => {
      const initial = distributePieces(pieces, definition.seed);
      const input = new PieceController(pieces, initial, definition, () => {});
      const before = structuredClone(input.state);
      input.setGuideEnabled(true); input.setGuideEnabled(false);
      expect(input.state).toEqual(before);
      input.setGuideEnabled(true);
      input.begin(initial[0].center);
      const p = canonicalCenter(initial[0].pieceId, definition);
      input.move({ x: p.x + 5, y: p.y + 5 }); input.end(false);
      expect(input.state.groups).toEqual(before.groups);
      expect(input.state.confirmedConnections).toEqual([]);
    });
    it(`desligado preserva montagem livre e não puxa vizinho para fora da posição guiada: ${definition.rows * definition.columns}`, () => {
      const isolated = stateFor(definition, ['0:0'], 5);
      expect(releaseWithGuide(isolated, '0:0', 1, false, pieces, definition)).toBe(isolated);
      const state = stateFor(definition, ['0:0', '0:1'], 10);
      const guided = releaseWithGuide(state, '0:0', 1, true, pieces, definition);
      expect(guided.groups).toHaveLength(2);
      expect(guided.groups.find((group) => group.id === '0:0')!.translation).toEqual({ x: 0, y: 0 });
      expect(guided.confirmedConnections).toEqual([]);
    });
  }
});
