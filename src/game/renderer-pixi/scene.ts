import { Application, Container, Graphics, Text, Texture, type Renderer } from 'pixi.js';
import { MAT, WORLD, type Camera, type Viewport } from '../core/camera/camera';

import { DEMO, type PieceGeometry, type Placement, type PuzzleDefinition } from '../core/puzzle/puzzle';
import { initialBags, type BagState } from '../core/puzzle/bags';
import { createBagLayer } from './bags';
export { updateBags } from './bags';
import { createMatGuide } from './mat-guide';
export { updateMatGuide } from './mat-guide';
import { createPieceSprite } from './piece-sprite';

export async function loadDemoTexture(): Promise<Texture> {
  const image = new Image();
  image.src = '/puzzles/demo/lago-sereno-v1.svg';
  await image.decode();
  return Texture.from(image);
}

export function createWorld(texture: Texture, pieces: readonly PieceGeometry[], placements: readonly Placement[], definition: PuzzleDefinition = DEMO, renderer: Renderer, bags: readonly BagState[] = initialBags()) {
  const world = new Container();
  const table = new Graphics().roundRect(-WORLD.width / 2, -WORLD.height / 2, WORLD.width, WORLD.height, 40).fill(0xd7b58e);
  // Procedural wood and fabric; no external media or random world state.
  for (let y = -WORLD.height / 2; y < WORLD.height / 2; y += 90) {
    table.moveTo(-WORLD.width / 2, y).lineTo(WORLD.width / 2, y).stroke({ color: 0x99734f, alpha: 0.25, width: 2 });
    for (let x = -WORLD.width / 2; x < WORLD.width / 2; x += 160) {
      table.moveTo(x, y + 18).bezierCurveTo(x + 40, y + 10, x + 90, y + 32, x + 150, y + 20).stroke({ color: 0xa67f58, alpha: 0.16, width: 1 });
    }
  }
  world.addChild(table);
  world.addChild(new Graphics().roundRect(-MAT.width / 2 - 22, -MAT.height / 2 - 16, MAT.width + 56, MAT.height + 56, 24).fill({ color: 0x503b28, alpha: 0.18 }));
  const mat = new Graphics().roundRect(-MAT.width / 2 - 24, -MAT.height / 2 - 24, MAT.width + 48, MAT.height + 48, 22).fill(0x5c7051)
    .roundRect(-MAT.width / 2, -MAT.height / 2, MAT.width, MAT.height, 5).fill(0x7c8c68);
  for (let y = -MAT.height / 2 + 8; y < MAT.height / 2; y += 8) mat.moveTo(-MAT.width / 2 + 5, y).lineTo(MAT.width / 2 - 5, y).stroke({ color: 0xc2cda9, alpha: 0.08, width: 1 });
  world.addChild(mat);
  world.addChild(createMatGuide(texture, pieces, definition));
  const caption = new Text({ text: 'Seu espaço para montar', style: { fontFamily: 'Georgia, serif', fontSize: 27, fill: 0xe7ebdb, align: 'center' } });
  caption.label = 'mat-caption';
  caption.anchor.set(0.5); world.addChild(caption);
  world.addChild(createBagLayer(bags));
  const layer = new Container(); layer.label = 'pieces';
  const poses = new Map(placements.map((pose) => [pose.pieceId, pose]));
  for (const piece of pieces) layer.addChild(createPieceSprite(piece, poses.get(piece.id)!, definition, texture, renderer));
  world.addChild(layer);
  return world;
}

export function drawScene(app: Application, world: Container, camera: Camera, viewport: Viewport) {
  world.scale.set(camera.zoom);
  world.rotation = camera.angleRad;
  world.pivot.set(camera.center.x, camera.center.y);
  world.position.set(viewport.width / 2, viewport.height / 2);
  app.render();
}


const pieceNodeCache = new WeakMap<Container, Map<string, Container>>();

export function updatePieces(world: Container, placements: readonly Placement[], selectedId: string | null, selectedMembers: readonly string[] = selectedId ? [selectedId] : [], hiddenIds: readonly string[] = []) {
  const layer = world.getChildByLabel('pieces')!;
  let nodes = pieceNodeCache.get(layer);
  if (!nodes) { nodes = new Map(layer.children.map((node) => [node.label!, node])); pieceNodeCache.set(layer, nodes); }
  const selected = new Set(selectedMembers);
  const hidden = new Set(hiddenIds);
  placements.forEach((placement, index) => {
    const node = nodes.get(`piece:${placement.pieceId}`)!;
    node.visible = !hidden.has(placement.pieceId);
    node.position.set(placement.center.x, placement.center.y);
    node.rotation = placement.quarterTurn * Math.PI / 2;
    if (layer.children[index] !== node) layer.setChildIndex(node, index);
    node.getChildByLabel('selection')!.visible = selected.has(placement.pieceId);
  });
}
