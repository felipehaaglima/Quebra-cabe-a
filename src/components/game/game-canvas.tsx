'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { GameHud } from './game-hud';
import { defaultPreferences } from '@/game/core/preferences';
import { GameAudio } from '@/game/feedback/audio';
import { CameraController, type CameraAction } from '@/game/input/camera-controller';
import { fitZoom } from '@/game/core/camera/camera';
import styles from './game.module.css';
import { DEMO, DEMO48, generatePieces, distributePieces } from '@/game/core/puzzle/puzzle';
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
  const audioPlayer = useRef<GameAudio | null>(null);
  const [audioStatus, setAudioStatus] = useState('Toque em Testar som para ativar o áudio.');
  const effects = useRef<{ stop: () => void; align: () => void } | null>(null);
  const saveSession = useRef<LocalSaveSession | null>(null);
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [balance, setBalance] = useState(0);
  const [celebration, setCelebration] = useState('');
  const [liveModel, setLiveModel] = useState<PieceController | null>(null);
  const [backupAvailable, setBackupAvailable] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Carregando progresso…');
  const [bagView, setBagView] = useState<{ bags: readonly BagState[]; hidden: readonly string[]; open: boolean; activeId: string | null; notice: string }>({ bags: initialBags(), hidden: [], open: false, activeId: null, notice: '' });
  const [selection, setSelection] = useState<{ id: string | null; quarterTurn: number; size: number }>({ id: null, quarterTurn: 0, size: 0 });
  const [progress, setProgress] = useState({ connections: 0, expected: definition.rows * (definition.columns - 1) + definition.columns * (definition.rows - 1), groupCount: definition.rows * definition.columns, completed: false });
  const [guide, setGuide] = useState({ enabled: true, placing: false });
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
      const audio = new GameAudio(loaded?.model.preferences ?? defaultPreferences(), setAudioStatus);
      audioPlayer.current = audio;
      const media = window.matchMedia('(prefers-reduced-motion: reduce)');
      let glow: import('@/game/feedback/visual').PuzzleGlow | undefined;
      const unlock = () => { void audio.unlock(); };
      const silence = () => audio.stop();
      for (const event of ['pointerdown', 'pointerup', 'click', 'keydown']) window.addEventListener(event, unlock, { capture: true });
      window.addEventListener('blur', silence);
      const motionChange = () => { if (media.matches) glow?.clear(); };
      media.addEventListener('change', motionChange);
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
        audio.destroy(); if (audioPlayer.current === audio) audioPlayer.current = null; glow?.destroy(); effects.current = null;
        for (const event of ['pointerdown', 'pointerup', 'click', 'keydown']) window.removeEventListener(event, unlock, { capture: true }); window.removeEventListener('blur', silence); media.removeEventListener('change', motionChange);
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
        await app.init({ background: '#c3a17d', antialias: true, autoStart: false, preference: ['webgl'], resolution: loaded?.model.preferences.quality === 'low' ? 1 : Math.min(window.devicePixelRatio || 1, 2), autoDensity: true, width: element.clientWidth, height: element.clientHeight });
        if (cancelled) { release(); return; }
        texture = await loadDemoTexture();
        if (cancelled) { release(); return; }
        const pieces = generatePieces(definition);
        const initialPlacements = loaded ? loaded.model.state.groups.flatMap((group) => groupPlacements(group, definition)) : distributePieces(pieces, definition.seed);
        const world = createWorld(texture, pieces, initialPlacements, definition, app.renderer, loaded?.model.bags ?? initialBags());
        app.stage.addChild(world);
        const { PuzzleGlow } = await import('@/game/feedback/visual');
        if (cancelled) { release(); return; }
        glow = new PuzzleGlow(app, world);
        const canvas = app.canvas;
        canvas.tabIndex = 0;
        canvas.dataset.pieceCount = String(world.getChildByLabel('pieces')!.children.length);
        canvas.setAttribute('aria-label', `Mesa com ${count} peças do Lago sereno. Use as setas para mover a visão, mais e menos para zoom, R para girar a peça selecionada (ou a mesa se nenhuma estiver selecionada), Escape para desmarcar e Home para centralizar.`);
        canvas.setAttribute('aria-describedby', 'mesa-ajuda');
        element.appendChild(canvas);
        let viewport = { width: element.clientWidth, height: element.clientHeight };
        const pieceInput: PieceController = new PieceController(pieces, initialPlacements, definition, (placements, selectedId, info) => {
          setPreferences((previous) => previous.muted === info.preferences.muted && previous.volume === info.preferences.volume && previous.reducedMotion === info.preferences.reducedMotion && previous.quality === info.preferences.quality ? previous : { ...info.preferences });
          setBalance(info.balance); audio.configure(info.preferences);
          const resolution = info.preferences.quality === 'low' ? 1 : Math.min(window.devicePixelRatio || 1, 2);
          if (app.renderer.resolution !== resolution) app.renderer.resize(viewport.width, viewport.height, resolution);
          if (info.preferences.reducedMotion || info.preferences.quality === 'low') glow?.clear();
          updatePieces(world, placements, selectedId, info.selectedMembers, info.hiddenIds);
          updateBags(world.getChildByLabel('bags')!, info.bags, info.dropBagId);
          canvas.dataset.visiblePieces = String(placements.length - info.hiddenIds.length);
          setBagView((previous) => previous.bags === info.bags && previous.open === info.bagPanelOpen && previous.activeId === info.openBagId && previous.notice === info.notice ? previous : { bags: info.bags, hidden: info.hiddenIds, open: info.bagPanelOpen, activeId: info.openBagId, notice: info.notice });
          updateMatGuide(world, definition, info.guideEnabled, info.guideHover);
          setGuide((previous) => previous.enabled === info.guideEnabled && previous.placing === (info.guideHover.length > 0) ? previous : { enabled: info.guideEnabled, placing: info.guideHover.length > 0 });
          app.render();
          const quarterTurn = placements.find((item) => item.pieceId === selectedId)?.quarterTurn ?? 0;
          setSelection((previous) => previous.id === selectedId && previous.quarterTurn === quarterTurn && previous.size === info.selectedMembers.length ? previous : { id: selectedId, quarterTurn, size: info.selectedMembers.length });
          setProgress((previous) => previous.connections === info.connections && previous.groupCount === info.groupCount && previous.completed === info.completed ? previous : { connections: info.connections, expected: info.expected, groupCount: info.groupCount, completed: info.completed });
          if (saving && input && !info.transient) persistence.schedule({ model: pieceInput.exportModel(), camera: input.viewSnapshot() }, true);
        }, (event, earned = 0) => {
          audio.play(event);
          if (earned && event !== 'complete') audio.play('coin');
          if (event === 'complete') setCelebration(`Obra concluída! ${earned ? `+${earned} moedas nesta jogada.` : 'Esta obra já recebeu suas recompensas.'}`);
          if ((event === 'snap' || event === 'complete') && !media.matches && !pieceInput.preferences.reducedMotion && pieceInput.preferences.quality !== 'low') {
            const pose = pieceInput.placements.find((item) => item.pieceId === pieceInput.selectedId);
            if (pose) glow?.show(event === 'complete' ? pieceInput.state.groups[0].translation : pose.center, event === 'complete');
          }
        });
        if (loaded) pieceInput.restore(loaded.model);
        effects.current = { stop: () => glow?.clear(), align: () => { if (!media.matches && !pieceInput.preferences.reducedMotion && pieceInput.preferences.quality !== 'low') glow?.show({ x: 0, y: 0 }, true); } };
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

  const hint = bagView.notice || (!guide.enabled ? '' : guide.placing ? 'Solte para tentar neste espaço.' : 'Arraste sobre um espaço reservado e solte para tentar.');
  return <main className={styles.game}>
    <header className={styles.header}><Link href="/" className={styles.back}>← Início</Link><div><h1>Mesa tranquila</h1><p>Lago sereno · {count} peças</p></div><span className={styles.saveDot} title={saveStatus} aria-label={saveStatus.startsWith('Não foi') ? 'Falha no progresso' : 'Progresso automático'}>●</span></header>
    <div className={styles.stage} ref={host} data-testid="mesa">
      {!ready && <div className={styles.loading}><p role={failed ? 'alert' : 'status'}>{status}</p>{failed && <button onClick={() => { setFailed(false); setStatus('Preparando sua mesa…'); setAttempt((value) => value + 1); }}>Tentar novamente</button>}</div>}
      {celebration && <aside className={styles.celebration} aria-label="Conclusão"><p role="status">{celebration}</p><button onClick={() => { pieceController.current?.alignCompleted(); controller.current?.act('center'); effects.current?.align(); }}>Alinhar no tapete</button><button onClick={() => { effects.current?.stop(); setCelebration(''); }}>Continuar olhando</button></aside>}
    </div>
    <GameHud audioStatus={audioStatus} testAudio={() => { void audioPlayer.current?.preview(); }} ready={ready} count={count} view={view} saveStatus={saveStatus} backupAvailable={backupAvailable} progress={progress} selection={selection} options={pieceOptions} hidden={bagView.hidden} guide={guide.enabled} hint={hint} balance={balance} preferences={preferences}
      act={act} bags={() => pieceController.current?.openBags()} toggleGuide={() => pieceController.current?.setGuideEnabled(!guide.enabled)} select={(id) => pieceController.current?.select(id)} rotate={() => pieceController.current?.rotate()} snap={() => pieceController.current?.snap(controller.current?.camera.zoom ?? 1)}
      focus={() => { const pose = pieceController.current?.placements.find((item) => item.pieceId === selection.id); if (pose) controller.current?.focus(pose.center); }} align={() => { pieceController.current?.alignCompleted(); effects.current?.align(); }} backup={() => saveSession.current?.downloadBackup()} configure={(value) => pieceController.current?.setPreferences(value)} restart={() => { effects.current?.stop(); pieceController.current?.newPuzzle(); controller.current?.act('center'); setCelebration(''); }} />
    {liveModel && <BagPanel model={liveModel} bags={bagView.bags} open={bagView.open} activeId={bagView.activeId} definition={definition} locate={(bag) => { pieceController.current?.closeBags(); controller.current?.focus(bag.center); }} />}
    <p className="sr-only" role="status">{ready ? status : ''}</p>
  </main>;
}
