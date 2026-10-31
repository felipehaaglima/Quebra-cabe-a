import { groupPlacements, snapGroup, snapTolerance, type PieceGroup, type PuzzleState } from './groups';
import type { PieceGeometry, PuzzleDefinition } from './puzzle';

export type MatGuideHint = 'none' | 'wrong-orientation' | 'far' | 'near' | 'aligned';

export function matGuideHint(group: PieceGroup | undefined, tolerance: number): MatGuideHint {
  if (!group) return 'none';
  if (group.quarterTurn !== 0) return 'wrong-orientation';
  const distance = Math.hypot(group.translation.x, group.translation.y);
  return distance <= 1e-7 ? 'aligned' : distance <= tolerance ? 'near' : 'far';
}

export function guideGroup(state: PuzzleState, groupId: string, tolerance: number): PuzzleState {
  const group = state.groups.find((item) => item.id === groupId);
  if (!group || !['near', 'aligned'].includes(matGuideHint(group, tolerance)) || (group.translation.x === 0 && group.translation.y === 0)) return state;
  return { ...state, groups: state.groups.map((item) => item === group ? { ...item, translation: { x: 0, y: 0 } } : item) };
}

// Positioning on the mat is not a connection. Only real neighboring groups join.
export function releaseWithGuide(state: PuzzleState, groupId: string, zoom: number, enabled: boolean, pieces: readonly PieceGeometry[], definition: PuzzleDefinition): PuzzleState {
  const original = state.groups.find((group) => group.id === groupId);
  if (!original) return state;
  const tolerance = snapTolerance(zoom);
  const attempt = enabled && hoveredSlots(original, definition).length > 0;
  if (attempt && !validMatPlacement(original, definition)) return state;
  const guided = attempt && validMatPlacement(original, definition);
  let next = guided ? guideGroup(state, groupId, Infinity) : state;
  const anchor = original.pieceIds[0];
  let activeId = groupId;
  let threshold = guided ? 1e-7 : tolerance;
  while (true) {
    const joined = snapGroup(next, activeId, threshold, pieces, definition);
    if (joined === next) return next;
    next = joined;
    activeId = next.groups.find((group) => group.pieceIds.includes(anchor))!.id;
    // Further neighbors must already align exactly: no cumulative magnet drift.
    threshold = 1e-7;
  }
}

// Neutral reservations: the hovered cell depends only on position, never identity.
export function slotAt(point: { x: number; y: number }, definition: PuzzleDefinition): string | null {
  const x = point.x + definition.imageWidth / 2, y = point.y + definition.imageHeight / 2;
  if (x < 0 || y < 0 || x >= definition.imageWidth || y >= definition.imageHeight) return null;
  return `${Math.floor(y / (definition.imageHeight / definition.rows))}:${Math.floor(x / (definition.imageWidth / definition.columns))}`;
}
export function hoveredSlots(group: PieceGroup | undefined, definition: PuzzleDefinition): string[] {
  return group ? [...new Set(groupPlacements(group, definition).map((pose) => slotAt(pose.center, definition)).filter((id): id is string => id !== null))] : [];
}
export function validMatPlacement(group: PieceGroup, definition: PuzzleDefinition): boolean {
  return group.quarterTurn === 0 && groupPlacements(group, definition).every((pose) => slotAt(pose.center, definition) === pose.pieceId);
}
