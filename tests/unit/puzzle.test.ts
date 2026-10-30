import { describe, expect, it } from 'vitest';
import { DEMO, distributePieces, generatePieces, pointInPolygon, type PieceGeometry } from '../../src/game/core/puzzle/puzzle';
import { rotate, WORLD, MAT } from '../../src/game/core/camera/camera';

const opposite = { tab: 'socket', socket: 'tab', flat: 'flat' } as const;

function signedArea(piece: PieceGeometry) {
  return piece.polygon.reduce((sum, a, i) => {
    const b = piece.polygon[(i + 1) % piece.polygon.length];
    return sum + a.x * b.y - b.x * a.y;
  }, 0) / 2;
}

describe('malha determinística', () => {
  it('gera 24 IDs únicos, reproduzíveis sem depender de câmera ou renderizador', () => {
    const definition = structuredClone(DEMO);
    const pieces = generatePieces(definition);
    expect(pieces).toEqual(generatePieces(JSON.parse(JSON.stringify(definition))));
    expect(definition).toEqual(DEMO);
    expect(new Set(pieces.map((piece) => piece.id)).size).toBe(24);
    expect(generatePieces({ ...DEMO, seed: 'outra-seed' })).not.toEqual(pieces);
    expect(generatePieces({ ...DEMO, rows: 6, columns: 8 })).toHaveLength(48);
  });

  for (const seed of ['lago-sereno-24-v1', 'bordas-1', 'bordas-2']) {
    it(`compartilha o contorno inverso com todos os vizinhos: ${seed}`, () => {
      const pieces = generatePieces({ ...DEMO, seed });
      let internalPairs = 0;
      for (const piece of pieces) {
        for (const [side, otherSide, neighbor] of [
          ['right', 'left', pieces[piece.row * DEMO.columns + piece.column + 1]],
          ['bottom', 'top', pieces[(piece.row + 1) * DEMO.columns + piece.column]],
        ] as const) {
          if ((side === 'right' && piece.column === DEMO.columns - 1) || !neighbor) continue;
          const a = piece.edges[side], b = neighbor.edges[otherSide];
          expect(a.kind).not.toBe('flat');
          expect(b.kind).toBe(opposite[a.kind]);
          expect(a.points).toHaveLength(b.points.length);
          for (let i = 0; i < a.points.length; i++) {
            const pa = a.points[i], pb = b.points[b.points.length - 1 - i];
            expect(pa.x + piece.canonicalOrigin.x).toBeCloseTo(pb.x + neighbor.canonicalOrigin.x, 10);
            expect(pa.y + piece.canonicalOrigin.y).toBeCloseTo(pb.y + neighbor.canonicalOrigin.y, 10);
          }
          internalPairs++;
        }
        for (const [side, outside] of [['top', piece.row === 0], ['bottom', piece.row === DEMO.rows - 1], ['left', piece.column === 0], ['right', piece.column === DEMO.columns - 1]] as const) {
          if (outside) { expect(piece.edges[side].kind).toBe('flat'); expect(piece.edges[side].points).toHaveLength(2); }
        }
      }
      expect(internalPairs).toBe((DEMO.rows - 1) * DEMO.columns + (DEMO.columns - 1) * DEMO.rows);
      expect(pieces.reduce((sum, piece) => sum + signedArea(piece), 0)).toBeCloseTo(DEMO.imageWidth * DEMO.imageHeight, 6);
    });
  }

  it('recompõe a imagem sem buracos ou sobreposições e faz hit test real das abas', () => {
    const pieces = generatePieces(DEMO);
    for (let y = -20 + Math.PI; y < 620; y += 17) {
      for (let x = -20 + Math.E; x < 820; x += 17) {
        const owners = pieces.filter((piece) => pointInPolygon({ x: x - piece.canonicalOrigin.x, y: y - piece.canonicalOrigin.y }, piece.polygon));
        expect(owners.length, `cobertura em ${x},${y}`).toBe(x > 0 && x < 800 && y > 0 && y < 600 ? 1 : 0);
      }
    }
    expect(pieces.some((piece) => piece.polygon.some((point) => point.x < 0 || point.y < 0 || point.x > DEMO.imageWidth / DEMO.columns || point.y > DEMO.imageHeight / DEMO.rows))).toBe(true);
  });

  it('rejeita dimensões e malhas inválidas', () => {
    for (const patch of [{ rows: 0 }, { columns: 2.5 }, { imageWidth: -1 }, { imageHeight: NaN }, { rows: 100, columns: 100 }]) expect(() => generatePieces({ ...DEMO, ...patch })).toThrow('inválida');
  });
});

describe('distribuição inicial', () => {
  it('usa a escala do tapete e rejeita layouts ainda não suportados', () => {
    expect(DEMO.imageWidth).toBe(MAT.width);
    expect(DEMO.imageHeight).toBe(MAT.height);
    expect(() => distributePieces(generatePieces({ ...DEMO, rows: 10, columns: 10 }), DEMO.seed)).toThrow('24 ou 48');
    expect(() => distributePieces(generatePieces({ ...DEMO, imageWidth: 1600, imageHeight: 1200 }), DEMO.seed)).toThrow('grandes demais');
  });
  for (const seed of [DEMO.seed, 'mesa-2', 'mesa-3']) {
    it(`não sobrepõe peças, tapete ou sacolas e fica dentro da mesa: ${seed}`, () => {
      const pieces = generatePieces({ ...DEMO, seed });
      const placements = distributePieces(pieces, seed);
      expect(placements).toEqual(distributePieces(pieces, seed));
      expect(new Set(placements.map((item) => item.pieceId)).size).toBe(24);
      const boxes = placements.map((placement, index) => {
        const points = pieces[index].polygon.map((point) => {
          const relative = rotate({ x: point.x - 800 / 6 / 2, y: point.y - 600 / 4 / 2 }, placement.quarterTurn * Math.PI / 2);
          return { x: relative.x + placement.center.x, y: relative.y + placement.center.y };
        });
        return { left: Math.min(...points.map((p) => p.x)), right: Math.max(...points.map((p) => p.x)), top: Math.min(...points.map((p) => p.y)), bottom: Math.max(...points.map((p) => p.y)) };
      });
      const reserved = [
        { left: -424, right: 424, top: -324, bottom: 324 },
        { left: -650, right: -470, top: 170, bottom: 370 },
        { left: 470, right: 650, top: 170, bottom: 370 },
      ];
      boxes.forEach((box, index) => {
        expect(box.left).toBeGreaterThan(-WORLD.width / 2);
        expect(box.right).toBeLessThan(WORLD.width / 2);
        expect(box.top).toBeGreaterThan(-WORLD.height / 2);
        expect(box.bottom).toBeLessThan(WORLD.height / 2);
        for (const other of [...boxes.slice(index + 1), ...reserved]) expect(box.right <= other.left || box.left >= other.right || box.bottom <= other.top || box.top >= other.bottom).toBe(true);
      });
    });
  }
});
