'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CameraController, type CameraAction } from '@/game/input/camera-controller';
import { fitZoom } from '@/game/core/camera/camera';
import styles from './game.module.css';
import { DEMO, DEMO48, generatePieces, distributePieces } from '@/game/core/puzzle/puzzle';
import type { MatGuideHint } from '@/game/core/puzzle/mat-guide';
import { BagPanel } from './bag-panel';
import { LocalSaveSession } from '@/game/persistence/local-save';
import { initialBags, type BagState } from '@/game/core/puzzle/bags';
import { groupPlacements } from '@/game/core/puzzle/groups';
import { PieceController } from '@/game/input/piece-controller';
export default function GameCanvas({ count = 24 }: { count?: 24 | 48 }) {
  const definition = count === 48 ? DEMO48 : DEMO;
  const pieceOptions = useMemo(() => Array.from({ length: count }, (_, i) => ({ id: `${Math.floor(i / definition.columns)}:${i % definition.columns}`, name: `Peça ${i + 1}` })), [count, definition]);
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<CameraController | null>(null);
  const pieceController = useRef<PieceController | null>(null);
  const saveSession = useRef<LocalSaveSession | null>(null);
  const [liveModel, setLiveModel] = useState<PieceController | null>(null);
  const [backupAvailable, setBackupAvailable] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Carregando progresso…');
  const [bagView, setBagView] = useState<{ bags: readonly BagState[]; hidden: readonly string[]; open: boolean; activeId: string | null; notice: string }>({ bags: initialBags(), hidden: [], open: false, activeId: null, notice: '' });
  const [selection, setSelection] = useState<{ id: string | null; quarterTurn: number; size: number }>({ id: null, quarterTurn: 0, size: 0 });
  const [progress, setProgress] = useState({ connections: 0, expected: definition.rows * (definition.columns - 1) + definition.columns * (definition.rows - 1), groupCount: definition.rows * definition.columns, completed: false });
  const [guide, setGuide] = useState<{ enabled: boolean; hint: MatGuideHint }>({ enabled: false, hint: 'none' });
  const [status, setStatus] = useState('Preparando sua mesa…');
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [view, setView] = useState('100% · 0°');

  useEffect(() => {
    const element = host.current!;
    let cancelled = false;
    let dispose: (() => void) | undefined;
    async function init() {
      // Pixi is evaluated only in the browser, never in a Server Component.
      const [{ Application }, { createWorld, drawScene, loadDemoTexture, updatePieces, updateMatGuide, updateBags }] = await Promise.all([import('pixi.js'), import('@/game/renderer-pixi/scene')]);
      if (cancelled) return;
      const persistence: LocalSaveSession = new LocalSaveSession(definition, (message) => { setSaveStatus(message); setBackupAvailable(persistence.hasBackup); });
      saveSession.current = persistence;
      const loaded = await persistence.load();
      if (cancelled) { await persistence.close(); return; }
      const app = new Application();
      let saving = false;
      let flushOnHide: (() => void) | undefined;
      let texture: import('pixi.js').Texture | undefined;
      let input: CameraController | undefined;
      let observer: ResizeObserver | undefined;
      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        saving = false;
        observer?.disconnect(); input?.destroy(); pieceController.current = null;
        if (flushOnHide) { window.removeEventListener('pagehide', flushOnHide); document.removeEventListener('visibilitychange', flushOnHide); }
        void persistence.close();
        if (saveSession.current === persistence) saveSession.current = null;
        if (controller.current === input) controller.current = null;
        // Initialization can fail before a renderer exists.
        try { app.destroy(true, { children: true }); } catch { /* partial initialization */ }
        texture?.destroy(true);
      };
      try {
        await app.init({ background: '#c3a17d', antialias: true, autoStart: false, preference: ['webgl'], resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true, width: element.clientWidth, height: element.clientHeight });
        if (cancelled) { release(); return; }
        texture = await loadDemoTexture();
        if (cancelled) { release(); return; }
        const pieces = generatePieces(definition);
        const initialPlacements = loaded ? loaded.model.state.groups.flatMap((group) => groupPlacements(group, definition)) : distributePieces(pieces, definition.seed);
        const world = createWorld(texture, pieces, initialPlacements, definition, app.renderer, loaded?.model.bags ?? initialBags());
        app.stage.addChild(world);
        const canvas = app.canvas;
        canvas.tabIndex = 0;
        canvas.dataset.pieceCount = String(world.getChildByLabel('pieces')!.children.length);
        canvas.setAttribute('aria-label', `Mesa com ${count} peças do Lago sereno. Use as setas para mover a visão, mais e menos para zoom, R para girar a peça selecionada (ou a mesa se nenhuma estiver selecionada), Escape para desmarcar e Home para centralizar.`);
        canvas.setAttribute('aria-describedby', 'mesa-ajuda');
        element.appendChild(canvas);
        let viewport = { width: element.clientWidth, height: element.clientHeight };
        const pieceInput: PieceController = new PieceController(pieces, initialPlacements, definition, (placements, selectedId, info) => {
          updatePieces(world, placements, selectedId, info.selectedMembers, info.hiddenIds);
          updateBags(world.getChildByLabel('bags')!, info.bags, info.dropBagId);
          canvas.dataset.visiblePieces = String(placements.length - info.hiddenIds.length);
          setBagView((previous) => previous.bags === info.bags && previous.open === info.bagPanelOpen && previous.activeId === info.openBagId && previous.notice === info.notice ? previous : { bags: info.bags, hidden: info.hiddenIds, open: info.bagPanelOpen, activeId: info.openBagId, notice: info.notice });
          updateMatGuide(world, pieces, definition, info.guideEnabled, info.selectedMembers, info.guideHint);
          setGuide((previous) => previous.enabled === info.guideEnabled && previous.hint === info.guideHint ? previous : { enabled: info.guideEnabled, hint: info.guideHint });
          app.render();
          const quarterTurn = placements.find((item) => item.pieceId === selectedId)?.quarterTurn ?? 0;
          setSelection((previous) => previous.id === selectedId && previous.quarterTurn === quarterTurn && previous.size === info.selectedMembers.length ? previous : { id: selectedId, quarterTurn, size: info.selectedMembers.length });
          setProgress((previous) => previous.connections === info.connections && previous.groupCount === info.groupCount && previous.completed === info.completed ? previous : { connections: info.connections, expected: info.expected, groupCount: info.groupCount, completed: info.completed });
          if (saving && input && !info.transient) persistence.schedule({ model: pieceInput.exportModel(), camera: input.viewSnapshot() }, true);
        });
        if (loaded) pieceInput.restore(loaded.model);
        pieceController.current = pieceInput; setLiveModel(pieceInput);
        input = new CameraController(canvas, viewport, (camera) => {
          pieceInput.setViewZoom(camera.zoom);
          if (saving && input) persistence.schedule({ model: pieceInput.exportModel(), camera: input.viewSnapshot() });
          drawScene(app, world, camera, viewport);
          setView(`${Math.round(camera.zoom / fitZoom(viewport) * 100)}% · ${Math.round(camera.angleRad * 180 / Math.PI)}°`);
        }, pieceInput);
        pieceInput.setViewZoom(input.camera.zoom);
        const activeInput = input;
        controller.current = input;
        if (loaded) input.restoreView(loaded.camera);
        pieceInput.refresh();
        saving = true;
        persistence.schedule({ model: pieceInput.exportModel(), camera: input.viewSnapshot() }, true);
        flushOnHide = () => { if (input) { persistence.schedule({ model: pieceInput.exportModel(), camera: input.viewSnapshot() }); void persistence.flush(); } };
        window.addEventListener('pagehide', flushOnHide);
        document.addEventListener('visibilitychange', flushOnHide);
        observer = new ResizeObserver(() => {
          viewport = { width: element.clientWidth, height: element.clientHeight };
          if (!viewport.width || !viewport.height) return;
          app.renderer.resize(viewport.width, viewport.height);
          activeInput.resize(viewport);
        });
        observer.observe(element);
        drawScene(app, world, input.camera, viewport);
        dispose = release;
        setReady(true); setStatus(`${count} peças prontas. Aproxime vizinhas na mesma orientação e solte para encaixar.`);
      } catch (error) {
        release();
        throw error;
      }
    }
    init().catch((error) => {
      console.error('Falha ao inicializar a mesa:', error);
      if (!cancelled) { setFailed(true); setStatus('Não foi possível abrir a mesa. Verifique a conexão e a aceleração gráfica do navegador e tente novamente.'); }
    });
    return () => { cancelled = true; dispose?.(); };
  }, [attempt, count, definition]);

  function act(action: CameraAction) { controller.current?.act(action); }

  return (
    <main className={styles.game}>
      <header className={styles.header}>
        <Link href="/" className={styles.back}>← Início</Link>
        <div><h1>Mesa tranquila</h1><p>Lago sereno · {count} peças</p></div>
        <output className={styles.view} aria-label="Visão da mesa">{view}</output>
      </header>
      <div className={styles.stage} ref={host} data-testid="mesa">
        <button className={styles.bagsToggle} disabled={!ready} onClick={() => pieceController.current?.openBags()}>Bolsas</button>
        <button className={styles.guideToggle} disabled={!ready} aria-pressed={guide.enabled} onClick={() => pieceController.current?.setGuideEnabled(!guide.enabled)}>Guia no tapete</button>
        {!ready && <div className={styles.loading}><p role={failed ? 'alert' : 'status'}>{status}</p>{failed && <button onClick={() => { setFailed(false); setStatus('Preparando sua mesa…'); setAttempt((value) => value + 1); }}>Tentar novamente</button>}</div>}
      </div>
      <details className={styles.reference}>
        <summary>Ver imagem</summary>
        <figure><Image src="/puzzles/demo/lago-sereno-v1.svg" width={240} height={180} alt="Referência do puzzle: lago verde entre montanhas, com árvores, sol e um barco à vela." unoptimized /><figcaption>Lago sereno · {count} peças</figcaption></figure>
      </details>
      <div className={styles.bottom}>
        <p id="mesa-ajuda">Arraste uma peça para movê-la; arraste o fundo para navegar. Dois dedos ampliam e giram a mesa. Solte vizinhas alinhadas para encaixar. R gira a seleção; setas movem (Shift ajusta fino), Enter tenta encaixar e Escape desmarca. Toque numa bolsa para abrir; arraste peças soltas para guardar.</p>
        <div className={styles.saveStatus}><span role="status" aria-label="Salvamento">{saveStatus}</span><button disabled={!backupAvailable} onClick={() => saveSession.current?.downloadBackup()}>Baixar cópia</button></div>
        <p className={styles.guideHint} role="status" aria-label="Ajuda do tapete">{bagView.notice || (!guide.enabled ? 'Guia desligado: ative para ver a referência no tapete.' : {
          none: 'Guia ligado: selecione uma peça ou grupo.',
          'wrong-orientation': 'Gire a seleção para 0° para ajustar ao tapete.',
          far: 'Siga os contornos no tapete e aproxime a seleção.',
          near: 'Perto do lugar certo. Solte ou use Encaixar.',
          aligned: 'Seleção alinhada. Você pode movê-la livremente.',
        }[guide.hint])}</p>
        <p className={styles.progress} role="status" aria-label="Progresso do puzzle">{progress.completed ? 'Puzzle completo! Você pode alinhar a obra ao tapete.' : `${progress.connections} de ${progress.expected} encaixes · ${progress.groupCount} grupos`}</p>
        <div className={styles.selection}>
          <select aria-label="Selecionar peça" disabled={!ready} value={selection.id ?? ''} onChange={(event) => pieceController.current?.select(event.target.value || null)}>
            <option value="">Selecionar peça</option>
            {pieceOptions.map((item) => <option disabled={bagView.hidden.includes(item.id)} key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <button disabled={!ready || !selection.id} onClick={() => pieceController.current?.rotate()}>{selection.size > 1 ? 'Girar grupo' : 'Girar peça'}</button>
          <output aria-label="Orientação da peça">{selection.id ? `${selection.quarterTurn * 90}°` : '—'}</output>
        </div>
        <nav className={styles.controls} aria-label="Controles da mesa">
          <button disabled={!ready} onClick={() => act('zoom-out')} aria-label="Diminuir zoom">−</button>
          <button disabled={!ready} onClick={() => act('zoom-in')} aria-label="Ampliar zoom">+</button>
          <button disabled={!ready} onClick={() => act('rotate')}>Girar 90°</button>
          <button disabled={!ready} onClick={() => act('center')}>Centralizar</button>
          <button disabled={!ready || !selection.id} onClick={() => pieceController.current?.snap(controller.current?.camera.zoom ?? 1)}>Encaixar</button>
          <button disabled={!ready || !selection.id} onClick={() => {
            const pose = pieceController.current?.placements.find((item) => item.pieceId === selection.id);
            if (pose) controller.current?.focus(pose.center);
          }}>Ver seleção</button>
          <button disabled={!progress.completed} onClick={() => pieceController.current?.alignCompleted()}>Alinhar obra</button>
        </nav>
      </div>
      {liveModel && <BagPanel model={liveModel} bags={bagView.bags} open={bagView.open} activeId={bagView.activeId} definition={definition} locate={(bag) => { pieceController.current?.closeBags(); controller.current?.focus(bag.center); }} />}
      <p className="sr-only" role="status">{ready ? status : ''}</p>
    </main>
  );
}
