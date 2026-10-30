import { describe, expect, it } from 'vitest';
import { centerCamera, fitZoom, limitCamera, panCamera, transformCamera, screenToWorld, worldToScreen, zoomCamera } from '../../src/game/core/camera/camera';

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

describe('transformação com dois dedos', () => {
  const viewport = { width: 800, height: 600 };
  const camera = centerCamera(viewport);
  const before = [{ x: 350, y: 250 }, { x: 450, y: 250 }] as const;
  it('combina pan, pinça e giro mantendo o ponto entre os dedos', () => {
    const after = [{ x: 440, y: 190 }, { x: 440, y: 390 }] as const;
    const next = transformCamera(camera, before, after, viewport);
    expect(next.zoom).toBeCloseTo(camera.zoom * 2);
    expect(next.angleRad).toBeCloseTo(Math.PI / 2);
    const anchor = screenToWorld({ x: 400, y: 250 }, camera, viewport);
    const actual = worldToScreen(anchor, next, viewport);
    expect(actual.x).toBeCloseTo(440);
    expect(actual.y).toBeCloseTo(290);
    const restored = transformCamera(next, after, before, viewport);
    expect(restored.center.x).toBeCloseTo(camera.center.x);
    expect(restored.center.y).toBeCloseTo(camera.center.y);
    expect(restored.zoom).toBeCloseTo(camera.zoom);
    expect(restored.angleRad).toBeCloseTo(0);
  });
  it('trata dedos coincidentes sem produzir zoom infinito', () => {
    expect(transformCamera(camera, [before[0], before[0]], before, viewport)).toBe(camera);
    expect(transformCamera(camera, before, [before[0], before[0]], viewport)).toBe(camera);
  });
  it('mantém limites sob pinça extrema e normaliza o giro ao cruzar 180°', () => {
    const next = transformCamera(camera, before, [{ x: -10000, y: 200 }, { x: 10000, y: 200 }], viewport);
    expect(next.zoom).toBe(fitZoom(viewport) * 4);
    const rotated = transformCamera(camera, [{ x: 450, y: 299 }, { x: 350, y: 301 }], [{ x: 450, y: 301 }, { x: 350, y: 299 }], viewport);
    expect(rotated.angleRad).toBeLessThan(0.05);
  });
});
