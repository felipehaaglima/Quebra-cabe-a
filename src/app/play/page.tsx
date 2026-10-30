import type { Metadata } from 'next';
import { GameEntry } from '@/components/game/game-entry';
export const metadata: Metadata = { title: 'Mesa tranquila · Quebra-cabeça' };
export default async function PlayPage({ searchParams }: { searchParams: Promise<{ pieces?: string | string[] }> }) {
  const params = await searchParams;
  return <GameEntry count={params.pieces === '48' ? 48 : 24} />;
}
