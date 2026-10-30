import { Container, Graphics, Text } from 'pixi.js';
import type { BagState } from '../core/puzzle/bags';

type BagView = { node: Container; label: Text; count: Text; glow: Graphics };
const views = new WeakMap<Container, Map<string, BagView>>();
export function createBagLayer(bags: readonly BagState[]): Container {
  const layer = new Container(); layer.label = 'bags'; layer.eventMode = 'none';
  views.set(layer, new Map()); updateBags(layer, bags, null); return layer;
}
export function updateBags(layer: Container, bags: readonly BagState[], active: string | null) {
  const nodes = views.get(layer)!;
  for (const bag of bags) {
    let view = nodes.get(bag.id);
    if (!view) {
      const node = new Container();
      const shape = new Graphics().roundRect(-68, -68, 136, 144, 18).fill(0xb98a5d).roundRect(-58, -75, 116, 24, 8).fill(0x946743).roundRect(-52, -20, 104, 48, 5).fill(0xf3e7ce);
      const label = new Text({ text: bag.label, style: { fontFamily: 'Georgia, serif', fontSize: 18, fill: 0x604935, wordWrap: true, wordWrapWidth: 96, align: 'center' } }); label.anchor.set(0.5); label.y = 3;
      const count = new Text({ text: '0 peças', style: { fontFamily: 'Arial', fontSize: 15, fill: 0x3d3226 } }); count.anchor.set(0.5); count.y = 50;
      const glow = new Graphics().roundRect(-76, -83, 152, 168, 20).stroke({ color: 0xc5f3a3, width: 6 });
      node.addChild(shape, label, count, glow); layer.addChild(node);
      view = { node, label, count, glow }; nodes.set(bag.id, view);
    }
    view.node.position.set(bag.center.x, bag.center.y); view.label.text = bag.label;
    view.label.scale.set(Math.min(1, 92 / Math.max(1, view.label.width / view.label.scale.x), 40 / Math.max(1, view.label.height / view.label.scale.y)));
    view.count.text = `${bag.pieceIds.length} peças`; view.glow.visible = bag.id === active;
  }
}
