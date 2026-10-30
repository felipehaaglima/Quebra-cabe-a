# 03 — Arquitetura técnica, frameworks e organização do código

> Decisão base: **Next.js/TypeScript + PixiJS para renderização 2D**. Começar local-first e adicionar serviços apenas quando a mecânica estiver validada.

## 1. Componentes e responsabilidades

~~~text
GitHub (main + branches/PRs)
  └── Vercel: deploy automático / preview de PR
       └── Next.js App Router
            ├── React + Tailwind: páginas, menus, HUD, loja, galeria
            ├── componente client-only: PixiJS 8 → canvas da mesa
            ├── game-core (TS puro): regras de snap, grupos, puzzles, economia local
            ├── game-state: Zustand / estados de UI e mundo
            ├── persistence: IndexedDB (Dexie) → autosave local (MVP)
            └── Route Handlers (futuro)
                 ├── Auth e autorização
                 ├── comandos validados (progressão, compras, salas)
                 ├── Supabase Postgres/Storage/Realtime
                 ├── geração de imagem por IA (server-side)
                 └── integração OAuth/Drive opcional
~~~

**Separação fundamental:** o motor deve funcionar sem PixiJS, DOM, React, Supabase ou Next.js. A cena é um adaptador visual para estado e comandos. Isso torna snapshots, multiplayer, replay e testes determinísticos viáveis.

**Implementação atual (F3.2):** o estado de domínio fica em controladores TypeScript, com React para a interface. Zustand ainda não foi necessário. `src/game/persistence` isola Dexie e a validação/migração Zod; o motor puro não importa dependências de armazenamento.

## 2. Stack proposta

| Camada | Tecnologia | Motivo |
| --- | --- | --- |
| App e BFF | Next.js App Router + TypeScript | UI/SSR, APIs futuras e deploy Vercel |
| UI | React + Tailwind CSS + Lucide | Responsividade e componentes acessíveis |
| Render 2D | PixiJS v8 | Canvas acelerado, sprites, máscaras e eventos pointer |
| Gestos | Pointer Events + controlador de câmera próprio | Touch, pinch, rotação, pan e mouse consistentes |
| Estado local | Zustand | Estado de interação e sessão sem acoplar ao canvas |
| Armazenamento local | Dexie / IndexedDB | Snapshots sem ocupar localStorage com dados grandes |
| Tipos/validação | TypeScript estrito + Zod | Contratos de entrada, save migrations e API |
| Áudio | Web Audio API ou Howler (avaliar no spike) | Múltiplos efeitos curtos e volume |
| Testes de regras | Vitest | Geometria, economia, restauração |
| Testes UI/fluxo | Testing Library + Playwright | Web e gestos por dispositivo |
| Backend futuro | Next Route Handlers + Supabase | Sem servidor dedicado no começo |
| Persistência online | Supabase Postgres + Storage | Sessões, catálogo, imagens e galeria |
| Realtime futuro | Supabase Realtime Broadcast + Presence | Eventos, presença, reconexão |
| Deploy/CI | Vercel + GitHub Actions (opcional) | Build/preview/qualidade |

**Dependências:** não cravar versões exatas antes de iniciar; selecionar últimas versões estáveis compatíveis e travar lockfile no primeiro PR. Testar compatibilidade PixiJS v8 x Next e browsers mobile.

## 3. Árvore de pastas alvo (a ser criada na Fase 0)

~~~text
/
├── README.md
├── AGENTS.md
├── docs/
├── public/
│   ├── puzzles/demo/
│   ├── textures/
│   └── audio/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── play/[sessionId]/page.tsx
│   │   ├── gallery/page.tsx              # futuro
│   │   ├── store/page.tsx                # futuro
│   │   └── api/                         # futuro
│   ├── components/
│   │   ├── ui/
│   │   ├── game/
│   │   │   ├── GameCanvas.tsx
│   │   │   ├── GameHUD.tsx
│   │   │   ├── BagSheet.tsx
│   │   │   └── ControlsHelp.tsx
│   │   └── layout/
│   ├── game/
│   │   ├── core/                        # TS puro, sem Pixi/React
│   │   │   ├── geometry/
│   │   │   ├── puzzle/
│   │   │   ├── snap/
│   │   │   ├── camera/
│   │   │   └── economy/
│   │   ├── renderer-pixi/
│   │   │   ├── Scene.ts
│   │   │   ├── PieceSprite.ts
│   │   │   └── Textures.ts
│   │   ├── input/
│   │   │   └── GestureController.ts
│   │   ├── state/
│   │   │   └── useGameStore.ts
│   │   ├── persistence/
│   │   │   ├── indexedDb.ts
│   │   │   └── migrations.ts
│   │   └── audio/
│   ├── lib/
│   │   ├── supabase/                    # futuro
│   │   ├── auth/                        # futuro
│   │   └── validation/
│   └── styles/
├── supabase/migrations/                 # futuro
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
~~~

## 4. Regras de dependência

- **core** aceita dados simples e retorna estado/eventos; importa somente módulos puros.
- **renderer-pixi** traduz o estado em sprites, recebe comandos do input e nunca gera moedas.
- **input** converte gestos em comandos (movePiece, moveCamera, rotatePiece, storeInBag, etc.).
- **state** orquestra comandos e atualização otimista, sem reimplementar regras de encaixe.
- **persistence** serializa snapshots versionados do core, não instâncias PixiJS.
- **server** revalida ações que impactam saldo, compra, propriedade ou participação. Não confiar em eventos financeiros vindos do cliente.
- Componentes Next server não importam módulos Pixi que dependam de window/canvas. Carregar jogo apenas em **Client Component** e, se preciso, com import dinâmico sem SSR.

## 5. Estratégia de estado

Separar explicitamente:

1. **PuzzleDefinition** (imutável): image asset, grade, seed, dimensões e regras.
2. **SessionState** (durável): peças/grupos, posições, rotação, sacolas, conexões confirmadas, status, revisão.
3. **LocalViewState** (por dispositivo): câmera, seleção, HUD, som, qualidade; no multiplayer a câmera continua local.
4. **EconomyState** (local no MVP e autoritativo no servidor mais tarde): saldo e ledger.
5. **EphemeralState**: ponteiros atuais, peça agarrada, partículas, colisões temporárias.

Não enviar movimento de câmera na rede a menos que exista uma funcionalidade futura de "seguir jogador".

## 6. Eventos de domínio

~~~ts
type GameCommand =
  | { type: "piece.move"; pieceId: string; x: number; y: number }
  | { type: "piece.rotate"; pieceId: string; quarterTurns: 1 | 2 | 3 }
  | { type: "piece.release"; pieceId: string }
  | { type: "bag.create"; label: string; x: number; y: number }
  | { type: "bag.rename"; bagId: string; label: string }
  | { type: "bag.store"; bagId: string; pieceId: string }
  | { type: "bag.extract"; bagId: string; pieceId: string; x: number; y: number };

type DomainEvent =
  | { type: "piece.snapped"; connectionId: string; groupId: string }
  | { type: "puzzle.completed"; sessionId: string }
  | { type: "piece.stored"; pieceId: string; bagId: string }
  | { type: "bag.renamed"; bagId: string };
~~~

Eventos são conceituais. O motor de grupos deverá operar com groupId e movimentações atômicas. Não usar os tipos acima como definição fechada de APIs antes dos testes de design.

## 7. Deploy, ambientes e segredos

1. Fase 0: criar app, garantir lint/typecheck/test/build, adicionar GitHub Actions se necessário.
2. Somente depois importar repositório na **Vercel**, framework Next.js, root na raiz, produção em main.
3. Branch/PR → **Preview Deployment**; main → produção.
4. Variáveis server-only para segredos; não expor service_role do Supabase nem chave de API da IA no bundle.
5. Ambientes local, preview e produção; não compartilhar banco de produção com previews de PR.
6. A versão pessoal gratuita da Vercel é voltada a **uso pessoal e não comercial**; reavaliar plano e custos quando houver operação comercial/escala.
7. Configuração de domínio, políticas de CORS e OAuth antes de ativar login/Drive.

## 8. Qualidade contínua

- TypeScript strict, ESLint, formatting consistente e testes de regras.
- Vitest com casos determinísticos de seed, rotação e reversibilidade das transformações.
- Playwright com viewports mobile 390×844 e desktop 1440×900 como mínimos de regressão; testes reais touch adicionais.
- Captura de falhas de canvas, performance e estados de save incompatíveis (telemetria minimizada, sem vazar imagens privadas).
- Atualização de save com schemaVersion + migrações; nunca invalidar progresso silenciosamente.
- PRs pequenos e fáceis de revisar; nenhuma integração paga na ausência de autorização e limites.

## 9. Alternativas deliberadamente adiadas

- Three.js/WebGL 3D: maior custo de render/controle para pouco benefício inicial.
- Java/Spring Boot: viável no futuro, mas adiciona hospedagem, observabilidade e manutenção antecipadas. Avaliar se regras multiplayer exigirem servidor dedicado.
- React renderizando cada peça como div: menos adequado a centenas de sprites, máscaras e transforms simultâneos.
- Firebase/Firestore como storage único: Supabase oferece Postgres relacional que facilita ledger, compras, RLS e atribuição.
- CRDT genérico: encaixe de peças precisa de invariantes fortes e controle de conflitos; eventos validados são mais simples.

## 10. Fontes oficiais

- https://nextjs.org/docs/app
- https://pixijs.com/8.x/guides/components/events
- https://vercel.com/docs/plans
- https://supabase.com/docs/guides/realtime
