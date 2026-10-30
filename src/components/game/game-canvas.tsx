'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CameraController, type CameraAction } from '@/game/input/camera-controller';
import { fitZoom } from '@/game/core/camera/camera';
import styles from './game.module.css';
import { DEMO, generatePieces, distributePieces } from '@/game/core/puzzle/puzzle';
import { PieceController } from '@/game/input/piece-controller';
const PIECE_OPTIONS = Array.from({ length: DEMO.rows * DEMO.columns }, (_, i) => ({ id: `${Math.floor(i / DEMO.columns)}:${i % DEMO.columns}`, name: `Peça ${i + 1}` }));

export default function GameCanvas() {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<CameraController | null>(null);
  const pieceController = useRef<PieceController | null>(null);
  const [selection, setSelection] = useState<{ id: string | null; quarterTurn: number }>({ id: null, quarterTurn: 0 });
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
      const [{ Application }, { createWorld, drawScene, loadDemoTexture, updatePieces }] = await Promise.all([import('pixi.js'), import('@/game/renderer-pixi/scene')]);
      if (cancelled) return;
      const app = new Application();
      let texture: import('pixi.js').Texture | undefined;
      let input: CameraController | undefined;
      let observer: ResizeObserver | undefined;
      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        observer?.disconnect(); input?.destroy(); pieceController.current = null;
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
        const pieces = generatePieces(DEMO);
        const initialPlacements = distributePieces(pieces, DEMO.seed);
        const world = createWorld(texture, pieces, initialPlacements);
        app.stage.addChild(world);
        const canvas = app.canvas;
        canvas.tabIndex = 0;
        canvas.dataset.pieceCount = String(world.getChildByLabel('pieces')!.children.length);
        canvas.setAttribute('aria-label', 'Mesa com 24 peças do Lago sereno. Use as setas para mover a visão, mais e menos para zoom, R para girar a peça selecionada (ou a mesa se nenhuma estiver selecionada), Escape para desmarcar e Home para centralizar.');
        canvas.setAttribute('aria-describedby', 'mesa-ajuda');
        element.appendChild(canvas);
        let viewport = { width: element.clientWidth, height: element.clientHeight };
        const pieceInput = new PieceController(pieces, initialPlacements, DEMO, (placements, selectedId) => {
          updatePieces(world, placements, selectedId);
          app.render();
          setSelection({ id: selectedId, quarterTurn: placements.find((item) => item.pieceId === selectedId)?.quarterTurn ?? 0 });
        });
        pieceController.current = pieceInput;
        input = new CameraController(canvas, viewport, (camera) => {
          drawScene(app, world, camera, viewport);
          setView(`${Math.round(camera.zoom / fitZoom(viewport) * 100)}% · ${Math.round(camera.angleRad * 180 / Math.PI)}°`);
        }, pieceInput);
        const activeInput = input;
        controller.current = input;
        observer = new ResizeObserver(() => {
          viewport = { width: element.clientWidth, height: element.clientHeight };
          if (!viewport.width || !viewport.height) return;
          app.renderer.resize(viewport.width, viewport.height);
          activeInput.resize(viewport);
        });
        observer.observe(element);
        drawScene(app, world, input.camera, viewport);
        dispose = release;
        setReady(true); setStatus('24 peças prontas para mover e girar. Os encaixes chegam na próxima etapa.');
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
  }, [attempt]);

  function act(action: CameraAction) { controller.current?.act(action); }

  return (
    <main className={styles.game}>
      <header className={styles.header}>
        <Link href="/" className={styles.back}>← Início</Link>
        <div><h1>Mesa tranquila</h1><p>Lago sereno · 24 peças</p></div>
        <output className={styles.view} aria-label="Visão da mesa">{view}</output>
      </header>
      <div className={styles.stage} ref={host} data-testid="mesa">
        {!ready && <div className={styles.loading}><p role={failed ? 'alert' : 'status'}>{status}</p>{failed && <button onClick={() => { setFailed(false); setStatus('Preparando sua mesa…'); setAttempt((value) => value + 1); }}>Tentar novamente</button>}</div>}
      </div>
      <details className={styles.reference}>
        <summary>Ver imagem</summary>
        <figure><Image src="/puzzles/demo/lago-sereno-v1.svg" width={240} height={180} alt="Referência do puzzle: lago verde entre montanhas, com árvores, sol e um barco à vela." unoptimized /><figcaption>Lago sereno · 24 peças</figcaption></figure>
      </details>
      <div className={styles.bottom}>
        <p id="mesa-ajuda">Arraste uma peça para movê-la; arraste o fundo para navegar. Dois dedos ampliam e giram a mesa. Use Girar peça ou R; as setas movem a seleção e Escape desmarca. Encaixes e salvamento vêm depois.</p>
        <div className={styles.selection}>
          <select aria-label="Selecionar peça" disabled={!ready} value={selection.id ?? ''} onChange={(event) => pieceController.current?.select(event.target.value || null)}>
            <option value="">Selecionar peça</option>
            {PIECE_OPTIONS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <button disabled={!ready || !selection.id} onClick={() => pieceController.current?.rotate()}>Girar peça</button>
          <output aria-label="Orientação da peça">{selection.id ? `${selection.quarterTurn * 90}°` : '—'}</output>
        </div>
        <nav className={styles.controls} aria-label="Controles da mesa">
          <button disabled={!ready} onClick={() => act('zoom-out')} aria-label="Diminuir zoom">−</button>
          <button disabled={!ready} onClick={() => act('zoom-in')} aria-label="Ampliar zoom">+</button>
          <button disabled={!ready} onClick={() => act('rotate')}>Girar 90°</button>
          <button disabled={!ready} onClick={() => act('center')}>Centralizar</button>
        </nav>
      </div>
      <p className="sr-only" role="status">{ready ? status : ''}</p>
    </main>
  );
}
