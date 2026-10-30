'use client';
import dynamic from 'next/dynamic';
const GameCanvas = dynamic(() => import('./game-canvas'), { ssr: false, loading: () => <p role="status">Preparando sua mesa…</p> });
export function GameEntry({ count = 24 }: { count?: 24 | 48 }) { return <GameCanvas key={count} count={count} />; }
