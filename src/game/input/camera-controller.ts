import { centerCamera, fitZoom, limitCamera, panCamera, zoomCamera, transformCamera, type Camera, type Viewport, type Vec2 } from '../core/camera/camera';

export type CameraAction = 'zoom-in' | 'zoom-out' | 'rotate' | 'center' | 'left' | 'right' | 'up' | 'down';

export class CameraController {
  camera: Camera;
  private viewport: Viewport;
  private detach: () => void;
  private cancelGesture: () => void;

  constructor(private canvas: HTMLCanvasElement, viewport: Viewport, private onChange: (camera: Camera) => void) {
    this.viewport = viewport;
    this.camera = centerCamera(viewport);
    const pointers = new Map<number, Vec2>();
    let baseline: { camera: Camera; points: Vec2[] } | null = null;
    const localPoint = (event: PointerEvent): Vec2 => {
      const rect = canvas.getBoundingClientRect();
      return { x: (event.clientX - rect.left) * this.viewport.width / rect.width, y: (event.clientY - rect.top) * this.viewport.height / rect.height };
    };
    const rebase = () => {
      baseline = pointers.size ? { camera: this.camera, points: [...pointers.values()] } : null;
      canvas.style.cursor = pointers.size ? 'grabbing' : 'grab';
    };
    const clear = () => {
      const ids = [...pointers.keys()];
      pointers.clear(); rebase();
      for (const id of ids) if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    };
    this.cancelGesture = clear;
    const down = (event: PointerEvent) => {
      if (event.button !== 0 || pointers.size >= 2) return;
      canvas.focus({ preventScroll: true });
      canvas.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, localPoint(event));
      rebase();
    };
    const move = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId) || !baseline) return;
      pointers.set(event.pointerId, localPoint(event));
      const current = [...pointers.values()];
      if (current.length === 2) {
        this.camera = transformCamera(baseline.camera, [baseline.points[0], baseline.points[1]], [current[0], current[1]], this.viewport);
        // Rebase coincident fingers before they spread, avoiding division by zero.
        if (Math.hypot(baseline.points[0].x - baseline.points[1].x, baseline.points[0].y - baseline.points[1].y) < 8) rebase();
      } else {
        this.camera = panCamera(baseline.camera, { x: current[0].x - baseline.points[0].x, y: current[0].y - baseline.points[0].y }, this.viewport);
      }
      this.onChange(this.camera);
    };
    const end = (event: PointerEvent) => {
      if (!pointers.delete(event.pointerId)) return;
      // Lifting a finger starts a fresh single-finger pan from this exact view.
      rebase();
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      clear();
      const rect = canvas.getBoundingClientRect();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? this.viewport.height : 1;
      const factor = Math.exp(Math.max(-0.7, Math.min(0.7, -event.deltaY * unit * 0.002)));
      this.camera = zoomCamera(this.camera, factor, { x: (event.clientX - rect.left) * this.viewport.width / rect.width, y: (event.clientY - rect.top) * this.viewport.height / rect.height }, this.viewport);
      this.onChange(this.camera);
    };
    const visibility = () => { if (document.hidden) clear(); };
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
    canvas.addEventListener('blur', clear);
    window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', visibility);
    canvas.addEventListener('wheel', wheel, { passive: false });
    canvas.addEventListener('keydown', key);
    this.detach = () => {
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', end);
      canvas.removeEventListener('pointercancel', end);
      canvas.removeEventListener('lostpointercapture', end);
      canvas.removeEventListener('blur', clear);
      window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', visibility);
      canvas.removeEventListener('wheel', wheel);
      clear();
      canvas.removeEventListener('keydown', key);
    };
  }

  act(action: CameraAction) {
    this.cancelGesture();
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
    this.cancelGesture();
    const relativeZoom = this.camera.zoom / fitZoom(this.viewport);
    this.viewport = viewport;
    this.camera = limitCamera({ ...this.camera, zoom: relativeZoom * fitZoom(viewport) }, viewport);
    this.onChange(this.camera);
  }

  destroy() { this.detach(); }
}
