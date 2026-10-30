'use client';
import dynamic from 'next/dynamic';
const GameCanvas = dynamic(() => import('./game-canvas'), { ssr: false, loading: () => <p role="status">Preparando sua mesa…</p> });
export function GameEntry() { return <GameCanvas />; }
