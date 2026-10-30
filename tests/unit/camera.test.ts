import { describe, expect, it } from 'vitest';
import { centerCamera, fitZoom, limitCamera, panCamera, screenToWorld, worldToScreen, zoomCamera } from '../../src/game/core/camera/camera';

for (const viewport of [{ width: 390, height: 650 }, { width: 1440, height: 700 }]) {
  describe(`câmera ${viewport.width}`, () => {
    for (const angleRad of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
      for (const zoom of [0.2, 1, 3]) {
        it(`inverte coordenadas em ${angleRad} rad e zoom ${zoom}`, () => {
          const camera = { center: { x: 47, y: -120 }, angleRad, zoom };
          const point = { x: -380, y: 210 };
          const result = screenToWorld(worldToScreen(point, camera, viewport), camera, viewport);
          expect(result.x).toBeCloseTo(point.x);
          expect(result.y).toBeCloseTo(point.y);
        });
      }
    }
    it('mantém o ponto focal no zoom, sem mutar a câmera anterior', () => {
      const camera = centerCamera(viewport);
      camera.angleRad = Math.PI / 2;
      const original = structuredClone(camera);
      const anchor = { x: viewport.width * 0.6, y: viewport.height * 0.4 };
      const before = screenToWorld(anchor, camera, viewport);
      const after = screenToWorld(anchor, zoomCamera(camera, 1.5, anchor, viewport), viewport);
      expect(after.x).toBeCloseTo(before.x);
      expect(after.y).toBeCloseTo(before.y);
      expect(camera).toEqual(original);
    });
    it('arrasta no espaço da tela mesmo com a mesa girada', () => {
      const camera = { ...centerCamera(viewport), angleRad: Math.PI / 2 };
      const next = panCamera(camera, { x: 20, y: -10 }, viewport);
      const before = worldToScreen({ x: 0, y: 0 }, camera, viewport);
      const after = worldToScreen({ x: 0, y: 0 }, next, viewport);
      expect(after.x - before.x).toBeCloseTo(20);
      expect(after.y - before.y).toBeCloseTo(-10);
    });
    it('limita pan e zoom e recupera a visão inicial', () => {
      const next = limitCamera({ center: { x: 1e6, y: -1e6 }, zoom: 1e6, angleRad: 9 * Math.PI }, viewport);
      expect(next.center).toEqual({ x: 400, y: -300 });
      expect(next.zoom).toBe(fitZoom(viewport) * 4);
      expect(next.angleRad).toBeCloseTo(Math.PI);
      const initial = centerCamera(viewport);
      expect(worldToScreen({ x: 0, y: 0 }, initial, viewport)).toEqual({ x: viewport.width / 2, y: viewport.height / 2 });
    });
  });
}
