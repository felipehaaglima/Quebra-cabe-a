import { describe, expect, it } from 'vitest';
import { DEMO, distributePieces, generatePieces } from '../../src/game/core/puzzle/puzzle';
import { PieceController } from '../../src/game/input/piece-controller';
import { boundPlacement, hitPiece, pieceLocalPoint } from '../../src/game/core/puzzle/manipulation';
import { centerCamera, rotate, screenToWorld, worldToScreen, WORLD } from '../../src/game/core/camera/camera';

const shapes = generatePieces(DEMO);
const initial = distributePieces(shapes, DEMO.seed);
const viewport = { width: 800, height: 600 };
const makeInput = () => new PieceController(shapes, initial, DEMO, () => {});

describe('seleção e movimento', () => {
  it('move só a peça atingida, mantém o ponto agarrado e traz à frente', () => {
    const input = makeInput(), original = structuredClone(initial);
    const first = initial[0];
    expect(input.begin({ x: first.center.x + 5, y: first.center.y + 3 })).toBe(true);
    input.move({ x: 105, y: 53 }); input.end(true);
    expect(input.placements.at(-1)?.pieceId).toBe(first.pieceId);
    expect(input.placements.at(-1)!.center.x).toBeCloseTo(100, 10);
    expect(input.placements.at(-1)!.center.y).toBeCloseTo(50, 10);
    expect(input.placements.filter((item) => item.pieceId !== first.pieceId)).toEqual(initial.slice(1));
    expect(initial).toEqual(original);
    expect(new Set(input.placements.map((item) => item.pieceId)).size).toBe(24);
  });
  it('cancelar restaura a posição anterior e não cria uma soltura válida', () => {
    const input = makeInput();
    input.begin(initial[0].center); input.move({ x: 0, y: 0 }); input.end(false);
    expect(input.placements.at(-1)).toEqual(initial[0]);
    input.move({ x: 300, y: 300 });
    expect(input.placements.at(-1)).toEqual(initial[0]);
  });
  it('girar durante o arraste confirma a posição atual sem salto para a origem', () => {
    const input = makeInput();
    input.begin(initial[0].center); input.move({ x: 100, y: 50 });
    input.rotate(); input.end(false);
    expect(input.placements.at(-1)!.center.x).toBeCloseTo(100, 10);
    expect(input.placements.at(-1)!.center.y).toBeCloseTo(50, 10);
    expect(input.placements.at(-1)?.quarterTurn).toBe((initial[0].quarterTurn + 1) % 4);
  });
  it('gira quatro vezes sem perder centro, membros ou forma', () => {
    const input = makeInput();
    input.select(initial[0].pieceId);
    for (let i = 0; i < 4; i++) expect(input.rotate()).toBe(true);
    expect(input.placements.at(-1)).toEqual(initial[0]);
    expect(input.placements).toHaveLength(24);
    input.select(null);
    expect(input.rotate()).toBe(false);
    expect(input.nudge({ x: 1, y: 0 })).toBe(false);
  });
  it('seleciona o topo de peças sobrepostas e ignora áreas transparentes', () => {
    const placements = initial.map((item) => ({ ...item, center: { x: 0, y: 0 } }));
    expect(hitPiece({ x: 0, y: 0 }, shapes, placements, DEMO)?.pieceId).toBe(placements.at(-1)?.pieceId);
    expect(hitPiece({ x: 500, y: 500 }, shapes, placements, DEMO)).toBeUndefined();
    for (const shape of shapes) {
      const pose = { pieceId: shape.id, center: { x: 0, y: 0 }, quarterTurn: 0 as const };
      for (const point of [{ x: -110, y: -110 }, { x: 110, y: 110 }]) expect(hitPiece(point, [shape], [pose], DEMO)).toBeUndefined();
      expect(pieceLocalPoint({ x: 0, y: 0 }, pose, DEMO)).toEqual({ x: 800 / 6 / 2, y: 600 / 4 / 2 });
    }
  });
  for (const angleRad of [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2]) {
    it(`arrasta com câmera a ${angleRad} rad sem saltar ou alterar outras peças`, () => {
      const camera = { ...centerCamera(viewport), angleRad };
      const input = makeInput();
      const start = worldToScreen(initial[0].center, camera, viewport);
      input.begin(screenToWorld(start, camera, viewport));
      const target = { x: start.x + 35, y: start.y - 20 };
      input.move(screenToWorld(target, camera, viewport)); input.end(true);
      const actual = worldToScreen(input.placements.at(-1)!.center, camera, viewport);
      expect(actual.x).toBeCloseTo(target.x); expect(actual.y).toBeCloseTo(target.y);
      expect(input.placements.slice(0, -1)).toEqual(initial.slice(1));
    });
  }
  it('limita todo o contorno da peça à mesa em todas as rotações', () => {
    for (const shape of shapes) for (const quarterTurn of [0, 1, 2, 3] as const) {
      const pose = boundPlacement({ pieceId: shape.id, center: { x: 1e6, y: -1e6 }, quarterTurn }, shape, DEMO);
      for (const point of shape.polygon) {
        const offset = rotate({ x: point.x - 800 / 6 / 2, y: point.y - 600 / 4 / 2 }, quarterTurn * Math.PI / 2);
        expect(pose.center.x + offset.x).toBeLessThanOrEqual(WORLD.width / 2 + 1e-8);
        expect(pose.center.y + offset.y).toBeGreaterThanOrEqual(-WORLD.height / 2 - 1e-8);
      }
    }
  });
});
