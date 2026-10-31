'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { listArchives, listLocalCopies, localRevision, restoreArchive, restoreCloudCopy } from '@/game/cloud/local-copies';
import { decodeBoard, type CloudBoard } from '@/game/cloud/board';
import styles from './account.module.css';

type User = { id: string; email: string };
type Remote = { id: string; puzzleId: string; pieces?: number; connections?: number; createdAt: string; unavailable?: boolean };
type Local = Awaited<ReturnType<typeof listLocalCopies>>[number];
type Archive = Awaited<ReturnType<typeof listArchives>>[number];
type Confirmation = { puzzleId: string; revision: number | null } & ({ board: CloudBoard; archiveId?: never } | { archiveId: number; board?: never });
class ApiError extends Error { constructor(readonly status: number, message: string) { super(message); } }
async function api(path: string, body?: unknown) {
  const response = await fetch(path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json(); if (!response.ok) throw new ApiError(response.status, data.error || 'Não foi possível concluir agora.'); return data;
}
const date = (value: string) => new Date(value).toLocaleString('pt-BR');
const play = (id: string) => id.includes('-48-') ? '/play?pieces=48' : '/play';
export function Account() {
  const uploads = useRef(new Map<string, { fingerprint: string; requestId: string }>());
  const confirmationElement = useRef<HTMLElement>(null);
  const [configured, setConfigured] = useState<boolean | null>(null), [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState(''), [code, setCode] = useState(''), [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('Carregando sua conta…');
  const [locals, setLocals] = useState<Local[]>([]), [archives, setArchives] = useState<Archive[]>([]), [remote, setRemote] = useState<Remote[]>([]), [next, setNext] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null), [restored, setRestored] = useState<string | null>(null);
  useEffect(() => { if (confirmation) { confirmationElement.current?.focus(); confirmationElement.current?.scrollIntoView({ block: 'center' }); } }, [confirmation]);
  async function reload() {
    const account = await api('/api/account'); setConfigured(account.configured); setUser(account.user);
    const [local, history] = await Promise.all([listLocalCopies(), listArchives()]); setLocals(local); setArchives(history);
    if (account.user) { const saved = await api('/api/backups'); setRemote(saved.items); setNext(saved.next); } else { setRemote([]); setNext(null); }
  }
  useEffect(() => { let active = true; void api('/api/account').then(async (account) => {
    if (!active) return; setConfigured(account.configured); setUser(account.user);
    const [local, history] = await Promise.all([listLocalCopies(), listArchives()]); if (!active) return; setLocals(local); setArchives(history);
    if (account.user) { const saved = await api('/api/backups'); if (!active) return; setRemote(saved.items); setNext(saved.next); }
    setMessage('');
  }).catch(() => { if (active) setMessage('Não foi possível carregar a conta. Seu progresso neste aparelho está preservado.'); }); return () => { active = false; }; }, []);
  async function run(work: () => Promise<void>) { setBusy(true); setMessage(''); try { await work(); } catch (error) { if (error instanceof ApiError && error.status === 401) { setUser(null); setRemote([]); setConfirmation(null); setSent(false); } setMessage(error instanceof Error ? error.message : 'Não foi possível concluir agora.'); } finally { setBusy(false); } }
  return <main className={styles.page}>
    <header><Link href="/">← Início</Link><Link href="/play">Continuar na mesa</Link><button disabled={busy} onClick={() => { void run(async () => { await reload(); setMessage('Conta atualizada.'); }); }}>Atualizar conta</button></header>
    <h1>Sua conta</h1><p>Guarde cópias privadas da montagem e recupere em outro aparelho. Você pode continuar jogando sem entrar.</p>
    <p role="status" className={message ? styles.notice : undefined}>{message}</p>
    {configured === false && <section className={styles.card}><h2>Continue neste aparelho</h2><p>A conta na nuvem ainda não está disponível. Sua montagem continua salva neste navegador.</p><Link href="/play">Voltar à mesa</Link></section>}
    {configured && !user && <section className={styles.card}><h2>Entrar ou criar conta</h2><p>Enviaremos um código para seu e-mail. Você não precisa criar uma senha.</p>
      <form onSubmit={(event) => { event.preventDefault(); void run(async () => { const result = await api('/api/auth', { action: sent ? 'verify' : 'send', email: email.trim(), ...(sent ? { token: code } : {}) }); setMessage(result.message); if (sent) { setCode(''); setSent(false); await reload(); } else setSent(true); }); }}>
        <label>E-mail<input type="email" autoComplete="email" required maxLength={254} value={email} disabled={busy || sent} onChange={(event) => setEmail(event.target.value)} /></label>
        {sent && <label>Código do e-mail<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,8}" minLength={6} maxLength={8} required value={code} onChange={(event) => setCode(event.target.value)} /></label>}
        <button disabled={busy} type="submit">{sent ? 'Confirmar código' : 'Enviar código'}</button>
        {sent && <button disabled={busy} type="button" onClick={() => { setSent(false); setCode(''); }}>Trocar e-mail ou reenviar</button>}
      </form></section>}
    {user && <><section className={styles.card}><h2>Conta conectada</h2><p>{user.email}</p><button disabled={busy} onClick={() => { void run(async () => { const result = await api('/api/auth', { action: 'logout' }); setConfirmation(null); await reload(); setMessage(result.message); }); }}>Sair da conta</button></section>
      <section className={styles.card}><h2>Montagens deste aparelho</h2><p>Guardar cria uma cópia nova na sua conta. As cópias anteriores ficam preservadas. Câmera, preferências de conforto e moedas demonstrativas continuam locais.</p>
        {!locals.length && <p>Abra a mesa para começar uma montagem.</p>}<ul>{locals.map((item) => <li key={item.puzzleId}><p>Lago sereno · {item.puzzleId.includes('-48-') ? 48 : 24} peças</p>{'board' in item && item.board ? <><time>{date(item.savedAt)}</time><br /><button disabled={busy} onClick={() => { void run(async () => {
          const latest = (await listLocalCopies()).find((copy) => copy.puzzleId === item.puzzleId); if (!latest || !('board' in latest) || !latest.board) throw new Error('Não foi possível ler a montagem local. Ela foi preservada.');
          const fingerprint = JSON.stringify(latest.board), pending = uploads.current.get(item.puzzleId);
          const requestId = pending?.fingerprint === fingerprint ? pending.requestId : crypto.randomUUID();
          uploads.current.set(item.puzzleId, { fingerprint, requestId });
          await api('/api/backups', { requestId, board: latest.board }); uploads.current.delete(item.puzzleId); await reload(); setMessage('Cópia guardada na sua conta.');
        }); }}>Guardar cópia de {item.puzzleId.includes('-48-') ? 48 : 24} peças</button></> : <p>Esta montagem não pôde ser lida. Ela foi preservada; use Baixar cópia na mesa.</p>}</li>)}</ul>
      </section>
      <section className={styles.card}><h2>Cópias na sua conta</h2><p>Para guardar os próximos movimentos, volte aqui e crie outra cópia. A sincronização nesta fase é manual.</p>
        {!remote.length && <p>Nenhuma cópia guardada ainda.</p>}<ul>{remote.map((item) => <li key={item.id}><p>Lago sereno · {item.pieces ?? (item.puzzleId.includes('-48-') ? 48 : 24)} peças · {item.connections ?? '—'} encaixes</p><time>{date(item.createdAt)}</time><br />{item.unavailable ? <p>Cópia incompatível preservada na conta.</p> : <button disabled={busy} onClick={() => { void run(async () => { const result = await api(`/api/backups/${item.id}`); const board = decodeBoard(result.board); setConfirmation({ puzzleId: board.puzzleId, revision: await localRevision(board.puzzleId), board }); setRestored(null); }); }}>Revisar restauração</button>}</li>)}</ul>
        {next && <button disabled={busy} onClick={() => { void run(async () => { const result = await api(`/api/backups?cursor=${encodeURIComponent(next)}`); setRemote((items) => [...items, ...result.items]); setNext(result.next); }); }}>Ver cópias anteriores</button>}
      </section></>}
    {confirmation && <section ref={confirmationElement} tabIndex={-1} className={styles.confirm} aria-label="Confirmar restauração"><h2>Restaurar esta montagem?</h2><p>Uma cópia da montagem atual será guardada no histórico deste aparelho antes da troca. Suas moedas demonstrativas e preferências de conforto permanecem locais.</p><p>Feche outras abas da mesa antes de confirmar. Se outra aba mudar a montagem, a troca será bloqueada.</p>
      <button disabled={busy} onClick={() => { void run(async () => { if (confirmation.board) await restoreCloudCopy(confirmation.board, confirmation.revision); else await restoreArchive(confirmation.archiveId, confirmation.revision); setRestored(confirmation.puzzleId); setConfirmation(null); await reload(); setMessage('Montagem restaurada. A anterior ficou no histórico deste aparelho.'); }); }}>Confirmar restauração</button><button disabled={busy} onClick={() => setConfirmation(null)}>Manter montagem atual</button>
    </section>}
    {restored && <p><Link href={play(restored)}>Abrir montagem restaurada</Link></p>}
    {archives.length > 0 && <section className={styles.card}><h2>Histórico deste aparelho</h2><p>Montagens preservadas antes das trocas. Elas ficam neste navegador, mesmo após sair da conta.</p><ul>{archives.map((item) => <li key={item.id}><p>Lago sereno · {item.puzzleId.includes('-48-') ? 48 : 24} peças</p><time>{date(item.savedAt)}</time><br /><button disabled={busy} onClick={() => { void run(async () => { setConfirmation({ archiveId: item.id!, puzzleId: item.puzzleId, revision: await localRevision(item.puzzleId) }); setRestored(null); }); }}>Revisar cópia local</button></li>)}</ul></section>}
  </main>;
}
