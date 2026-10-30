import { Application, Container, Graphics, Text, Texture } from 'pixi.js';
import { MAT, WORLD, type Camera, type Viewport } from '../core/camera/camera';

import { DEMO, type PieceGeometry, type Placement } from '../core/puzzle/puzzle';
import { createPieceSprite } from './piece-sprite';

export async function loadDemoTexture(): Promise<Texture> {
  const image = new Image();
  image.src = '/puzzles/demo/lago-sereno-v1.svg';
  await image.decode();
  return Texture.from(image);
}

export function createWorld(texture: Texture, pieces: readonly PieceGeometry[], placements: readonly Placement[]) {
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
  const caption = new Text({ text: 'Seu espaço para montar', style: { fontFamily: 'Georgia, serif', fontSize: 27, fill: 0xe7ebdb, align: 'center' } });
  caption.anchor.set(0.5); world.addChild(caption);
  for (const [index, x] of [-560, 560].entries()) {
    const bag = new Container();
    bag.position.set(x, 270);
    bag.rotation = index === 0 ? -0.12 : 0.1;
    bag.addChild(new Graphics().roundRect(-68, -68, 136, 144, 18).fill(0xb98a5d)
      .roundRect(-58, -75, 116, 24, 8).fill(0x946743)
      .roundRect(-48, -18, 96, 48, 5).fill(0xf3e7ce));
    const label = new Text({ text: index === 0 ? 'Bordas' : 'Cores', style: { fontFamily: 'Georgia, serif', fontSize: 20, fill: 0x604935 } });
    label.anchor.set(0.5); label.y = 6; bag.addChild(label); world.addChild(bag);
  }
  const layer = new Container(); layer.label = 'pieces';
  for (let index = 0; index < pieces.length; index++) layer.addChild(createPieceSprite(pieces[index], placements[index], DEMO, texture));
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


export function updatePieces(world: Container, placements: readonly Placement[], selectedId: string | null, selectedMembers: readonly string[] = selectedId ? [selectedId] : []) {
  const layer = world.getChildByLabel('pieces')!;
  placements.forEach((placement, index) => {
    const node = layer.getChildByLabel(`piece:${placement.pieceId}`)!;
    node.position.set(placement.center.x, placement.center.y);
    node.rotation = placement.quarterTurn * Math.PI / 2;
    layer.setChildIndex(node, index);
    node.getChildByLabel('selection')!.visible = selectedMembers.includes(placement.pieceId);
  });
}
