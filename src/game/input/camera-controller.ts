import { centerCamera, fitZoom, limitCamera, panCamera, zoomCamera, type Camera, type Viewport } from '../core/camera/camera';

export type CameraAction = 'zoom-in' | 'zoom-out' | 'rotate' | 'center' | 'left' | 'right' | 'up' | 'down';

export class CameraController {
  camera: Camera;
  private viewport: Viewport;
  private detach: () => void;

  constructor(private canvas: HTMLCanvasElement, viewport: Viewport, private onChange: (camera: Camera) => void) {
    this.viewport = viewport;
    this.camera = centerCamera(viewport);
    let drag: { id: number; x: number; y: number } | null = null;
    const down = (event: PointerEvent) => {
      if (drag || !event.isPrimary || event.button !== 0) return;
      canvas.focus({ preventScroll: true });
      canvas.setPointerCapture(event.pointerId);
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
      canvas.style.cursor = 'grabbing';
    };
    const move = (event: PointerEvent) => {
      if (!drag || drag.id !== event.pointerId) return;
      this.camera = panCamera(this.camera, { x: event.clientX - drag.x, y: event.clientY - drag.y }, this.viewport);
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
      this.onChange(this.camera);
    };
    const end = () => { drag = null; canvas.style.cursor = 'grab'; };
    const key = (event: KeyboardEvent) => {
      const actions: Record<string, CameraAction> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', '+': 'zoom-in', '=': 'zoom-in', '-': 'zoom-out', r: 'rotate', Home: 'center' };
      const action = actions[event.key];
      if (action) { event.preventDefault(); this.act(action); }
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('lostpointercapture', end);
    canvas.addEventListener('blur', end);
    canvas.addEventListener('keydown', key);
    this.detach = () => {
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', end);
      canvas.removeEventListener('pointercancel', end);
      canvas.removeEventListener('lostpointercapture', end);
      canvas.removeEventListener('blur', end);
      canvas.removeEventListener('keydown', key);
    };
  }

  act(action: CameraAction) {
    const midpoint = { x: this.viewport.width / 2, y: this.viewport.height / 2 };
    if (action === 'center') this.camera = centerCamera(this.viewport);
    else if (action === 'rotate') this.camera = limitCamera({ ...this.camera, angleRad: this.camera.angleRad + Math.PI / 2 }, this.viewport);
    else if (action === 'zoom-in' || action === 'zoom-out') this.camera = zoomCamera(this.camera, action === 'zoom-in' ? 1.25 : 0.8, midpoint, this.viewport);
    else {
      const delta = { left: { x: 60, y: 0 }, right: { x: -60, y: 0 }, up: { x: 0, y: 60 }, down: { x: 0, y: -60 } }[action];
      this.camera = panCamera(this.camera, delta, this.viewport);
    }
    this.onChange(this.camera);
  }

  resize(viewport: Viewport) {
    const relativeZoom = this.camera.zoom / fitZoom(this.viewport);
    this.viewport = viewport;
    this.camera = limitCamera({ ...this.camera, zoom: relativeZoom * fitZoom(viewport) }, viewport);
    this.onChange(this.camera);
  }

  destroy() { this.detach(); }
}
