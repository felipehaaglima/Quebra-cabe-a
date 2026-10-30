import { rotate, WORLD, type Vec2 } from '../camera/camera';
import type { PieceGeometry, Placement, PuzzleDefinition } from './puzzle';

export type PieceGroup = { id: string; pieceIds: string[]; translation: Vec2; quarterTurn: Placement['quarterTurn'] };
export type PuzzleState = { groups: PieceGroup[]; confirmedConnections: string[] };

export function canonicalCenter(id: string, definition: PuzzleDefinition): Vec2 {
  const [row, column] = id.split(':').map(Number);
  return { x: (column + 0.5) * definition.imageWidth / definition.columns - definition.imageWidth / 2, y: (row + 0.5) * definition.imageHeight / definition.rows - definition.imageHeight / 2 };
}

export function createPuzzleState(placements: readonly Placement[], definition: PuzzleDefinition): PuzzleState {
  return { confirmedConnections: [], groups: placements.map((placement) => {
    const offset = rotate(canonicalCenter(placement.pieceId, definition), placement.quarterTurn * Math.PI / 2);
    return { id: placement.pieceId, pieceIds: [placement.pieceId], quarterTurn: placement.quarterTurn, translation: { x: placement.center.x - offset.x, y: placement.center.y - offset.y } };
  }) };
}

export function groupPlacements(group: PieceGroup, definition: PuzzleDefinition): Placement[] {
  return group.pieceIds.map((pieceId) => {
    const offset = rotate(canonicalCenter(pieceId, definition), group.quarterTurn * Math.PI / 2);
    return { pieceId, quarterTurn: group.quarterTurn, center: { x: group.translation.x + offset.x, y: group.translation.y + offset.y } };
  });
}

export function boundGroup(group: PieceGroup, pieces: readonly PieceGeometry[], definition: PuzzleDefinition): PieceGroup {
  const members = new Set(group.pieceIds);
  const points = pieces.filter((piece) => members.has(piece.id)).flatMap((piece) => piece.polygon.map((point) => rotate({ x: piece.canonicalOrigin.x + point.x - definition.imageWidth / 2, y: piece.canonicalOrigin.y + point.y - definition.imageHeight / 2 }, group.quarterTurn * Math.PI / 2)));
  const xs = points.map((point) => point.x), ys = points.map((point) => point.y);
  return { ...group, translation: { x: Math.max(-WORLD.width / 2 - Math.min(...xs), Math.min(WORLD.width / 2 - Math.max(...xs), group.translation.x)), y: Math.max(-WORLD.height / 2 - Math.min(...ys), Math.min(WORLD.height / 2 - Math.max(...ys), group.translation.y)) } };
}

export function rotateGroup(group: PieceGroup, anchorId: string, definition: PuzzleDefinition): PieceGroup {
  const anchor = groupPlacements(group, definition).find((item) => item.pieceId === anchorId)!;
  const quarterTurn = (group.quarterTurn + 1) % 4 as Placement['quarterTurn'];
  const offset = rotate(canonicalCenter(anchorId, definition), quarterTurn * Math.PI / 2);
  return { ...group, quarterTurn, translation: { x: anchor.center.x - offset.x, y: anchor.center.y - offset.y } };
}

export function canonicalConnections(definition: PuzzleDefinition): readonly [string, string][] {
  const pairs: [string, string][] = [];
  for (let row = 0; row < definition.rows; row++) for (let column = 0; column < definition.columns; column++) {
    const id = `${row}:${column}`;
    if (column + 1 < definition.columns) pairs.push([id, `${row}:${column + 1}`]);
    if (row + 1 < definition.rows) pairs.push([id, `${row + 1}:${column}`]);
  }
  return pairs;
}

export const connectionId = (a: string, b: string) => [a, b].sort().join('|');
export const snapTolerance = (zoom: number) => Math.min(48, Math.max(6, 18 / Math.max(0.01, zoom)));

export function snapGroup(state: PuzzleState, activeId: string, tolerance: number, pieces: readonly PieceGeometry[], definition: PuzzleDefinition): PuzzleState {
  const active = state.groups.find((group) => group.id === activeId);
  if (!active) return state;
  const members = new Set(active.pieceIds);
  const pairs = canonicalConnections(definition);
  const candidates = state.groups.filter((group) => group !== active && group.quarterTurn === active.quarterTurn && pairs.some(([a, b]) => (members.has(a) && group.pieceIds.includes(b)) || (members.has(b) && group.pieceIds.includes(a))))
    .map((group) => ({ group, error: Math.hypot(group.translation.x - active.translation.x, group.translation.y - active.translation.y) }))
    .filter((candidate) => candidate.error <= tolerance)
    .sort((a, b) => a.error - b.error || a.group.id.localeCompare(b.group.id));
  for (const { group: target } of candidates) {
    const merged: PieceGroup = { ...target, pieceIds: [...target.pieceIds, ...active.pieceIds].sort() };
    const bounded = boundGroup(merged, pieces, definition);
    if (Math.hypot(bounded.translation.x - merged.translation.x, bounded.translation.y - merged.translation.y) > 1e-7) continue;
    const mergedIds = new Set(merged.pieceIds);
    const confirmedConnections = [...new Set([...state.confirmedConnections, ...pairs.filter(([a, b]) => mergedIds.has(a) && mergedIds.has(b)).map(([a, b]) => connectionId(a, b))])].sort();
    return { groups: [...state.groups.filter((group) => group !== active && group !== target), merged], confirmedConnections };
  }
  return state;
}

export function puzzleProgress(state: PuzzleState, definition: PuzzleDefinition) {
  const expected = canonicalConnections(definition).length;
  return { connections: state.confirmedConnections.length, expected, groupCount: state.groups.length, completed: state.groups.length === 1 && state.groups[0].pieceIds.length === definition.rows * definition.columns && state.confirmedConnections.length === expected };
}
