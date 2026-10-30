import { Container, Graphics, Sprite, type Texture } from 'pixi.js';
import type { PieceGeometry, PuzzleDefinition } from '../core/puzzle/puzzle';
import type { MatGuideHint } from '../core/puzzle/mat-guide';

const lastTarget = new WeakMap<Container, string>();

export function createMatGuide(texture: Texture, pieces: readonly PieceGeometry[], definition: PuzzleDefinition): Container {
  const layer = new Container(); layer.label = 'mat-guide'; layer.visible = false; layer.eventMode = 'none';
  const image = new Sprite(texture);
  image.position.set(-definition.imageWidth / 2, -definition.imageHeight / 2);
  image.width = definition.imageWidth; image.height = definition.imageHeight; image.alpha = 0.24;
  const contours = new Graphics();
  for (const piece of pieces) contours.poly(piece.polygon.flatMap((point) => [point.x + piece.canonicalOrigin.x - definition.imageWidth / 2, point.y + piece.canonicalOrigin.y - definition.imageHeight / 2])).stroke({ color: 0xe8eedc, width: 1.5, alpha: 0.6 });
  const target = new Graphics(); target.label = 'guide-target';
  layer.addChild(image, contours, target);
  return layer;
}

export function updateMatGuide(world: Container, pieces: readonly PieceGeometry[], definition: PuzzleDefinition, enabled: boolean, members: readonly string[], hint: MatGuideHint) {
  const layer = world.getChildByLabel('mat-guide')!;
  layer.visible = enabled;
  world.getChildByLabel('mat-caption')!.visible = !enabled;
  const key = `${enabled}:${hint}:${members.join('|')}`;
  if (lastTarget.get(layer) === key) return;
  lastTarget.set(layer, key);
  const target = layer.getChildByLabel('guide-target') as Graphics;
  target.clear();
  if (!enabled) return;
  const selected = new Set(members);
  const color = hint === 'near' || hint === 'aligned' ? 0xc4f0a5 : 0xffdb85;
  for (const piece of pieces) if (selected.has(piece.id)) target.poly(piece.polygon.flatMap((point) => [point.x + piece.canonicalOrigin.x - definition.imageWidth / 2, point.y + piece.canonicalOrigin.y - definition.imageHeight / 2])).stroke({ color, width: 4, alpha: 0.9 });
}
