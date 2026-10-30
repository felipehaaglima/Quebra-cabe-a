import type { Vec2 } from '../camera/camera';

export type Side = 'top' | 'right' | 'bottom' | 'left';
export type EdgeKind = 'flat' | 'tab' | 'socket';
export type PuzzleDefinition = Readonly<{
  id: string; version: number; sourceImageId: string; imageWidth: number; imageHeight: number;
  rows: number; columns: number; seed: string; geometryVersion: 1; pieceRotation: 'quarter-turns';
}>;
export type PieceGeometry = {
  id: string; row: number; column: number; canonicalOrigin: Vec2;
  polygon: Vec2[]; edges: Record<Side, { kind: EdgeKind; points: Vec2[] }>;
};
export type Placement = { pieceId: string; center: Vec2; quarterTurn: 0 | 1 | 2 | 3 };
export const DEMO: PuzzleDefinition = Object.freeze({ id: 'lago-sereno-24-v1', version: 1, sourceImageId: 'lago-sereno-v1', imageWidth: 800, imageHeight: 600, rows: 4, columns: 6, seed: 'lago-sereno-24-v1', geometryVersion: 1, pieceRotation: 'quarter-turns' });
export const DEMO48: PuzzleDefinition = Object.freeze({ ...DEMO, id: 'lago-sereno-48-v1', rows: 6, columns: 8, seed: 'lago-sereno-48-v1' });

export function seededRandom(seed: string): () => number {
  let state = 2166136261;
  for (let i = 0; i < seed.length; i++) state = Math.imul(state ^ seed.charCodeAt(i), 16777619);
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ state >>> 15, 1 | state);
    value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function edge(start: Vec2, end: Vec2, polarity: number, amplitude: number): Vec2[] {
  const dx = end.x - start.x, dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  const at = (u: number, v: number): Vec2 => ({ x: start.x + u * dx - dy / length * v * amplitude * polarity, y: start.y + u * dy + dx / length * v * amplitude * polarity });
  if (!polarity) return [start, end];
  const profile = [{ x: 0.35, y: 0 }];
  const cubic = (a: Vec2, b: Vec2, c: Vec2) => {
    const p = profile[profile.length - 1];
    for (let i = 1; i <= 12; i++) {
      const t = i / 12, s = 1 - t;
      profile.push({ x: s ** 3 * p.x + 3 * s * s * t * a.x + 3 * s * t * t * b.x + t ** 3 * c.x, y: s ** 3 * p.y + 3 * s * s * t * a.y + 3 * s * t * t * b.y + t ** 3 * c.y });
    }
  };
  cubic({ x: 0.43, y: 0 }, { x: 0.43, y: 0.2 }, { x: 0.4, y: 0.4 });
  cubic({ x: 0.22, y: 1.2 }, { x: 0.78, y: 1.2 }, { x: 0.6, y: 0.4 });
  cubic({ x: 0.57, y: 0.2 }, { x: 0.57, y: 0 }, { x: 0.65, y: 0 });
  return [start, ...profile.map((point) => at(point.x, point.y)), end];
}

export function generatePieces(definition: PuzzleDefinition): PieceGeometry[] {
  const { imageWidth, imageHeight, rows, columns, seed } = definition;
  if (!Number.isInteger(rows) || !Number.isInteger(columns) || rows < 1 || columns < 1 || rows * columns > 500 || !Number.isFinite(imageWidth) || !Number.isFinite(imageHeight) || imageWidth <= 0 || imageHeight <= 0 || definition.geometryVersion !== 1) throw new Error('Definição de puzzle inválida');
  const width = imageWidth / columns, height = imageHeight / rows;
  const makeEdge = (id: string, start: Vec2, end: Vec2, flat: boolean) => {
    const random = seededRandom(`${seed}:${id}`);
    const polarity = flat ? 0 : random() < 0.5 ? -1 : 1;
    return { polarity, points: edge(start, end, polarity, Math.min(width, height) * (0.19 + random() * 0.03)) };
  };
  const horizontal = Array.from({ length: rows + 1 }, (_, r) => Array.from({ length: columns }, (_, c) => makeEdge(`h:${r}:${c}`, { x: c * width, y: r * height }, { x: (c + 1) * width, y: r * height }, r === 0 || r === rows)));
  const vertical = Array.from({ length: rows }, (_, r) => Array.from({ length: columns + 1 }, (_, c) => makeEdge(`v:${r}:${c}`, { x: c * width, y: r * height }, { x: c * width, y: (r + 1) * height }, c === 0 || c === columns)));
  return Array.from({ length: rows * columns }, (_, index) => {
    const row = Math.floor(index / columns), column = index % columns;
    const canonicalOrigin = { x: column * width, y: row * height };
    const shared = { top: horizontal[row][column], right: vertical[row][column + 1], bottom: horizontal[row + 1][column], left: vertical[row][column] };
    const edges = {} as PieceGeometry['edges'];
    for (const side of ['top', 'right', 'bottom', 'left'] as const) {
      const source = shared[side];
      const reversed = side === 'bottom' || side === 'left';
      const outward = source.polarity * (reversed ? 1 : -1);
      edges[side] = { kind: outward === 0 ? 'flat' : outward > 0 ? 'tab' : 'socket', points: (reversed ? [...source.points].reverse() : source.points).map((point) => ({ x: point.x - canonicalOrigin.x, y: point.y - canonicalOrigin.y })) };
    }
    return { id: `${row}:${column}`, row, column, canonicalOrigin, edges, polygon: [edges.top, edges.right, edges.bottom, edges.left].flatMap((item) => item.points.slice(0, -1)) };
  });
}

export function pointInPolygon(point: Vec2, polygon: readonly Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

// Preserve the versioned 24-piece layout; 48 uses a denser, reserved-area grid.
export function distributePieces(pieces: readonly PieceGeometry[], seed: string): Placement[] {
  if (pieces.length !== 24 && pieces.length !== 48) throw new Error('A distribuição suporta 24 ou 48 peças');
  if (pieces.some((piece) => piece.polygon.some((point) => Math.abs(point.x - piece.edges.right.points[0].x / 2) > 110 || Math.abs(point.y - piece.edges.bottom.points[0].y / 2) > 110))) throw new Error('Peças grandes demais para os slots desta versão');
  const maxRadius = pieces.length === 48 ? 74 : 110;
  if (pieces.some((piece) => piece.polygon.some((point) => Math.abs(point.x - piece.edges.right.points[0].x / 2) > maxRadius || Math.abs(point.y - piece.edges.bottom.points[0].y / 2) > maxRadius))) throw new Error('Peças grandes demais para os slots desta versão');
  const random = seededRandom(`${seed}:layout:v1`);
  const slots: Vec2[] = [];
  if (pieces.length === 24) {
    for (const y of [-620, 620]) for (let i = 0; i < 8; i++) slots.push({ x: -840 + i * 240, y });
    for (const x of [-900, 900]) for (let i = 0; i < 4; i++) slots.push({ x, y: -360 + i * 240 });
  } else {
    const reserved = [
      { left: -424, right: 424, top: -324, bottom: 324 },
      { left: -650, right: -470, top: 170, bottom: 370 },
      { left: 470, right: 650, top: 170, bottom: 370 },
    ];
    // 80 accounts for the rotated contour and seeded jitter, not just the cell.
    for (let y = -640; y <= 640; y += 160) for (let x = -960; x <= 960; x += 160) {
      if (reserved.every((box) => x + 80 < box.left || x - 80 > box.right || y + 80 < box.top || y - 80 > box.bottom)) slots.push({ x, y });
    }
  }
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  return pieces.map((piece, index) => ({ pieceId: piece.id, center: { x: slots[index].x + (random() - 0.5) * 12, y: slots[index].y + (random() - 0.5) * 12 }, quarterTurn: Math.floor(random() * 4) as Placement['quarterTurn'] }));
}
