# AGENTS.md — instruções para Codex e agentes de desenvolvimento

Este repositório começa com **documentação de produto/engenharia**. O código será implementado **incrementalmente**. Não assuma que Next.js ou dependências já estão instalados apenas porque constam no plano.

## 1. Antes de qualquer alteração

1. Ler README.md, docs/01-PRODUTO.md e docs/07-ROADMAP.md.
2. Para features de jogo, ler docs/02-UX-MOBILE-FIRST.md e docs/04-MOTOR-DE-JOGO.md.
3. Para infraestrutura, ler docs/03-ARQUITETURA.md e docs/08-DECISOES.md.
4. Para banco/moedas, ler docs/05-DADOS-E-ECONOMIA.md.
5. Para multiplayer/IA/Drive, ler docs/06-INTEGRACOES.md.
6. Selecionar **apenas uma tarefa do roadmap**, declarar escopo e critérios de aceite.
7. Não modificar regras centrais sem registrar decisão e atualizar documentação.

## 2. Objetivo principal

Construir um jogo web de quebra-cabeças **mobile-first** em que uma pessoa possa:
- explorar uma **mesa grande**, com zoom, pan e rotação da visão;
- montar um puzzle de imagem com peças inicialmente desmontadas e espalhadas;
- posicionar uma imagem montada sobre **tapete central proporcional**;
- arrastar, girar e encaixar peças em grupos;
- separar peças livremente na mesa ou em **sacolas com etiquetas**;
- receber feedback visual e sonoro agradável por conexões válidas;
- ganhar moedas de progressão e depois gastá-las em novos puzzles;
- no futuro usar puzzles com imagens geradas por IA, Drive e até 3 ajudantes;
- ter a galeria da obra pertencendo ao **dono**, com referências aos ajudantes.

## 3. Padrões técnicos obrigatórios

- TypeScript estrito; preferir funções puras para regra de jogo.
- Frontend: Next.js App Router e React; renderizador PixiJS v8, isolado em Client Component.
- UI responsiva com foco primeiro em **toque e telas pequenas**, depois desktop.
- Estados permanentes no espaço lógico do mundo, não coordenadas de pixels da tela.
- Estado de domínio independente de Pixi/React/DOM; camada renderer não muda wallet.
- Peças com geometria determinística por seed; testes para encaixes/grupos.
- Persistência local IndexedDB com schemaVersion e migrações.
- Ao acrescentar serviços online, autorização e validação server-side para mudanças persistentes críticas.
- Secrets só no servidor, nunca em código, docs de exemplo com credenciais reais ou NEXT_PUBLIC_*.
- Imagens/áudio devem ter licença documentada; não usar mídia protegida sem autorização.
- Não transformar MVP em app 3D sem decisão explícita.

## 4. Qualidade antes de aceitar PR

**Executar se os scripts existirem:**

~~~sh
npm run lint
npm run typecheck
npm test
npm run build
~~~

Adicionar Playwright e testes de integração conforme a tarefa. Se algum comando não existir, dizer que ainda não foi configurado; não alegar execução fictícia.

**Verificação de UX obrigatória:**
- Conferir no mínimo viewport 390x844 e 1440x900.
- Testar mouse e interações touch; simuladores não substituem teste real em iOS/Android quando dependência de gesto/canvas for crítica.
- Não aceitar feature que funcione só desktop.
- Preservar interação de câmera quando peça é agarrada; suportar pointercancel.
- Suportar "reduzir movimento" e mute para efeitos não essenciais.
- Explicar visualmente ação e estado; sem controle escondido impossível de descobrir.

**Verificação de estado:**
- Nenhuma peça desaparece ao arrastar, girar, guardar ou restaurar.
- Encaixes são determinísticos e válidos; nenhuma conexão paga duas vezes.
- Mudanças de tamanho, orientação ou câmera não mutam estado canônico.
- Save velho que não pode ser lido não deve ser sobrescrito silenciosamente.

## 5. Estratégia de implementação

1. **Fase 0.1 primeiro:** bootstrap Next.js/TypeScript/Tailwind, scripts, testes e landing mobile-first. Não adicionar Supabase, IA, Drive nem multiplayer.
2. Primeiro vertical slice do tabuleiro: mesa e tapete → câmera → uma peça interativa.
3. Motor puro completo: recortes, distribuição, snap, grupos.
4. Sacolas, autosave e sons/recompensas.
5. Somente depois login, banco, loja, galeria, multiplayer, IA e Drive.

Cada PR deve trazer:
- O que mudou e o que **não** foi implementado.
- Screenshots ou descrição de experiência mobile/desktop (se ferramenta permitir).
- Testes que executou e resultados reais.
- Riscos/pendências e próxima tarefa do roadmap.
- Mudanças de docs quando necessário.

## 6. Segurança e custos

- Nunca publicar chave de API OpenAI, Google OAuth secret, Supabase service_role ou tokens.
- Não aceitar eventos de moedas, compra ou posse declarados diretamente por cliente após backend entrar no ar.
- RLS em tabelas expostas; sessão privada não é acessível só por adivinhar ID.
- Imagem gerada por IA requer controle de custos, quota e autorização; não criar chamadas pagas sem pedido explícito.
- Não ativar serviços pagos ou criar projeto externo sem autorização do dono.
- Cautela com plano Vercel Hobby (pessoal/não comercial).

## 7. Requisitos futuros preservados desde já

- A pessoa poderá conectar Google Drive para **backup privado e/ou exportação visível** do puzzle montado, com consentimento.
- Multiplayer: **dono + 3 ajudantes**, câmera independente, estado compartilhado, locks e reconciliação.
- A galeria do puzzle completo pertence ao dono; ajudantes têm crédito com identificação/privacidade, não copropriedade implícita.
- Imagens podem ser geradas por IA, mas **puzzles já criados usam asset imutável**, seed e geometria determinística.
- Modelar a estrutura de dados para expansão, **sem implementar componentes de backend prematuramente**.

## 8. Proibições de engenharia

- Não colocar toda lógica em page.tsx, em um React component gigante ou em um único useEffect.
- Não usar sorteio não determinístico na definição/salvamento do puzzle.
- Não criar eventos de conexão/moeda toda vez que uma peça se aproxima sem encaixe validado.
- Não sincronizar câmera entre jogadores automaticamente.
- Não usar Drive como banco autoritativo para jogo multiplayer.
- Não afirmar que a arquitetura está implementada quando só houve documentação.
- Não apagar progresso ou reduzir a semântica do jogo a uma imagem estática sem pedido explícito.

## 9. Primeira tarefa ao receber "comece"

Implementar **somente Fase 0.1** do docs/07-ROADMAP.md em branch/PR, com build verde, landing mínima e README atualizado quando necessário. Ao terminar, sinalizar que o próximo passo é conectar Vercel e começar o canvas.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
