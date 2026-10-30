import type { Metadata } from 'next';
import { GameEntry } from '@/components/game/game-entry';
export const metadata: Metadata = { title: 'Mesa tranquila · Quebra-cabeça' };
export default function PlayPage() { return <GameEntry />; }
