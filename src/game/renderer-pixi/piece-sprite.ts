import { Container, Graphics, Sprite, Texture, Rectangle, type Renderer } from 'pixi.js';
import { pointInPolygon, type PieceGeometry, type Placement, type PuzzleDefinition } from '../core/puzzle/puzzle';

export function createPieceSprite(piece: PieceGeometry, placement: Placement, definition: PuzzleDefinition, texture: Texture, renderer: Renderer): Container {
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
  const selection = new Graphics().poly(points).stroke({ color: 0xffd978, width: 5 });
  selection.label = 'selection'; selection.visible = false;
  // Bake only this contour's bounds once. Moving pieces then uses batched quads,
  // rather than re-running 24/48 stencil masks on every pointer event.
  const visual = new Container(); visual.addChild(shadow, image, mask, outline);
  const minX = Math.floor(Math.min(...piece.polygon.map((point) => point.x))) - 3;
  const minY = Math.floor(Math.min(...piece.polygon.map((point) => point.y))) - 3;
  const maxX = Math.ceil(Math.max(...piece.polygon.map((point) => point.x))) + 9;
  const maxY = Math.ceil(Math.max(...piece.polygon.map((point) => point.y))) + 11;
  const baked = renderer.generateTexture({ target: visual, frame: new Rectangle(minX, minY, maxX - minX, maxY - minY), resolution: 2, antialias: true, textureSourceOptions: { autoGenerateMipmaps: true } });
  visual.destroy({ children: true });
  const sprite = new Sprite(baked); sprite.position.set(minX, minY);
  node.addChild(sprite, selection);
  node.on('destroyed', () => baked.destroy(true));
  // Exact local contour, including tabs and sockets, ready for F2.2 input.
  node.hitArea = { contains: (x: number, y: number) => pointInPolygon({ x, y }, piece.polygon) };
  return node;
}
