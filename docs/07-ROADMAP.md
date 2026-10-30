# 07 — Roadmap para Codex, sprints e critérios de aceite

**Objetivo:** dividir o trabalho em entregas pequenas, verticalmente testáveis, sem tentar desenvolver o produto inteiro numa única geração de código. Cada fase deve resultar em PR(s) com build e critérios verificáveis.

## Convenções de prioridade

- **P0:** necessário para a primeira sessão jogável.
- **P1:** melhora experiência e continuidade; essencial para MVP público.
- **P2:** expansão de produto e serviços online.
- **P3:** experimentos futuros, sujeitos a playtest/custo.

## Visão de entregas

| Fase | Prioridade | Entregável demonstrável | Dependência |
| --- | --- | --- | --- |
| 0 — Fundação | P0 | Next.js funcional, deploy preview e documentação | nenhuma |
| 1 — Mesa navegável | P0 | Mesa, tapete e câmera mobile/desktop | 0 |
| 2 — Peças e encaixes | P0 | Puzzle 24/48 peças montável | 1 |
| 3 — Sacolas e salvamento | P0 | Organização livre e resume persistido | 2 |
| 4 — Encantamento e MVP | P0/P1 | Sons, moedas locais, conclusão e polimento | 3 |
| 5 — Contas e catálogo | P1/P2 | Auth, banco, galeria e loja virtual | 4 |
| 6 — Multiplayer (1+3) | P2 | Montagem compartilhada e créditos | 5 |
| 7 — IA e Drive | P2 | Geração controlada e backup/exportação | 5/6 |
| 8 — Escala | P3 | Desempenho avançado, analytics, live ops | 7 |

**Marco MVP 0.1:** fim da Fase 4. Sem conta ou backend obrigatório.

## Fase 0 — Fundação e primeiro deploy

### F0.1 — Bootstrap do app

**Implementada:** landing Next.js em `src/app`, TypeScript estrito, Tailwind e scripts de desenvolvimento/qualidade. Vitest cobre a interação de início e Playwright cobre mobile/desktop. O jogo e o deploy Vercel pertencem às próximas entregas.

- Criar Next.js App Router com TypeScript strict, src/, Tailwind, ESLint e lockfile.
- Página inicial com marca temporária, botão "Iniciar" e destaque de que está em desenvolvimento.
- Garantir projetos funcionais com npm run dev, lint, typecheck, test e build.
- Não conectar serviços pagos nem exigir env vars para o primeiro build.
- Criar tests e configuração Vitest, Playwright; CI mínima opcional.

**Aceite:** app roda localmente e build passa. Nada de import PixiJS em Server Components.

### F0.2 — Preview Vercel e assets

- Importar repo na Vercel após F0.1, conectar main à produção e PRs a previews.
- Testar deploy automático e URLs de preview.
- Adicionar imagem de puzzle demo com licença registrada; sons e texturas leves quando disponíveis.
- Documentar origem e direitos de todos os assets.

**Aceite:** abrir primeiro deploy em smartphone e desktop sem erro.

## Fase 1 — Mesa e navegação

### F1.1 — Canvas e mundo

**Implementada:** `/play` acessível por Iniciar, PixiJS v8 client-only, madeira/feltro procedural, tapete 4:3 e sacolas decorativas. Câmera pura com limites, pan por mouse/toque, zoom/giro/centralização por botões e teclado; resize preserva centro, ângulo e zoom relativo. Pinça/gestos com dois dedos e roda do mouse permanecem na F1.2.

- Integrar PixiJS num Client Component com init/destroy correto.
- Renderizar madeira, tapete central com aspect ratio correto, espaço livre e sacolas decorativas.
- Implementar conversão world↔screen e câmera independente de estado do puzzle.
- Limites e botão "centralizar".

**Aceite:** mover, girar e ampliar a mesa sem perder o tapete.

### F1.2 — Gestos mobile-first

**Implementada:** pan/pinça/rotação com dois ponteiros, zoom pela roda no cursor e botões/teclado preservados. Transições de um/dois dedos, cancelamento, perda de foco e resize limpam ou rebaseiam o gesto. Testes automatizados cobrem mobile/desktop no Chromium; validação física em Android/iOS continua pendente.

- Pointer Events para pan, pinch, rotate, mouse wheel e drag em áreas distintas.
- Buttons alternativos para zoom, giro e centralizar.
- Respeitar safe-area, mudanças de orientação e acessibilidade básica.

**Aceite:** Android e iOS com touch, desktop com mouse; teste reversibilidade das transformações.

## Fase 2 — Motor de puzzle

### F2.1 — Definição determinística

**Implementada:** Lago sereno (SVG original CC0, 800×600), malha 4×6 seedada, contornos complementares com curvas Bézier amostradas, máscaras/hit areas reais no Pixi e 24 slots sem colisões fora do tapete e das sacolas. Ver imagem abre a referência. Enquadramento e limites da câmera ampliados para alcançar as peças. A malha suporta outras grades, mas esta distribuição e interface estão limitadas ao demo de 24 peças. Movimento e encaixes permanecem nas F2.2/F2.3.

- Esquema PuzzleDefinition e gerador de peças com seed e bordas compatíveis.
- Sprite com máscara real da peça, imagem correta e hit test.
- Distribuição inicial de 24 peças por mesa grande, sem sobreposição total.

**Aceite:** mesmas entradas geram mesmas peças/posições; bordas complementares; nenhum item desaparece.

### F2.2 — Movimentação e rotação

**Implementada:** seleção por contorno real ou lista acessível, arraste com offset em world space, giro de 90° por botão/R, peça selecionada à frente e contorno dourado. Setas movem a seleção; Escape desmarca. Cancelar/perder foco/resize ou adicionar segundo dedo desfaz o drag e permite operar a câmera. Limites consideram o polígono girado inteiro. Estado permanece só em memória; encaixes e persistência são entregas posteriores.

- Seleção e drag de peça, trazer para frente, quartos de volta, desfazer soltar se inválido.
- Separação clara entre pan da câmera e drag de peça, cancelamento de gesto seguro.
- Testes 0°, 90°, 180°, 270° de câmera.

**Aceite:** não há saltos visuais ou perda de peças ao combinar gestos.

### F2.3 — Snap e grupos

- Gerar grafo canônico de vizinhanças, achar candidatos, validar orientação/posição e colar.
- Grupos rígidos se movem e giram juntos.
- Confirmar conexões únicas e condição final de puzzle completo.

**Aceite:** puzzle de 24 peças montável de ponta a ponta; nenhuma conexão incorreta; testes unitários do core.

### F2.4 — 48 peças e dificuldade

- Testar malha 48 peças e desempenho mobile.
- Ajustar threshold de snap, disposição inicial e hit area conforme playtest.

**Aceite:** montagem jogável sem zoom/movimentos impossíveis.

## Fase 3 — Sacolas e salvamento

### F3.1 — Sacolas na mesa

- Criar, nomear/renomear, mover e abrir sacolas com etiquetas.
- Arrastar peças **soltas** para guardar; contar e mostrar conteúdo.
- Retirar peça para mesa sem perder geometria/identidade.

**Aceite:** separar todas as peças em sacolas e trazê-las de volta; inventário consistente.

### F3.2 — Autosave local

- Dexie/IndexedDB, schemaVersion, snapshots, restores e migrações.
- Salvar grupos, posições, sacolas, moedas locais, conclusão e preferências.
- Simular interrupções/refresh e validar integridade.

**Aceite:** concluir metade, recarregar e continuar de onde parou.

## Fase 4 — Encantamento e MVP 0.1

### F4.1 — Sons e celebração

- Efeitos de grab, drag, snap, moedas e conclusão; volume e mute.
- Brilho/partículas discretas, reduzir movimento e ajuste de qualidade.
- Animação de finalização sobre o tapete, sem ocultar obra.

**Aceite:** feedback satisfatório sem loops sonoros irritantes; jogo completo com áudio desligado.

### F4.2 — Moedas e continuidade

- +1 por conexão única, bônus de conclusão configurável, saldo local demonstrativo.
- Ledger local idempotente, prevenção de farming, botão "novo puzzle".
- Sem loja real ou compra online nesta etapa.

**Aceite:** salvar e recarregar não duplica moedas.

### F4.3 — Teste final de MVP

- Jogador novo consegue iniciar e montar sem login.
- UX e performance testadas no **celular real** e no desktop.
- Testes de toques/rotação/câmera/salvamento/conclusão.
- Refinar tapete, texturas, sacolas, zoom, feedback e acessibilidade.

**Aceite:** build/CI verdes, experiência de 24/48 peças completa e site acessível na Vercel.

## Fase 5 — Serviços online, galeria e loja

### F5.1 — Supabase

- Criar projeto e migrações SQL; Auth, Postgres, Storage; políticas RLS.
- Separar ambientes preview/produção e segredos.
- Adicionar importação de save local após login, com validação.

**Aceite:** usuário pode preservar e recuperar sessão em outro aparelho sem destruir save anterior.

### F5.2 — Catálogo

- Catálogo de imagens licenciadas com metadados e tamanhos de puzzle.
- Entitlements de puzzles, preço em moedas, preview e iniciar jogo.
- Sessões com asset imutável; controle de versões de definição.

**Aceite:** puzzle comprado/desbloqueado pode ser reutilizado, sem duplicar compras.

### F5.3 — Economia autoritativa

- Wallet + ledger transacional, rewards únicos e endpoints autenticados.
- Reconciliar moeda local demonstrativa sem vulnerabilidade de transferência arbitrária.
- Regras configuráveis e testes de concorrência.

**Aceite:** enviar requisição repetida, adulterada ou concorrente não gera saldo indevido.

### F5.4 — Galeria de obras

- Ao completar, salvar obra e metadados na galeria do dono.
- Mostrar imagem completa, progresso e dados da sessão.
- Privacidade por padrão; compartilhamento planejado.

**Aceite:** galeria persiste entre dispositivos.

## Fase 6 — Multiplayer cooperativo

### F6.1 — Salas e convites

- Entrar na sala do dono via convite seguro, no máximo 3 ajudantes.
- Presence e status da conexão; controle do dono.
- Câmeras individuais.

**Aceite:** quatro participantes com visões diferentes, sem vazamento de sessão privada.

### F6.2 — Estado compartilhado

- Lease de grupos, Broadcast de movimentos provisórios, commits no servidor.
- Revisões, idempotência, re-sync e recuperação após disconnect.
- Sincronização de sacolas, grupos e snaps.

**Aceite:** colisões concorrentes são resolvidas sem divergência.

### F6.3 — Créditos dos ajudantes

- Registrar ator real dos snaps confirmados e contribuição.
- Galeria do dono com ajudantes creditados; histórico "ajudei" separado.
- Ajustes de privacidade dos participantes.

**Aceite:** uma sessão concluída com 3 amigos aparece como obra do dono, creditando os 3.

## Fase 7 — IA e Google Drive

### F7.1 — Imagens por IA

- Provedor de imagens desacoplado, orçamento, moderação, filas e armazenamento.
- Criar puzzles a partir de imagens geradas com seed/reprodutibilidade.
- Primeiro operar catálogo curado; depois geração do usuário com quota.

**Aceite:** gerar uma imagem aprovada, publicar puzzle e montá-lo de forma reprodutível.

### F7.2 — Integração Google Drive

- OAuth com menor escopo, conexão/desconexão, backup privado versionado.
- Exportar obra concluída como imagem visível em pasta escolhida.
- Restaurar backup sem apagar progresso mais recente por engano.

**Aceite:** salvar, recuperar e revogar sem compartilhar dados além do necessário.

## Fase 8 — Evolução por demanda real

- Mais peças (100, 300, 500...), peças com formatos/dificuldades alternativos.
- Melhor performance de máscaras, culling, texturas e envio parcial.
- Conquistas, temas de mesa, tipos de tapete, customizações cosméticas.
- PWA/offline avançado, observabilidade, monetização apropriada, testes de carga.
- Backend dedicado apenas se perfis de tráfego/latência justificarem.

## 8.1 Definição de pronto de QUALQUER PR

- Objetivo único e escopo descrito.
- Telas mobile (390×844) e desktop (1440×900) conferidas.
- Acessibilidade básica, touch/mouse e estados de erro.
- Lint, typecheck, unit tests, build e e2e aplicáveis passando.
- Teste de atualização de página e retomada se PR mexe no estado.
- Sem chaves, dados privados ou assets sem licença no repositório.
- Docs/roadmap atualizados se comportamento ou decisões mudaram.
- Sem prometer que integrações futuras já estão entregues.

## 8.2 Prompt inicial recomendado ao Codex

> Leia README.md, AGENTS.md e todos os docs/01 a 08. Implemente **somente a Fase 0.1**, como um PR pequeno: app Next.js com TypeScript estrito, Tailwind, setup de testes, scripts dev/lint/typecheck/test/build e uma landing page mobile-first simples. Não implemente gameplay, Supabase, IA ou Drive ainda. Rode os checks e descreva resultados. Preserve a documentação. Na conclusão, informe próximos passos para importar na Vercel.

## 8.3 Prompt seguinte (após Fase 0.1)

> Leia AGENTS.md, docs/02, docs/03 e docs/04. Implemente **Fase 1.1**: PixiJS em Client Component, mesa grande de madeira, tapete proporcional à imagem e câmera com conversões world↔screen testadas. Sem mecânica de peças ainda. Garanta build e testes, e demonstre desktop e mobile.
