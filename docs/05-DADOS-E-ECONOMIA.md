# 05 — Dados, persistência, catálogo e economia

**Estratégia:** local-first no MVP; contas e dados online posteriormente. O servidor é fonte da verdade para saldo, propriedade, compras e multiplayer. Trechos SQL são **esboços para migrações**, não banco criado.

## 1. Snapshot local (MVP)

Persistência no navegador via **IndexedDB (Dexie)**:

- Chave estável sessionId e profileId local anônimo.
- Snapshot versionado: puzzleDefinitionId/version/seed, grupos e transformações, peças nas sacolas, etiquetas, conexões confirmadas, saldo local, estado de conclusão.
- Preferências separadas: mute, volumes, reduzir movimento, qualidade, câmera por sessão.
- Autosave com debounce (ex.: 0,5–2 s durante drag) e flush ao concluir ações; considerar visibilidade/fechamento da aba, sem prometer salvar no evento unload.
- Evitar persistir imagens gigantes como JSON; assets em cache separado quando adequado.
- Restore com validação Zod; backups locais opcionais exportáveis como JSON.
- Implementar migrações **schemaVersion**; se falhar, preservar backup bruto e informar em vez de sobrescrever.
- Modo privado, limpeza de dados do navegador e outros dispositivos podem eliminar o save local. Informar isso ao usuário.

### Contrato implementado nas F3.1/F3.2

O contrato executável está em `src/game/persistence/snapshot.ts`. O banco `quebra-cabeca-local` usa a tabela `saves`, chave `puzzleId`: uma montagem por definição de 24/48 peças. `definitionKey` identifica exatamente a definição/seed/asset. O snapshot v2 contém revisão, data, modelo (grupos, conexões, bolsas, ordem, guia, conclusão e saldo local reservado) e câmera (centro, zoom relativo e ângulo). Não há perfil ou sessão online.

O leitor migra v1 para v2 adicionando os campos ausentes de preferência/conclusão/saldo. Antes de restaurar ou gravar, valida IDs únicos, inventário completo, grupos conexos, ledger de conexões canônicas, bolsas somente com peças soltas e limites da mesa. Versões futuras, dados corrompidos e definições diferentes são preservados sem sobrescrita. A revisão é conferida dentro da transação IndexedDB: outra aba que avançou o save bloqueia a gravação antiga.

Ações confirmadas salvam imediatamente; câmera usa debounce de 700 ms. Durante arraste, o snapshot usa a última posição confirmada; pointercancel não vira progresso. `pagehide` e mudança de visibilidade tentam flush, sem garantir execução na interrupção abrupta do navegador. O status informa erros de armazenamento/conflito. Backup JSON exporta o último registro disponível, inclusive bruto incompatível; importação é futura. Limpeza de dados do navegador remove o save. Moedas continuam em zero até a F4.2.

## 2. Estratégia de evolução da nuvem

- Ao logar pela primeira vez, oferecer **importar save local**; não sobrescrever sessão online sem diálogo.
- Gerar nova sessão online com um dono, mantendo a seed original e imagem imutável.
- Salvar revisões de snapshots em Postgres (JSONB) e opcionalmente log compacto de eventos; não criar 1 registro por pixel arrastado.
- Upload de imagem/base puzzle para Supabase Storage; SQL guarda storage path e hashes, não bytes em base64.
- Operações financeiras, compras e snap competitivo passam por endpoint autenticado + transação no banco.
- Backend aplica limitação de taxa, valida schema, versão da sessão e direitos de acesso.

## 3. Entidades propostas

| Entidade | Propósito |
| --- | --- |
| profiles | Perfil público e preferências |
| puzzles | Catálogo, asset, origem/licença, dificuldade, seed, preço |
| user_puzzle_entitlements | Puzzles desbloqueados por pessoa, com data |
| game_sessions | Montagem do puzzle, dono, estado, revisão e conclusão |
| session_members | Participantes convidados, papel e status |
| session_snapshots | Estado versionado, compactado ou JSONB |
| session_events | Eventos auditáveis de snap/alteração, com idempotência |
| rewarded_connections | Conexões já remuneradas por sessão |
| wallet_accounts | Saldo corrente controlado em transação |
| wallet_ledger | Histórico de créditos/débitos idempotentes |
| gallery_entries | Registro de obra concluída pertencente ao dono |
| gallery_contributors | Participantes e métricas de ajuda, com referência |
| generated_images | Assets de IA, prompt seguro, provedor, custo, status |
| drive_connections | Token de conexão protegido e estado do backup (opcional) |

## 4. Esboço SQL para tabelas críticas

Exemplos PostgreSQL/Supabase; detalhes de RLS e índices completos serão desenvolvidos nas migrações reais.

~~~sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table public.puzzles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_path text not null,
  image_sha256 text not null,
  source_type text not null check (source_type in ('licensed','ai','user_upload')),
  license_info text,
  width int not null check (width > 0),
  height int not null check (height > 0),
  definition_version int not null,
  price_coins int not null default 0 check (price_coins >= 0),
  published boolean not null default false
);

create table public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  puzzle_id uuid not null references public.puzzles(id),
  owner_id uuid not null references public.profiles(id),
  status text not null default 'active'
    check (status in ('active','completed','archived')),
  revision bigint not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.session_members (
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  role text not null check (role in ('owner','helper')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (session_id, user_id)
);

create table public.session_snapshots (
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  revision bigint not null,
  schema_version int not null,
  state jsonb not null,
  created_at timestamptz not null default now(),
  primary key (session_id, revision)
);

create table public.rewarded_connections (
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  connection_id text not null,
  rewarded_to uuid not null references public.profiles(id),
  rewarded_at timestamptz not null default now(),
  primary key (session_id, connection_id)
);

create table public.wallet_accounts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance bigint not null default 0 check (balance >= 0)
);

create table public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.wallet_accounts(user_id),
  delta bigint not null check (delta <> 0),
  event_type text not null,
  event_key text not null,
  session_id uuid references public.game_sessions(id),
  created_at timestamptz not null default now(),
  unique (user_id, event_type, event_key)
);
~~~

**ATENÇÃO:** snippets não incluem todas as políticas RLS, direitos sobre imagens, constraints de usuários ativos, seeds imutáveis e operações transacionais. **Não aplicar esse SQL em produção isoladamente.**

## 5. RLS, privacidade e autorização

- Ativar Row Level Security em **todas as tabelas expostas pela API pública** antes de liberar frontend.
- Catálogo público deve expor apenas puzzles publicados/licenciados para publicação.
- Dono pode ver/editar sua sessão; ajudante só mediante convite válido e enquanto mantiver permissão.
- Galeria privada por padrão e compartilhamento explícito se desejado.
- Apenas backend com credenciais servidor pode modificar wallets, ledger, rewarded_connections e propriedades.
- Não expor service_role em NEXT_PUBLIC_*, browser, logs ou client bundle.
- Storage com buckets e regras coerentes com licença: assets públicos do catálogo e uploads privados separados.
- Links de convite expiram e podem ser revogados, com tokens hasheados no banco.

## 6. Economia: algoritmo seguro

Conceito: um evento único ganha uma quantia positiva; uma compra movimenta saldo e concessão de acesso numa **única transação**.

~~~text
onValidatedNewConnection(sessionId, connectionId, actorId):
  begin transaction
    lock relevant session / game state
    verify actor is authorized and connection is valid in canonical graph
    insert rewarded_connections (sessionId, connectionId) ON CONFLICT DO NOTHING
    if inserted:
      reward = serverConfig.coinsPerUniqueConnection
      insert wallet_ledger(userId, +reward, "snap", sessionId+":"+connectionId)
      update wallet_accounts balance = balance + reward
    update session revision and snapshot/event consistently
  commit
~~~

Para concluir: chave de bônus "complete:<sessionId>" única. Para comprar:

~~~text
buyPuzzle(userId, puzzleId, requestId):
  begin transaction
    lock wallet account row
    confirm puzzle is published, price valid, user not owner yet
    verify balance >= price
    insert entitlement (userId, puzzleId) unique; if already owned return success idempotent
    insert ledger debit unique for purchase and decrement balance
  commit
~~~

- Nunca confiar em "ganhei 500 moedas" enviado pelo cliente.
- Replay offline pode mostrar moedas locais provisórias, mas uma conta online precisa reconciliar no servidor validando geometria/ações.
- Recomenda-se **não transferir automaticamente moedas locais para saldo online** sem política de migração anti-fraude.
- Toda operação responde ID e revisão; retries não criam duplicidade.
- Registrar auditoria suficiente para corrigir bugs na economia sem armazenar tudo indefinidamente.

## 7. Contribuições e autoria

- owner_id nunca muda ao entrar ajudantes.
- Por conexão validada registrar actor_id autenticado, timestamp, session_id e connection_id.
- gallery_entries criada **somente para owner_id** na conclusão; contributors referenciam essa obra.
- Um ajudante pode aparecer como "participou da montagem de X" em histórico próprio, **não** como dono da obra.
- Crédito de moedas de ajudante é decisão de game design ainda aberta; começar com progresso contabilizado e distinguir recompensa de propriedade.
- Ausência de colaborador online não remove sua referência histórica; possibilidade de ocultar avatar/nome mediante privacidade.

## 8. Consistência e retenção

- Preferir snapshots em intervalos de eventos, não em cada movimento.
- Guardar último snapshot estável e revisão, mais eventos desde esse snapshot para replay se necessário.
- Versionar snapshots; migrar dados antigos por versão.
- Política de expurgo para sessões abandonadas e arquivos temporários de IA (com comunicação ao usuário).
- Rotina de backup da base e estratégia de recuperação antes de abrir multiplayer.
- Google Drive será um destino de backup/exportação opcional, não um segundo banco autoritativo.

## 9. Índices e questões para implementar depois

- Índices em game_sessions(owner_id, status), session_members(user_id), ledger(user_id, created_at), gallery_entries(owner_id, completed_at).
- Constraints/locks para **no máximo 3 ajudantes ativos** além do dono, implementados em transação.
- Construir RLS antes de expor tabelas ao browser.
- Reduzir writes e custo de egress com snapshots incrementais.
- Definir limite de saves por conta e tamanho máximo por sessão conforme uso real.

## 10. Critérios de pronto

- Refresh restaura exatamente peças, sacolas, grupos e saldo local.
- Versão online nega alteração de sessão por terceiros e jamais aceita moedas declaradas pelo cliente.
- Compra concorrente não torna saldo negativo nem duplica débito.
- Uma conexão idêntica confirmada duas vezes gera apenas uma linha de recompensa.
- A conclusão online cria uma obra na galeria do dono, associada aos ajudantes autorizados.
