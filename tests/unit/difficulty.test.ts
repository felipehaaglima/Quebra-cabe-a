import { describe, expect, it } from 'vitest';
import { DEMO, DEMO48, generatePieces, distributePieces } from '../../src/game/core/puzzle/puzzle';
import { rotate, WORLD, MAT } from '../../src/game/core/camera/camera';
import { hitPiece } from '../../src/game/core/puzzle/manipulation';
import { canonicalConnections } from '../../src/game/core/puzzle/groups';

describe('48 peças e toque', () => {
  it('mantém imagem/tapete e IDs versionados, com células de 100×100 e 82 conexões', () => {
    expect(DEMO48.imageWidth).toBe(MAT.width);
    expect(DEMO48.imageHeight).toBe(MAT.height);
    expect(DEMO48.imageWidth / DEMO48.columns).toBe(100);
    expect(DEMO48.imageHeight / DEMO48.rows).toBe(100);
    expect(DEMO48.sourceImageId).toBe(DEMO.sourceImageId);
    expect(DEMO48.id).not.toBe(DEMO.id);
    expect(canonicalConnections(DEMO48)).toHaveLength(82);
  });
  for (const seed of [DEMO48.seed, 'quarenta-oito-2', 'quarenta-oito-3']) {
    it(`distribui 48 contornos sem sobreposição ou colisão com áreas reservadas: ${seed}`, () => {
      const definition = { ...DEMO48, seed };
      const pieces = generatePieces(definition);
      const placements = distributePieces(pieces, seed);
      expect(placements).toEqual(distributePieces(pieces, seed));
      expect(new Set(placements.map((item) => item.pieceId)).size).toBe(48);
      const boxes = placements.map((placement, index) => {
        const points = pieces[index].polygon.map((point) => {
          const p = rotate({ x: point.x - 50, y: point.y - 50 }, placement.quarterTurn * Math.PI / 2);
          return { x: p.x + placement.center.x, y: p.y + placement.center.y };
        });
        return { left: Math.min(...points.map((p) => p.x)), right: Math.max(...points.map((p) => p.x)), top: Math.min(...points.map((p) => p.y)), bottom: Math.max(...points.map((p) => p.y)) };
      });
      const reserved = [{ left: -424, right: 424, top: -324, bottom: 324 }, { left: -650, right: -470, top: 170, bottom: 370 }, { left: 470, right: 650, top: 170, bottom: 370 }];
      boxes.forEach((box, index) => {
        expect(box.left).toBeGreaterThan(-WORLD.width / 2);
        expect(box.right).toBeLessThan(WORLD.width / 2);
        expect(box.top).toBeGreaterThan(-WORLD.height / 2);
        expect(box.bottom).toBeLessThan(WORLD.height / 2);
        for (const other of [...boxes.slice(index + 1), ...reserved]) expect(box.right < other.left || box.left > other.right || box.bottom < other.top || box.top > other.bottom).toBe(true);
      });
    });
  }
  it('tolera toque próximo do contorno sem alterar o hit test exato do mouse', () => {
    const pieces = generatePieces(DEMO48);
    const pose = { pieceId: '0:0', center: { x: 0, y: 0 }, quarterTurn: 0 as const };
    const outside = { x: -55, y: 0 }; // Outer left edge is flat at x=-50.
    expect(hitPiece(outside, pieces, [pose], DEMO48)).toBeUndefined();
    expect(hitPiece(outside, pieces, [pose], DEMO48, 10)?.pieceId).toBe('0:0');
    expect(hitPiece({ x: -80, y: 0 }, pieces, [pose], DEMO48, 10)).toBeUndefined();
    const second = { pieceId: '0:1', center: { x: -55, y: 0 }, quarterTurn: 0 as const };
    expect(hitPiece(outside, pieces, [second, pose], DEMO48, 20)?.pieceId).toBe('0:1');
  });
});
