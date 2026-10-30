export type Vec2 = { x: number; y: number };
export type Viewport = { width: number; height: number };
export type Camera = { center: Vec2; zoom: number; angleRad: number };

// Logical world units, independent of viewport pixels and device pixel ratio.
export const MAT = { width: 800, height: 600 } as const;
export const WORLD = { width: MAT.width * 3, height: MAT.height * 3 } as const;
export const INITIAL_CAMERA: Camera = { center: { x: 0, y: 0 }, zoom: 1, angleRad: 0 };

export function rotate(point: Vec2, angle: number): Vec2 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: point.x * c - point.y * s, y: point.x * s + point.y * c };
}

export function worldToScreen(point: Vec2, camera: Camera, viewport: Viewport): Vec2 {
  const delta = rotate({ x: point.x - camera.center.x, y: point.y - camera.center.y }, camera.angleRad);
  return { x: viewport.width / 2 + delta.x * camera.zoom, y: viewport.height / 2 + delta.y * camera.zoom };
}

export function screenToWorld(point: Vec2, camera: Camera, viewport: Viewport): Vec2 {
  const delta = rotate({ x: (point.x - viewport.width / 2) / camera.zoom, y: (point.y - viewport.height / 2) / camera.zoom }, -camera.angleRad);
  return { x: camera.center.x + delta.x, y: camera.center.y + delta.y };
}

export function fitZoom(viewport: Viewport): number {
  return Math.max(0.01, Math.min(viewport.width / (MAT.width * 1.5), viewport.height / (MAT.height * 1.5)));
}

export function limitCamera(camera: Camera, viewport: Viewport): Camera {
  const base = fitZoom(viewport);
  return {
    center: {
      x: Math.max(-MAT.width / 2, Math.min(MAT.width / 2, camera.center.x)),
      y: Math.max(-MAT.height / 2, Math.min(MAT.height / 2, camera.center.y)),
    },
    zoom: Math.max(base * 0.5, Math.min(base * 4, camera.zoom)),
    angleRad: ((camera.angleRad % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2),
  };
}

export function centerCamera(viewport: Viewport): Camera {
  return { center: { x: 0, y: 0 }, zoom: fitZoom(viewport), angleRad: 0 };
}

export function panCamera(camera: Camera, deltaScreen: Vec2, viewport: Viewport): Camera {
  const delta = rotate({ x: deltaScreen.x / camera.zoom, y: deltaScreen.y / camera.zoom }, -camera.angleRad);
  return limitCamera({ ...camera, center: { x: camera.center.x - delta.x, y: camera.center.y - delta.y } }, viewport);
}

export function zoomCamera(camera: Camera, factor: number, anchor: Vec2, viewport: Viewport): Camera {
  const before = screenToWorld(anchor, camera, viewport);
  const next = limitCamera({ ...camera, zoom: camera.zoom * factor }, viewport);
  const after = screenToWorld(anchor, next, viewport);
  return limitCamera({ ...next, center: { x: next.center.x + before.x - after.x, y: next.center.y + before.y - after.y } }, viewport);
}

export type PointerPair = readonly [Vec2, Vec2];

// Keep the world point under the original midpoint under the moving fingers.
export function transformCamera(camera: Camera, before: PointerPair, after: PointerPair, viewport: Viewport): Camera {
  const midpoint = (pair: PointerPair): Vec2 => ({ x: (pair[0].x + pair[1].x) / 2, y: (pair[0].y + pair[1].y) / 2 });
  const distance = (pair: PointerPair) => Math.hypot(pair[1].x - pair[0].x, pair[1].y - pair[0].y);
  const angle = (pair: PointerPair) => Math.atan2(pair[1].y - pair[0].y, pair[1].x - pair[0].x);
  if (distance(before) < 8 || distance(after) < 8) return camera;
  const anchor = screenToWorld(midpoint(before), camera, viewport);
  const next = limitCamera({ ...camera, zoom: camera.zoom * distance(after) / distance(before), angleRad: camera.angleRad + angle(after) - angle(before) }, viewport);
  const projected = screenToWorld(midpoint(after), next, viewport);
  return limitCamera({ ...next, center: { x: next.center.x + anchor.x - projected.x, y: next.center.y + anchor.y - projected.y } }, viewport);
}
