import { matGuideHint, releaseWithGuide, type MatGuideHint } from '../core/puzzle/mat-guide';
import type { Vec2 } from '../core/camera/camera';
import { hitPiece } from '../core/puzzle/manipulation';
import { boundGroup, createPuzzleState, groupPlacements, puzzleProgress, rotateGroup, snapTolerance, type PieceGroup, type PuzzleState } from '../core/puzzle/groups';
import type { PieceGeometry, Placement, PuzzleDefinition } from '../core/puzzle/puzzle';

export interface PieceInput {
  begin(point: Vec2, hitSlop?: number): boolean;
  move(point: Vec2): void;
  end(commit: boolean, zoom?: number): void;
  rotate(): boolean;
  nudge(delta: Vec2): boolean;
  select(id: string | null): void;
  snap?(zoom: number): boolean;
}
export type GroupInfo = ReturnType<typeof puzzleProgress> & { selectedMembers: readonly string[]; guideEnabled: boolean; guideHint: MatGuideHint };

export class PieceController implements PieceInput {
  placements: Placement[];
  state: PuzzleState;
  selectedId: string | null = null;
  guideEnabled = false;
  private zoom = 1;
  private order: string[];
  private drag: { original: PieceGroup; start: Vec2; moved: boolean } | null = null;

  constructor(private pieces: readonly PieceGeometry[], placements: readonly Placement[], private definition: PuzzleDefinition, private onChange: (placements: readonly Placement[], selectedId: string | null, info: GroupInfo) => void) {
    this.state = createPuzzleState(placements, definition);
    this.placements = placements.map((placement) => ({ ...placement, center: { ...placement.center } }));
    this.order = placements.map((placement) => placement.pieceId);
  }
  private selectedGroup() { return this.state.groups.find((group) => group.pieceIds.includes(this.selectedId ?? '')); }
  private publish() {
    const poses = new Map(this.state.groups.flatMap((group) => groupPlacements(group, this.definition)).map((placement) => [placement.pieceId, placement]));
    const previous = new Map(this.placements.map((placement) => [placement.pieceId, placement]));
    this.placements = this.order.map((id) => {
      const next = poses.get(id)!, old = previous.get(id)!;
      return old.quarterTurn === next.quarterTurn && Math.hypot(old.center.x - next.center.x, old.center.y - next.center.y) < 1e-10 ? old : next;
    });
    this.onChange(this.placements, this.selectedId, { ...puzzleProgress(this.state, this.definition), selectedMembers: this.selectedGroup()?.pieceIds ?? [], guideEnabled: this.guideEnabled, guideHint: matGuideHint(this.selectedGroup(), snapTolerance(this.zoom)) });
  }
  setGuideEnabled(enabled: boolean) { this.guideEnabled = enabled; this.publish(); }
  setViewZoom(zoom: number) {
    const before = matGuideHint(this.selectedGroup(), snapTolerance(this.zoom));
    this.zoom = zoom;
    if (this.guideEnabled && before !== matGuideHint(this.selectedGroup(), snapTolerance(zoom))) this.publish();
  }
  private replace(group: PieceGroup) {
    this.state = { ...this.state, groups: this.state.groups.map((item) => item.id === group.id ? group : item) };
    this.publish();
  }
  private finishDrag(commit: boolean) {
    const drag = this.drag; this.drag = null;
    if (drag && !commit) this.replace(drag.original);
    return drag;
  }
  select(id: string | null) {
    this.finishDrag(false);
    this.selectedId = this.placements.some((item) => item.pieceId === id) ? id : null;
    const members = new Set(this.selectedGroup()?.pieceIds ?? []);
    this.order = [...this.order.filter((item) => !members.has(item)), ...this.order.filter((item) => members.has(item))];
    this.publish();
  }
  begin(point: Vec2, hitSlop = 0): boolean {
    const hit = hitPiece(point, this.pieces, this.placements, this.definition, hitSlop);
    this.select(hit?.pieceId ?? null);
    const group = this.selectedGroup();
    if (!group) return false;
    this.drag = { original: group, start: point, moved: false };
    return true;
  }
  move(point: Vec2) {
    if (!this.drag) return;
    const { original, start } = this.drag;
    this.drag.moved = true;
    this.replace(boundGroup({ ...original, translation: { x: original.translation.x + point.x - start.x, y: original.translation.y + point.y - start.y } }, this.pieces, this.definition));
  }
  end(commit: boolean, zoom = 1) {
    const drag = this.finishDrag(commit);
    if (commit && drag?.moved) this.snap(zoom);
  }
  snap(zoom = 1): boolean {
    this.finishDrag(true);
    const group = this.selectedGroup();
    if (!group) return false;
    const next = releaseWithGuide(this.state, group.id, zoom, this.guideEnabled, this.pieces, this.definition);
    if (next === this.state) return false;
    this.state = next;
    // The newly merged group is brought forward as one unit.
    this.select(this.selectedId);
    return true;
  }
  rotate(): boolean {
    this.finishDrag(true);
    const group = this.selectedGroup();
    if (!group || !this.selectedId) return false;
    this.replace(boundGroup(rotateGroup(group, this.selectedId, this.definition), this.pieces, this.definition));
    return true;
  }
  nudge(delta: Vec2): boolean {
    this.finishDrag(true);
    const group = this.selectedGroup();
    if (!group) return false;
    this.replace(boundGroup({ ...group, translation: { x: group.translation.x + delta.x, y: group.translation.y + delta.y } }, this.pieces, this.definition));
    return true;
  }
  alignCompleted(): boolean {
    this.finishDrag(false);
    if (!puzzleProgress(this.state, this.definition).completed) return false;
    this.replace({ ...this.state.groups[0], translation: { x: 0, y: 0 }, quarterTurn: 0 });
    return true;
  }
}
