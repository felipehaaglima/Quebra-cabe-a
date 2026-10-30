import type { Vec2 } from '../core/camera/camera';
import { boundPlacement, hitPiece } from '../core/puzzle/manipulation';
import type { PieceGeometry, Placement, PuzzleDefinition } from '../core/puzzle/puzzle';

export interface PieceInput {
  begin(point: Vec2): boolean;
  move(point: Vec2): void;
  end(commit: boolean): void;
  rotate(): boolean;
  nudge(delta: Vec2): boolean;
  select(id: string | null): void;
}

export class PieceController implements PieceInput {
  placements: Placement[];
  selectedId: string | null = null;
  private drag: { original: Placement; offset: Vec2 } | null = null;

  constructor(private pieces: readonly PieceGeometry[], placements: readonly Placement[], private definition: PuzzleDefinition, private onChange: (placements: readonly Placement[], selectedId: string | null) => void) {
    this.placements = placements.map((placement) => ({ ...placement, center: { ...placement.center } }));
  }

  private publish() { this.onChange(this.placements, this.selectedId); }
  private replace(placement: Placement) {
    this.placements = this.placements.map((item) => item.pieceId === placement.pieceId ? placement : item);
    this.publish();
  }
  private bounded(placement: Placement) {
    return boundPlacement(placement, this.pieces.find((piece) => piece.id === placement.pieceId)!, this.definition);
  }

  select(id: string | null) {
    this.end(false);
    const placement = this.placements.find((item) => item.pieceId === id);
    this.selectedId = placement ? placement.pieceId : null;
    if (placement) this.placements = [...this.placements.filter((item) => item !== placement), placement];
    this.publish();
  }

  begin(point: Vec2): boolean {
    const hit = hitPiece(point, this.pieces, this.placements, this.definition);
    this.select(hit?.pieceId ?? null);
    if (!hit) return false;
    this.drag = { original: hit, offset: { x: point.x - hit.center.x, y: point.y - hit.center.y } };
    return true;
  }

  move(point: Vec2) {
    if (!this.drag) return;
    this.replace(this.bounded({ ...this.drag.original, center: { x: point.x - this.drag.offset.x, y: point.y - this.drag.offset.y } }));
  }

  end(commit: boolean) {
    const drag = this.drag;
    this.drag = null;
    if (drag && !commit) this.replace(drag.original);
  }

  rotate(): boolean {
    this.end(true);
    const placement = this.placements.find((item) => item.pieceId === this.selectedId);
    if (!placement) return false;
    this.replace(this.bounded({ ...placement, quarterTurn: (placement.quarterTurn + 1) % 4 as Placement['quarterTurn'] }));
    return true;
  }

  nudge(delta: Vec2): boolean {
    this.end(true);
    const placement = this.placements.find((item) => item.pieceId === this.selectedId);
    if (!placement) return false;
    this.replace(this.bounded({ ...placement, center: { x: placement.center.x + delta.x, y: placement.center.y + delta.y } }));
    return true;
  }
}
