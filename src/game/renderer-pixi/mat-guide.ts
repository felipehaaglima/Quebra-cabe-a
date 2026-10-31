import { Container, Graphics } from 'pixi.js';
import type { PuzzleDefinition } from '../core/puzzle/puzzle';
const lastTarget = new WeakMap<Container, string>();

export function createMatGuide(definition: PuzzleDefinition): Container {
  const layer = new Container(); layer.label = 'mat-guide'; layer.eventMode = 'none';
  const grid = new Graphics(); grid.label = 'guide-reservations';
  const width = definition.imageWidth / definition.columns, height = definition.imageHeight / definition.rows;
  for (let row = 0; row < definition.rows; row++) for (let column = 0; column < definition.columns; column++) {
    grid.rect(column * width - definition.imageWidth / 2 + 3, row * height - definition.imageHeight / 2 + 3, width - 6, height - 6).fill({ color: 0xf5f1e8, alpha: 0.035 }).stroke({ color: 0xe8e0cc, width: 1.5, alpha: 0.5 });
  }
  const target = new Graphics(); target.label = 'guide-target'; layer.addChild(grid, target); return layer;
}
export function updateMatGuide(world: Container, definition: PuzzleDefinition, enabled: boolean, hovered: readonly string[]) {
  const layer = world.getChildByLabel('mat-guide')!;
  layer.visible = enabled; world.getChildByLabel('mat-caption')!.visible = !enabled;
  const key = `${enabled}:${hovered.join('|')}`;
  if (lastTarget.get(layer) === key) return;
  lastTarget.set(layer, key);
  const target = layer.getChildByLabel('guide-target') as Graphics; target.clear();
  if (!enabled) return;
  const width = definition.imageWidth / definition.columns, height = definition.imageHeight / definition.rows;
  for (const id of hovered) {
    const [row, column] = id.split(':').map(Number);
    target.rect(column * width - definition.imageWidth / 2 + 3, row * height - definition.imageHeight / 2 + 3, width - 6, height - 6).fill({ color: 0xffdb85, alpha: 0.28 }).stroke({ color: 0xffdb85, width: 4 });
  }
}
