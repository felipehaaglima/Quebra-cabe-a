'use client';
import { useState } from 'react';
import Image from 'next/image';
import type { GamePreferences } from '@/game/core/preferences';
import type { CameraAction } from '@/game/input/camera-controller';
import styles from './game.module.css';

type Props = {
  audioStatus: string; testAudio: () => void; ready: boolean; count: number; view: string; saveStatus: string; backupAvailable: boolean;
  progress: { connections: number; expected: number; groupCount: number; completed: boolean };
  selection: { id: string | null; quarterTurn: number; size: number };
  options: { id: string; name: string }[]; hidden: readonly string[]; guide: boolean; hint: string;
  balance: number; preferences: GamePreferences;
  act: (action: CameraAction) => void; bags: () => void; toggleGuide: () => void; select: (id: string | null) => void;
  rotate: () => void; snap: () => void; focus: () => void; align: () => void; backup: () => void;
  configure: (preferences: GamePreferences) => void; restart: () => void;
};
export function GameHud(p: Props) {
  const [tools, setTools] = useState(false), [reference, setReference] = useState(false), [confirmNew, setConfirmNew] = useState(false);
  const saveError = p.saveStatus.startsWith('Não foi');
  return <>
    {reference && <aside className={styles.reference} aria-label="Imagem de referência"><header><span>Lago sereno</span><button onClick={() => setReference(false)} aria-label="Fechar imagem">×</button></header><Image src="/puzzles/demo/lago-sereno-v1.svg" width={240} height={180} alt="Referência do puzzle: lago verde entre montanhas, com árvores, sol e um barco à vela." unoptimized /></aside>}
    <div className={styles.context} aria-label="Ações da seleção">
      {!p.selection.id && <span className={styles.idleHint}>Toque numa peça para montar</span>}
      {p.selection.id && <><output aria-label="Orientação da peça">{p.selection.quarterTurn * 90}°</output><button onClick={p.rotate}>{p.selection.size > 1 ? 'Girar grupo' : 'Girar peça'}</button><button onClick={p.snap}>Encaixar</button><button aria-label="Desmarcar peça" onClick={() => p.select(null)}>×</button></>}
    </div>
    <div className={styles.statusLine}>
      <span role="status" aria-label="Progresso do puzzle">{p.progress.completed ? 'Puzzle completo! Você pode alinhar a obra ao tapete.' : `${p.progress.connections} de ${p.progress.expected} encaixes · ${p.progress.groupCount} grupos`}</span>
      <output aria-label="Moedas locais" title="Moedas demonstrativas deste puzzle">◉ {p.balance}</output>
    </div>
    {saveError && <p className={styles.error} role="alert">{p.saveStatus} <button disabled={!p.backupAvailable} onClick={p.backup}>Baixar cópia</button></p>}
    <nav className={styles.dock} aria-label="Ferramentas do jogo">
      <button disabled={!p.ready} onClick={p.bags}>Bolsas</button>
      <button disabled={!p.ready} aria-pressed={p.guide} onClick={p.toggleGuide} aria-label="Guia no tapete">Guia</button>
      <button aria-expanded={reference} onClick={() => setReference(!reference)}>Ver imagem</button>
      <button aria-expanded={tools} aria-controls="ferramentas" onClick={() => setTools(!tools)}>Ferramentas</button>
    </nav>
    <section id="ferramentas" className={styles.tools} hidden={!tools} aria-label="Ferramentas e preferências">
      <div><h2>Visão</h2><output className={styles.view} aria-label="Visão da mesa">{p.view}</output>
        <div className={styles.controls}><button disabled={!p.ready} onClick={() => p.act('zoom-out')} aria-label="Diminuir zoom">−</button><button disabled={!p.ready} onClick={() => p.act('zoom-in')} aria-label="Ampliar zoom">+</button><button disabled={!p.ready} onClick={() => p.act('rotate')}>Girar 90°</button><button disabled={!p.ready} onClick={() => p.act('center')}>Centralizar</button></div>
        <h2>Encontrar peças</h2><select aria-label="Selecionar peça" disabled={!p.ready} value={p.selection.id ?? ''} onChange={(e) => p.select(e.target.value || null)}><option value="">Selecionar peça</option>{p.options.map((option) => <option disabled={p.hidden.includes(option.id)} key={option.id} value={option.id}>{option.name}</option>)}</select>
        <button disabled={!p.selection.id} onClick={p.focus}>Ver seleção</button>
        <button disabled={!p.progress.completed} onClick={p.align}>Alinhar obra</button>
      </div>
      <div><h2>Conforto</h2><label><input type="checkbox" checked={p.preferences.muted} onChange={(e) => p.configure({ ...p.preferences, muted: e.target.checked })} /> Silenciar sons</label>
        <label>Volume dos efeitos<input type="range" min="0" max="1" step="0.05" value={p.preferences.volume} onChange={(e) => p.configure({ ...p.preferences, volume: Number(e.target.value) })} /></label>
        <button disabled={!p.ready || p.preferences.muted || p.preferences.volume === 0} onClick={p.testAudio}>Testar som</button>
        <p role="status" aria-label="Estado do áudio">{p.audioStatus}</p>
        <label><input type="checkbox" checked={p.preferences.reducedMotion} onChange={(e) => p.configure({ ...p.preferences, reducedMotion: e.target.checked })} /> Reduzir movimento</label>
        <label>Qualidade da mesa<select value={p.preferences.quality} onChange={(e) => p.configure({ ...p.preferences, quality: e.target.value as GamePreferences['quality'] })}><option value="auto">Automática</option><option value="low">Econômica</option></select></label>
        <p>Sons e animações são opcionais. O sistema também pode reduzir o movimento.</p>
      </div>
      <div><details><summary>Ajuda e atalhos</summary><p id="mesa-ajuda">Arraste peças para montar e o fundo para navegar. Dois dedos ampliam e giram. R gira a seleção; setas movem (Shift ajusta fino), Enter encaixa, Escape desmarca e Home centraliza. Bolsas guardam peças soltas. No guia, tente um espaço reservado: amarelo indica apenas onde você está soltando. Se não encaixar, a peça volta à origem.</p></details>
        <p role="status" aria-label="Salvamento">{p.saveStatus}</p><p>Progresso salvo neste navegador. Limpar seus dados remove o save.</p>
        <button disabled={!p.backupAvailable} onClick={p.backup}>Baixar cópia</button>
        <button disabled={!p.ready || saveError} onClick={() => setConfirmNew(!confirmNew)}>Novo puzzle</button>
        {confirmNew && <div role="group" aria-label="Confirmar nova montagem"><p>Recomeçar este puzzle? As posições e bolsas serão reiniciadas. Suas moedas ficam; conexões já premiadas não pagam novamente.</p><button onClick={() => { p.restart(); setConfirmNew(false); }}>Recomeçar montagem</button><button onClick={() => setConfirmNew(false)}>Manter montagem</button></div>}
      </div>
    </section>
    <p className={styles.hint} role="status" aria-label="Ajuda do tapete">{p.hint}</p>
  </>;
}
