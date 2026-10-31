import Dexie, { type Table } from 'dexie';
import type { PuzzleDefinition } from '../core/puzzle/puzzle';
import { decodeSave, definitionKey, type LocalSave, type SavePayload } from './snapshot';

export class PuzzleDatabase extends Dexie {
  saves!: Table<LocalSave, string>;
  archives!: Table<{ id?: number; puzzleId: string; savedAt: string; save: LocalSave }, number>;
  constructor(name = 'quebra-cabeca-local') { super(name); this.version(1).stores({ saves: 'puzzleId' }); this.version(2).stores({ saves: 'puzzleId', archives: '++id,puzzleId,savedAt' }); }
}

export class LocalSaveSession {
  private revision = 0;
  private blocked = false;
  private pending: SavePayload | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private queue: Promise<void> = Promise.resolve();
  private hash = '';
  private backup: unknown;
  constructor(private definition: PuzzleDefinition, private status: (message: string) => void, readonly database = new PuzzleDatabase()) {}
  async load(): Promise<LocalSave | null> {
    try {
      const raw: unknown = await this.database.saves.get(this.definition.id);
      if (!raw) return null;
      this.backup = raw;
      const save = decodeSave(raw, this.definition);
      this.revision = save.revision;
      this.hash = JSON.stringify({ model: save.model, camera: save.camera });
      this.status('Progresso restaurado neste navegador.');
      return save;
    } catch {
      this.blocked = true;
      this.status('Não foi possível ler o progresso. Dados existentes foram preservados; salvamento desativado.');
      return null;
    }
  }
  schedule(payload: SavePayload, immediate = false) {
    if (this.blocked) return;
    this.pending = structuredClone(payload);
    this.status('Salvando neste navegador…');
    if (this.timer) clearTimeout(this.timer);
    if (immediate) void this.flush();
    else this.timer = setTimeout(() => { void this.flush(); }, 700);
  }
  flush(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    const payload = this.pending; this.pending = null;
    if (!payload || this.blocked) return this.queue;
    this.queue = this.queue.then(async () => {
      if (this.blocked) return;
      const hash = JSON.stringify(payload);
      if (hash === this.hash) { this.status('Salvo neste navegador.'); return; }
      this.status('Salvando neste navegador…');
      try {
        const candidate: LocalSave = { ...payload, schemaVersion: 4, puzzleId: this.definition.id, definitionKey: definitionKey(this.definition), revision: this.revision + 1, savedAt: new Date().toISOString() };
        decodeSave(candidate, this.definition);
        await this.database.transaction('rw', this.database.saves, async () => {
          const current = await this.database.saves.get(this.definition.id);
          if (current) decodeSave(current, this.definition);
          if ((current?.revision ?? 0) !== this.revision) throw new Error('Conflito de revisão');
          await this.database.saves.put(candidate);
        });
        this.revision = candidate.revision; this.hash = hash; this.backup = candidate;
        this.status('Salvo neste navegador.');
      } catch {
        this.blocked = true;
        this.status('Não foi possível salvar (armazenamento ou outra aba). O progresso anterior foi preservado.');
      }
    });
    return this.queue;
  }
  get hasBackup() { return this.backup !== undefined; }
  downloadBackup() {
    if (!this.backup) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(this.backup)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `${this.definition.id}-backup.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async close() { await this.flush(); this.database.close(); }
}
