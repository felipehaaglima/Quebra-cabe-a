import { defaultPreferences, type GamePreferences } from '../core/preferences';
import { claimRewards, type RewardEntry } from '../core/puzzle/rewards';
import type { FeedbackEvent } from '../feedback/audio';
import { distributePieces } from '../core/puzzle/puzzle';
import { hoveredSlots, validMatPlacement, matGuideHint, releaseWithGuide, type MatGuideHint } from '../core/puzzle/mat-guide';
import { boundBag, hitBag, initialBags, storePiece, type BagState } from '../core/puzzle/bags';
import type { ModelSnapshot } from '../persistence/snapshot';
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
export type GroupInfo = ReturnType<typeof puzzleProgress> & { selectedMembers: readonly string[]; guideEnabled: boolean; guideHint: MatGuideHint; guideHover: readonly string[]; bags: readonly BagState[]; hiddenIds: readonly string[]; bagPanelOpen: boolean; openBagId: string | null; dropBagId: string | null; notice: string; transient: boolean; balance: number; preferences: GamePreferences };

export class PieceController implements PieceInput {
  placements: Placement[];
  state: PuzzleState;
  selectedId: string | null = null;
  guideEnabled = true;
  bagReturns: ModelSnapshot['bagReturns'] = [];
  bags = initialBags();
  bagPanelOpen = false;
  openBagId: string | null = null;
  notice = '';
  completedAt: string | null = null;
  localCoinBalance = 0;
  rewardLedger: RewardEntry[] = [];
  preferences = defaultPreferences();
  private bagDrag: { original: BagState; start: Vec2; moved: boolean } | null = null;
  private zoom = 1;
  private order: string[];
  private drag: { original: PieceGroup; start: Vec2; moved: boolean } | null = null;

  constructor(private pieces: readonly PieceGeometry[], placements: readonly Placement[], private definition: PuzzleDefinition, private onChange: (placements: readonly Placement[], selectedId: string | null, info: GroupInfo) => void, private feedback: (event: FeedbackEvent, earned?: number) => void = () => {}) {
    this.state = createPuzzleState(placements, definition);
    this.placements = placements.map((placement) => ({ ...placement, center: { ...placement.center } }));
    this.order = placements.map((placement) => placement.pieceId);
  }
  private hiddenIds() { return this.bags.flatMap((bag) => bag.pieceIds); }
  private selectedGroup() { return this.state.groups.find((group) => group.pieceIds.includes(this.selectedId ?? '')); }
  private publish() {
    const poses = new Map(this.state.groups.flatMap((group) => groupPlacements(group, this.definition)).map((placement) => [placement.pieceId, placement]));
    const previous = new Map(this.placements.map((placement) => [placement.pieceId, placement]));
    this.placements = this.order.map((id) => {
      const next = poses.get(id)!, old = previous.get(id)!;
      return old && old.quarterTurn === next.quarterTurn && Math.hypot(old.center.x - next.center.x, old.center.y - next.center.y) < 1e-10 ? old : next;
    });
    const progress = puzzleProgress(this.state, this.definition);
    if (progress.completed && !this.completedAt) this.completedAt = new Date().toISOString();
    const pose = this.placements.find((item) => item.pieceId === this.selectedId);
    const drop = this.drag && pose ? hitBag(this.bags, pose.center) : undefined;
    this.onChange(this.placements, this.selectedId, { ...puzzleProgress(this.state, this.definition), selectedMembers: this.selectedGroup()?.pieceIds ?? [], guideEnabled: this.guideEnabled, guideHover: this.drag ? hoveredSlots(this.selectedGroup(), this.definition) : [], guideHint: matGuideHint(this.selectedGroup(), snapTolerance(this.zoom)), bags: this.bags, hiddenIds: this.hiddenIds(), bagPanelOpen: this.bagPanelOpen, openBagId: this.openBagId, dropBagId: drop?.id ?? this.bagDrag?.original.id ?? null, notice: this.notice, transient: !!this.drag || !!this.bagDrag, balance: this.localCoinBalance, preferences: this.preferences });
  }
  refresh() { this.publish(); }
  exportModel(): ModelSnapshot {
    const state = this.drag ? { ...this.state, groups: this.state.groups.map((group) => group.id === this.drag!.original.id ? this.drag!.original : group) } : this.state;
    const bags = this.bagDrag ? this.bags.map((bag) => bag.id === this.bagDrag!.original.id ? this.bagDrag!.original : bag) : this.bags;
    return structuredClone({ state, bags, order: this.order, guideEnabled: this.guideEnabled, completedAt: this.completedAt, localCoinBalance: this.localCoinBalance, rewardLedger: this.rewardLedger, bagReturns: this.bagReturns, preferences: this.preferences });
  }
  restore(model: ModelSnapshot) {
    this.state = structuredClone(model.state); this.bags = structuredClone(model.bags); this.order = [...model.order];
    this.guideEnabled = model.guideEnabled; this.completedAt = model.completedAt; this.localCoinBalance = model.localCoinBalance; this.rewardLedger = structuredClone(model.rewardLedger); this.preferences = { ...model.preferences };
    this.bagReturns = structuredClone(model.bagReturns);
    this.selectedId = null; this.drag = null; this.bagDrag = null;
  }
  setPreferences(preferences: GamePreferences) { this.preferences = { ...preferences }; this.publish(); }
  newPuzzle() {
    this.finishDrag(false);
    const placements = distributePieces(this.pieces, this.definition.seed);
    this.state = createPuzzleState(placements, this.definition); this.order = placements.map((pose) => pose.pieceId);
    this.bagReturns = []; this.guideEnabled = true;
    this.bags = initialBags(); this.selectedId = null; this.completedAt = null; this.notice = 'Nova montagem. Moedas e recompensas anteriores foram preservadas.';
    this.publish();
  }
  openBags(id = this.bags[0]?.id ?? null) { this.bagPanelOpen = true; this.openBagId = id; this.publish(); }
  closeBags() { this.bagPanelOpen = false; this.publish(); }
  createBag(label: string) {
    label = label.trim().slice(0, 40);
    if (!label || this.bags.length >= 16) { this.notice = 'Use um nome e no máximo 16 bolsas.'; this.publish(); return; }
    let i = 1; while (this.bags.some((bag) => bag.id === `bag-${i}`)) i++;
    const id = `bag-${i}`;
    this.bags = [...this.bags, { id, label, center: { x: Math.min(900, (i - 3) * 180), y: 450 }, pieceIds: [] }];
    this.notice = 'Bolsa criada.'; this.openBags(id);
  }
  renameBag(id: string, label: string) {
    label = label.trim().slice(0, 40); if (!label) return;
    this.bags = this.bags.map((bag) => bag.id === id ? { ...bag, label } : bag); this.publish();
  }
  moveBag(id: string, delta: Vec2) {
    this.bags = this.bags.map((bag) => bag.id === id ? { ...bag, center: boundBag({ x: bag.center.x + delta.x, y: bag.center.y + delta.y }) } : bag); this.publish();
  }
  storeSelected(bagId: string): boolean {
    if (!this.selectedId) return false;
    const bags = storePiece(this.bags, this.state, this.selectedId, bagId);
    if (!bags) { this.notice = 'Somente peças soltas podem ser guardadas.'; this.publish(); return false; }
    this.bagReturns = this.bagReturns.filter((origin) => origin.pieceId !== this.selectedId);
    this.bags = bags; this.selectedId = null; this.notice = 'Peça guardada.'; this.publish(); return true;
  }
  takePiece(bagId: string, pieceId: string) {
    const bag = this.bags.find((item) => item.id === bagId && item.pieceIds.includes(pieceId));
    const group = this.state.groups.find((item) => item.pieceIds.length === 1 && item.pieceIds[0] === pieceId);
    if (!bag || !group) return;
    if (this.guideEnabled) this.bagReturns = [...this.bagReturns.filter((origin) => origin.pieceId !== pieceId), { pieceId, bagId, original: structuredClone(group) }];
    this.bags = this.bags.map((item) => item.id === bagId ? { ...item, pieceIds: item.pieceIds.filter((id) => id !== pieceId) } : item);
    const pose = groupPlacements(group, this.definition)[0];
    this.selectedId = pieceId;
    this.replace(boundGroup({ ...group, translation: { x: group.translation.x + bag.center.x + 170 - pose.center.x, y: group.translation.y + bag.center.y - pose.center.y } }, this.pieces, this.definition));
    this.select(pieceId); this.notice = 'Peça retirada para a mesa.'; this.publish();
  }
  setGuideEnabled(enabled: boolean) { this.guideEnabled = enabled; if (!enabled) this.bagReturns = []; this.publish(); }
  setViewZoom(zoom: number) {
    const before = matGuideHint(this.selectedGroup(), snapTolerance(this.zoom));
    this.zoom = zoom;
    if (this.guideEnabled && before !== matGuideHint(this.selectedGroup(), snapTolerance(zoom))) this.publish();
  }
  private replace(group: PieceGroup) {
    this.state = { ...this.state, groups: this.state.groups.map((item) => item.id === group.id ? group : item) };
    this.publish();
  }
  private returnPlacement(original: PieceGroup) {
    const origin = this.bagReturns.find((item) => original.pieceIds.includes(item.pieceId));
    const restored = origin?.original ?? original;
    this.state = { ...this.state, groups: this.state.groups.map((item) => item.id === original.id ? restored : item) };
    if (origin) {
      this.bags = this.bags.map((bag) => bag.id === origin.bagId ? { ...bag, pieceIds: [...bag.pieceIds, origin.pieceId] } : bag);
      this.bagReturns = this.bagReturns.filter((item) => item !== origin); this.selectedId = null;
    }
    this.notice = origin ? 'Não encaixou. Peça devolvida à bolsa.' : 'Não encaixou. Seleção devolvida ao local anterior.';
    this.publish();
  }
  private clearReturns(members: readonly string[]) { this.bagReturns = this.bagReturns.filter((origin) => !members.includes(origin.pieceId)); }
  private finishDrag(commit: boolean) {
    const bagDrag = this.bagDrag; this.bagDrag = null;
    if (bagDrag && !commit) { this.bags = this.bags.map((bag) => bag.id === bagDrag.original.id ? bagDrag.original : bag); this.publish(); }
    const drag = this.drag; this.drag = null;
    if (drag && !commit) {
      if (this.bagReturns.some((origin) => drag.original.pieceIds.includes(origin.pieceId))) this.returnPlacement(drag.original);
      else this.replace(drag.original);
    }
    return drag;
  }
  select(id: string | null) {
    this.finishDrag(false);
    this.notice = '';
    this.selectedId = this.placements.some((item) => item.pieceId === id && !this.hiddenIds().includes(item.pieceId)) ? id : null;
    const members = new Set(this.selectedGroup()?.pieceIds ?? []);
    this.order = [...this.order.filter((item) => !members.has(item)), ...this.order.filter((item) => members.has(item))];
    this.publish();
  }
  begin(point: Vec2, hitSlop = 0): boolean {
    this.notice = '';
    const hidden = new Set(this.hiddenIds());
    const hit = hitPiece(point, this.pieces, this.placements.filter((item) => !hidden.has(item.pieceId)), this.definition, hitSlop);
    this.select(hit?.pieceId ?? null);
    const group = this.selectedGroup();
    if (!group) {
      const bag = hitBag(this.bags, point, hitSlop);
      if (!bag) return false;
      this.bagDrag = { original: bag, start: point, moved: false }; this.feedback('grab'); return true;
    }
    this.drag = { original: group, start: point, moved: false }; this.feedback('grab');
    return true;
  }
  move(point: Vec2) {
    if (this.bagDrag) {
      const { original, start } = this.bagDrag;
      if (!this.bagDrag.moved && Math.hypot(point.x - start.x, point.y - start.y) * this.zoom < 6) return;
      this.bagDrag.moved = true;
      this.bags = this.bags.map((bag) => bag.id === original.id ? { ...bag, center: boundBag({ x: original.center.x + point.x - start.x, y: original.center.y + point.y - start.y }) } : bag);
      this.publish(); return;
    }
    if (!this.drag) return;
    const { original, start } = this.drag;
    if (!this.drag.moved) this.feedback('drag');
    this.drag.moved = true;
    this.replace(boundGroup({ ...original, translation: { x: original.translation.x + point.x - start.x, y: original.translation.y + point.y - start.y } }, this.pieces, this.definition));
  }
  end(commit: boolean, zoom = 1) {
    const bagDrag = this.bagDrag;
    const drag = this.finishDrag(commit);
    if (!commit) return;
    if (bagDrag) { if (!bagDrag.moved) this.openBags(bagDrag.original.id); else this.publish(); return; }
    const pose = this.placements.find((item) => item.pieceId === this.selectedId);
    const bag = drag && pose ? hitBag(this.bags, pose.center) : undefined;
    if (bag) { this.storeSelected(bag.id); return; }
    const group = this.selectedGroup();
    if (drag && group && this.guideEnabled && hoveredSlots(group, this.definition).length && !validMatPlacement(group, this.definition)) { this.returnPlacement(drag.original); return; }
    if (drag && group) this.clearReturns(group.pieceIds);
    if (drag && (drag.moved || this.guideEnabled) && this.snap(zoom)) return;
    if (drag) { this.feedback('drop'); this.publish(); }
  }
  snap(zoom = 1): boolean {
    this.finishDrag(true);
    const group = this.selectedGroup();
    if (!group) return false;
    if (this.guideEnabled && hoveredSlots(group, this.definition).length && !validMatPlacement(group, this.definition)) {
      if (this.bagReturns.some((origin) => group.pieceIds.includes(origin.pieceId))) this.returnPlacement(group);
      else { this.notice = 'Não encaixou neste espaço. Tente outro lugar ou orientação.'; this.publish(); }
      return false;
    }
    const hidden = new Set(this.hiddenIds());
    const eligible = { ...this.state, groups: this.state.groups.filter((item) => !item.pieceIds.some((id) => hidden.has(id))) };
    const next = releaseWithGuide(eligible, group.id, zoom, this.guideEnabled, this.pieces, this.definition);
    if (next === eligible) return false;
    const previousConnections = this.state.confirmedConnections.length;
    this.state = { ...next, groups: [...this.state.groups.filter((item) => item.pieceIds.some((id) => hidden.has(id))), ...next.groups] };
    this.clearReturns(this.state.groups.find((item) => item.pieceIds.includes(this.selectedId!))!.pieceIds);
    const wasComplete = !!this.completedAt;
    const reward = claimRewards(this.state, this.definition, this.rewardLedger);
    this.rewardLedger = reward.ledger; this.localCoinBalance += reward.earned;
    this.feedback(!wasComplete && puzzleProgress(this.state, this.definition).completed ? 'complete' : this.state.confirmedConnections.length > previousConnections ? 'snap' : 'drop', reward.earned);
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
