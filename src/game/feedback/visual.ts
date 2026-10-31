import { Graphics, type Application, type Container } from 'pixi.js';
import type { Vec2 } from '../core/camera/camera';
// Short, bounded animation; never runs the renderer's continuous ticker.
export class PuzzleGlow {
  private node: Graphics | null = null;
  private frame = 0;
  constructor(private app: Application, private world: Container) {}
  show(center: Vec2, completion: boolean) {
    this.clear();
    const node = new Graphics(); this.node = node; node.eventMode = 'none'; node.position.set(center.x, center.y); this.world.addChild(node);
    const start = performance.now(), duration = completion ? 900 : 380;
    const draw = (now: number) => {
      const t = Math.min(1, (now - start) / duration); node.clear();
      const radius = (completion ? 230 : 55) + t * 35;
      node.circle(0, 0, radius).stroke({ color: 0xffdfa0, alpha: (1 - t) * 0.8, width: completion ? 5 : 3 });
      for (let i = 0; i < 8; i++) { const angle = i * Math.PI / 4; node.circle(Math.cos(angle) * radius, Math.sin(angle) * radius, 3 * (1 - t)).fill({ color: 0xffdfa0, alpha: 1 - t }); }
      this.app.render();
      if (t < 1) this.frame = requestAnimationFrame(draw); else this.clear();
    };
    this.frame = requestAnimationFrame(draw);
  }
  clear() { cancelAnimationFrame(this.frame); const hadNode = this.node !== null; this.node?.destroy(); this.node = null; if (hadNode && this.app.renderer) this.app.render(); }
  destroy() { cancelAnimationFrame(this.frame); this.node?.destroy(); this.node = null; }
}
