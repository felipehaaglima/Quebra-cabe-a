import { rotate, WORLD, type Vec2 } from '../camera/camera';
import { pointInPolygon, type PieceGeometry, type Placement, type PuzzleDefinition } from './puzzle';

export function pieceLocalPoint(point: Vec2, placement: Placement, definition: PuzzleDefinition): Vec2 {
  const local = rotate({ x: point.x - placement.center.x, y: point.y - placement.center.y }, -placement.quarterTurn * Math.PI / 2);
  return { x: local.x + definition.imageWidth / definition.columns / 2, y: local.y + definition.imageHeight / definition.rows / 2 };
}

export function hitPiece(point: Vec2, pieces: readonly PieceGeometry[], placements: readonly Placement[], definition: PuzzleDefinition): Placement | undefined {
  const shapes = new Map(pieces.map((piece) => [piece.id, piece]));
  return [...placements].reverse().find((placement) => {
    const shape = shapes.get(placement.pieceId);
    return shape && pointInPolygon(pieceLocalPoint(point, placement, definition), shape.polygon);
  });
}

// Clamp the entire rotated contour, not just the center, to the logical table.
export function boundPlacement(placement: Placement, shape: PieceGeometry, definition: PuzzleDefinition): Placement {
  const points = shape.polygon.map((point) => rotate({ x: point.x - definition.imageWidth / definition.columns / 2, y: point.y - definition.imageHeight / definition.rows / 2 }, placement.quarterTurn * Math.PI / 2));
  const minX = Math.min(...points.map((point) => point.x)), maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y)), maxY = Math.max(...points.map((point) => point.y));
  return { ...placement, center: { x: Math.max(-WORLD.width / 2 - minX, Math.min(WORLD.width / 2 - maxX, placement.center.x)), y: Math.max(-WORLD.height / 2 - minY, Math.min(WORLD.height / 2 - maxY, placement.center.y)) } };
}
