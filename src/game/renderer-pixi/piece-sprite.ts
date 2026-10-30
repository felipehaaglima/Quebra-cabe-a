import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { pointInPolygon, type PieceGeometry, type Placement, type PuzzleDefinition } from '../core/puzzle/puzzle';

export function createPieceSprite(piece: PieceGeometry, placement: Placement, definition: PuzzleDefinition, texture: Texture): Container {
  const node = new Container();
  node.label = `piece:${piece.id}`;
  node.eventMode = 'static';
  node.position.set(placement.center.x, placement.center.y);
  node.pivot.set(definition.imageWidth / definition.columns / 2, definition.imageHeight / definition.rows / 2);
  node.rotation = placement.quarterTurn * Math.PI / 2;
  const points = piece.polygon.flatMap((point) => [point.x, point.y]);
  const shadow = new Graphics().poly(points).fill({ color: 0x352719, alpha: 0.25 });
  shadow.position.set(4, 6);
  const image = new Sprite(texture);
  image.width = definition.imageWidth; image.height = definition.imageHeight;
  image.position.set(-piece.canonicalOrigin.x, -piece.canonicalOrigin.y);
  const mask = new Graphics().poly(points).fill(0xffffff);
  image.mask = mask;
  const outline = new Graphics().poly(points).stroke({ color: 0xf7ecd0, width: 1.5, alpha: 0.8 });
  node.addChild(shadow, image, mask, outline);
  // Exact local contour, including tabs and sockets, ready for F2.2 input.
  node.hitArea = { contains: (x: number, y: number) => pointInPolygon({ x, y }, piece.polygon) };
  return node;
}
