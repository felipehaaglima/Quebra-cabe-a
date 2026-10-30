'use client';
import { useEffect, useRef } from 'react';
import type { PieceController } from '@/game/input/piece-controller';
import type { BagState } from '@/game/core/puzzle/bags';
import type { PuzzleDefinition } from '@/game/core/puzzle/puzzle';
import styles from './game.module.css';

type Props = { model: PieceController; bags: readonly BagState[]; open: boolean; activeId: string | null; definition: PuzzleDefinition; locate: (bag: BagState) => void };
export function BagPanel({ model, bags, open, activeId, definition, locate }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const node = dialog.current; if (open && node && !node.open) node.showModal(); return () => { if (node?.open) node.close(); }; }, [open]);
  if (!open) return null;
  const active = bags.find((bag) => bag.id === activeId) ?? bags[0];
  const hidden = new Set(bags.flatMap((bag) => bag.pieceIds));
  const title = (id: string) => { const [r, c] = id.split(':').map(Number); return `Peça ${r * definition.columns + c + 1}`; };
  const selected = model.state.groups.find((group) => group.pieceIds.includes(model.selectedId ?? ''));
  return <dialog className={styles.bagDialog} ref={dialog} onCancel={(event) => { event.preventDefault(); model.closeBags(); }} aria-labelledby="bolsas-titulo">
    <header><h2 id="bolsas-titulo">Bolsas</h2><button onClick={() => model.closeBags()}>Fechar bolsas</button></header>
    <form onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; model.createBag(String(new FormData(form).get('name') ?? '')); form.reset(); }}>
      <label>Nova bolsa<input name="name" maxLength={40} required placeholder="Ex.: céu" /></label><button type="submit">Criar bolsa</button>
    </form>
    <p role="status">{model.notice}</p>
    <nav aria-label="Lista de bolsas">{bags.map((bag) => <button key={bag.id} aria-pressed={active?.id === bag.id} onClick={() => model.openBags(bag.id)}>{bag.label} ({bag.pieceIds.length})</button>)}</nav>
    {active && <section aria-label={`Conteúdo de ${active.label}`}>
      <form key={active.id} onSubmit={(event) => { event.preventDefault(); model.renameBag(active.id, String(new FormData(event.currentTarget).get('label') ?? '')); }}>
        <label>Etiqueta<input name="label" maxLength={40} required defaultValue={active.label} /></label><button type="submit">Renomear bolsa</button>
      </form>
      <div className={styles.bagActions} aria-label="Mover bolsa">
        <button aria-label="Mover bolsa à esquerda" onClick={() => model.moveBag(active.id, { x: -80, y: 0 })}>←</button>
        <button aria-label="Mover bolsa acima" onClick={() => model.moveBag(active.id, { x: 0, y: -80 })}>↑</button>
        <button aria-label="Mover bolsa abaixo" onClick={() => model.moveBag(active.id, { x: 0, y: 80 })}>↓</button>
        <button aria-label="Mover bolsa à direita" onClick={() => model.moveBag(active.id, { x: 80, y: 0 })}>→</button>
        <button onClick={() => locate(active)}>Ver bolsa na mesa</button>
      </div>
      <label>Peça para guardar<select value={model.selectedId ?? ''} onChange={(event) => model.select(event.target.value || null)}>
        <option value="">Selecionar peça</option>
        {model.placements.filter((pose) => !hidden.has(pose.pieceId)).map((pose) => <option key={pose.pieceId} value={pose.pieceId}>{title(pose.pieceId)}</option>)}
      </select></label>
      <button disabled={!model.selectedId || selected?.pieceIds.length !== 1} onClick={() => model.storeSelected(active.id)}>Guardar seleção</button>
      <p>Somente peças soltas podem ser guardadas; grupos continuam na mesa.</p>
      <p>{active.pieceIds.length} peças nesta bolsa.</p>
      <div className={styles.bagContents}>{active.pieceIds.map((id) => {
        const [row, column] = id.split(':').map(Number);
        return <button key={id} onClick={() => model.takePiece(active.id, id)}><span aria-hidden="true" className={styles.bagThumb} style={{ backgroundImage: 'url(/puzzles/demo/lago-sereno-v1.svg)', backgroundSize: `${definition.columns * 100}% ${definition.rows * 100}%`, backgroundPosition: `${column / Math.max(1, definition.columns - 1) * 100}% ${row / Math.max(1, definition.rows - 1) * 100}%` }} />Retirar {title(id)}</button>;
      })}</div>
    </section>}
  </dialog>;
}
