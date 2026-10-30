'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CameraController, type CameraAction } from '@/game/input/camera-controller';
import { fitZoom } from '@/game/core/camera/camera';
import styles from './game.module.css';

export default function GameCanvas() {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<CameraController | null>(null);
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
      const [{ Application }, { createWorld, drawScene }] = await Promise.all([import('pixi.js'), import('@/game/renderer-pixi/scene')]);
      if (cancelled) return;
      const app = new Application();
      try {
        await app.init({ background: '#c3a17d', antialias: true, autoStart: false, preference: ['webgl'], resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true, width: element.clientWidth, height: element.clientHeight });
      } catch (error) {
        // A failed renderer can be partially initialized; release what exists.
        try { app.destroy(true, { children: true }); } catch { /* initialization never completed */ }
        throw error;
      }
      if (cancelled) { app.destroy(true, { children: true }); return; }
      const world = createWorld();
      app.stage.addChild(world);
      const canvas = app.canvas;
      canvas.tabIndex = 0;
      canvas.setAttribute('aria-label', 'Mesa de montagem. Use as setas para mover, mais e menos para zoom, R para girar e Home para centralizar.');
      canvas.setAttribute('aria-describedby', 'mesa-ajuda');
      element.appendChild(canvas);
      let viewport = { width: element.clientWidth, height: element.clientHeight };
      const input = new CameraController(canvas, viewport, (camera) => {
        drawScene(app, world, camera, viewport);
        setView(`${Math.round(camera.zoom / fitZoom(viewport) * 100)}% · ${Math.round(camera.angleRad * 180 / Math.PI)}°`);
      });
      controller.current = input;
      const observer = new ResizeObserver(() => {
        viewport = { width: element.clientWidth, height: element.clientHeight };
        if (!viewport.width || !viewport.height) return;
        app.renderer.resize(viewport.width, viewport.height);
        input.resize(viewport);
      });
      observer.observe(element);
      drawScene(app, world, input.camera, viewport);
      dispose = () => {
        observer.disconnect(); input.destroy(); controller.current = null;
        app.destroy(true, { children: true });
      };
      setReady(true); setStatus('Mesa pronta para explorar.');
    }
    init().catch(() => {
      if (!cancelled) { setFailed(true); setStatus('Não foi possível abrir a mesa. Verifique se a aceleração gráfica está disponível no navegador e tente novamente.'); }
    });
    return () => { cancelled = true; dispose?.(); };
  }, [attempt]);

  function act(action: CameraAction) { controller.current?.act(action); }

  return (
    <main className={styles.game}>
      <header className={styles.header}>
        <Link href="/" className={styles.back}>← Início</Link>
        <div><h1>Mesa tranquila</h1><p>Explore a mesa · peças em breve</p></div>
        <output className={styles.view} aria-label="Visão da mesa">{view}</output>
      </header>
      <div className={styles.stage} ref={host} data-testid="mesa">
        {!ready && <div className={styles.loading}><p role={failed ? 'alert' : 'status'}>{status}</p>{failed && <button onClick={() => { setFailed(false); setStatus('Preparando sua mesa…'); setAttempt((value) => value + 1); }}>Tentar novamente</button>}</div>}
      </div>
      <div className={styles.bottom}>
        <p id="mesa-ajuda">Arraste a mesa para explorar. Use os controles para ampliar, girar e voltar ao tapete. As sacolas são decorativas nesta versão.</p>
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
