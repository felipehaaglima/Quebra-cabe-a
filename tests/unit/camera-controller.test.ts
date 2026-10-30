import { afterEach, describe, expect, it, vi } from 'vitest';
import { CameraController } from '../../src/game/input/camera-controller';

let input: CameraController | undefined;
afterEach(() => { input?.destroy(); input = undefined; document.body.replaceChildren(); });

function setup() {
  const canvas = document.createElement('canvas');
  document.body.appendChild(canvas);
  const captured = new Set<number>();
  canvas.setPointerCapture = (id) => { captured.add(id); };
  canvas.hasPointerCapture = (id) => captured.has(id);
  canvas.releasePointerCapture = (id) => { captured.delete(id); };
  canvas.getBoundingClientRect = () => ({ x: 20, y: 100, left: 20, top: 100, width: 800, height: 600, right: 820, bottom: 700, toJSON: () => ({}) });
  const changed = vi.fn();
  input = new CameraController(canvas, { width: 800, height: 600 }, changed);
  const pointer = (type: string, id: number, x: number, y: number) => {
    const event = new Event(type);
    Object.assign(event, { pointerId: id, button: 0, clientX: x + 20, clientY: y + 100 });
    canvas.dispatchEvent(event);
  };
  return { canvas, input, pointer, changed, captured };
}

describe('controle de gestos', () => {
  it('troca de um para dois e de volta para um dedo sem salto', () => {
    const { input, pointer } = setup();
    pointer('pointerdown', 1, 350, 300);
    pointer('pointermove', 1, 370, 300);
    const panned = structuredClone(input.camera);
    pointer('pointerdown', 2, 450, 300);
    expect(input.camera).toEqual(panned);
    pointer('pointermove', 2, 490, 300);
    expect(input.camera.zoom).toBeCloseTo(panned.zoom * 1.5);
    pointer('pointerup', 2, 490, 300);
    const pinched = structuredClone(input.camera);
    pointer('pointermove', 1, 370, 300);
    expect(input.camera).toEqual(pinched);
    pointer('pointermove', 1, 380, 300);
    expect(input.camera.center.x).toBeCloseTo(pinched.center.x - 10 / pinched.zoom);
  });
  it('ignora terceiro dedo e limpa capturas ao perder foco', () => {
    const { input, pointer, captured } = setup();
    pointer('pointerdown', 1, 350, 300);
    pointer('pointerdown', 2, 450, 300);
    pointer('pointerdown', 3, 400, 200);
    expect(captured.size).toBe(2);
    const before = structuredClone(input.camera);
    pointer('pointermove', 3, 0, 0);
    expect(input.camera).toEqual(before);
    window.dispatchEvent(new Event('blur'));
    expect(captured.size).toBe(0);
    pointer('pointermove', 1, 100, 0);
    expect(input.camera).toEqual(before);
  });
  it('cancelamento, resize e destruição não deixam arraste preso', () => {
    const { input, pointer, captured, changed } = setup();
    pointer('pointerdown', 1, 400, 300);
    pointer('pointercancel', 1, 400, 300);
    pointer('pointermove', 1, 500, 300);
    expect(changed).not.toHaveBeenCalled();
    pointer('pointerdown', 2, 400, 300);
    input.resize({ width: 390, height: 650 });
    const resized = structuredClone(input.camera);
    pointer('pointermove', 2, 500, 300);
    expect(input.camera).toEqual(resized);
    expect(captured.size).toBe(0);
    input.destroy();
    const calls = changed.mock.calls.length;
    pointer('pointerdown', 4, 400, 300);
    pointer('pointermove', 4, 500, 300);
    expect(changed).toHaveBeenCalledTimes(calls);
  });
  it.each([0, 1, 2])('normaliza roda em modo %i, consome o evento e amplia no cursor', (deltaMode) => {
    const { canvas, input } = setup();
    const before = input.camera.zoom;
    const event = new WheelEvent('wheel', { clientX: 420, clientY: 400, deltaY: -1, deltaMode, cancelable: true });
    canvas.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(input.camera.zoom).toBeGreaterThan(before);
    expect(input.camera.center.x).toBeCloseTo(0);
    expect(input.camera.center.y).toBeCloseTo(0);
  });
});

it('arbitra peça/câmera, desfaz ao entrar segundo dedo e permite continuar o gesto', () => {
  const { canvas, input: oldInput, pointer } = setup();
  oldInput.destroy();
  const piece = { begin: vi.fn(() => true), move: vi.fn(), end: vi.fn(), rotate: vi.fn(() => false), nudge: vi.fn(() => false), select: vi.fn() };
  const controller = new CameraController(canvas, { width: 800, height: 600 }, vi.fn(), piece);
  input = controller;
  const camera = structuredClone(controller.camera);
  pointer('pointerdown', 1, 350, 300);
  pointer('pointermove', 1, 351, 300);
  expect(piece.move).not.toHaveBeenCalled();
  pointer('pointermove', 1, 370, 300);
  expect(piece.move).toHaveBeenCalledTimes(1);
  expect(controller.camera).toEqual(camera);
  pointer('pointerdown', 2, 450, 300);
  expect(piece.end).toHaveBeenLastCalledWith(false);
  pointer('pointermove', 2, 490, 300);
  expect(controller.camera.zoom).toBeGreaterThan(camera.zoom);
  pointer('pointerup', 2, 490, 300);
  const calls = piece.move.mock.calls.length;
  pointer('pointermove', 1, 380, 300);
  expect(piece.move).toHaveBeenCalledTimes(calls);
  pointer('pointerup', 1, 380, 300);
  pointer('pointerdown', 3, 350, 300);
  pointer('pointermove', 3, 390, 300);
  pointer('pointercancel', 3, 390, 300);
  expect(piece.end).toHaveBeenLastCalledWith(false);
  pointer('pointerdown', 4, 350, 300);
  pointer('pointerup', 4, 350, 300);
  expect(piece.end).toHaveBeenLastCalledWith(true, controller.camera.zoom);
});

it('preserva atalhos do navegador com modificadores', () => {
  const { canvas, input } = setup();
  const before = structuredClone(input.camera);
  for (const modifier of ['ctrlKey', 'metaKey', 'altKey']) {
    const event = new KeyboardEvent('keydown', { key: 'r', [modifier]: true, cancelable: true });
    canvas.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  }
  expect(input.camera).toEqual(before);
});
