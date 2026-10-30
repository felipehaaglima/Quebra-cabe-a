import { WORLD, type Vec2 } from '../camera/camera';
import type { PuzzleState } from './groups';

export type BagState = { id: string; label: string; center: Vec2; pieceIds: string[] };
export const initialBags = (): BagState[] => [
  { id: 'bag-1', label: 'Bordas', center: { x: -560, y: 270 }, pieceIds: [] },
  { id: 'bag-2', label: 'Cores', center: { x: 560, y: 270 }, pieceIds: [] },
];
export function boundBag(center: Vec2): Vec2 {
  return { x: Math.max(-WORLD.width / 2 + 80, Math.min(WORLD.width / 2 - 80, center.x)), y: Math.max(-WORLD.height / 2 + 90, Math.min(WORLD.height / 2 - 90, center.y)) };
}
export function hitBag(bags: readonly BagState[], point: Vec2, slop = 0): BagState | undefined {
  return [...bags].reverse().find((bag) => Math.abs(point.x - bag.center.x) <= 80 + slop && Math.abs(point.y - bag.center.y) <= 90 + slop);
}
export function storePiece(bags: readonly BagState[], state: PuzzleState, pieceId: string, bagId: string): BagState[] | null {
  if (!bags.some((bag) => bag.id === bagId) || bags.some((bag) => bag.pieceIds.includes(pieceId))) return null;
  const group = state.groups.find((item) => item.pieceIds.includes(pieceId));
  if (!group || group.pieceIds.length !== 1) return null;
  return bags.map((bag) => bag.id === bagId ? { ...bag, pieceIds: [...bag.pieceIds, pieceId] } : bag);
}
