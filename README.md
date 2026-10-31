# Quebra-cabeça — jogo cozy, mobile-first

> **Status em 31/10/2026:** Fase 5.1 preparada, com ativação Supabase pendente: mesa navegável com escolha de 24 ou 48 peças recortadas do puzzle Lago sereno. **Puzzle de 24/48 peças com interface compacta, bolsas, autosave, sons opcionais, celebração e moedas locais.**

Um jogo web de montar quebra-cabeças em uma mesa virtual acolhedora. O jogador navega por uma mesa grande, movimenta e gira peças, usa um tapete de montagem, organiza peças em sacolas etiquetadas, ganha moedas por progresso legítimo e desbloqueia novos puzzles. A experiência deve funcionar primeiro no celular e se adaptar elegantemente ao desktop.

## Princípios do produto

1. **Mobile-first de verdade:** gestos naturais, interface que não cobre as peças, boa performance em celulares comuns; mouse/teclado como adaptação.
2. **Relaxante e tátil:** madeira, feltro, microanimações, encaixes satisfatórios, sons ajustáveis, sem cronômetro ou publicidade intrusiva no MVP.
3. **Começar a jogar imediatamente:** o primeiro puzzle pode ser montado sem criar conta.
4. **Organização livre:** mesa ampla, câmera com zoom/pan/rotação, tapete central e sacolas com etiquetas.
5. **Progressão justa:** recompensas contabilizadas no servidor quando houver conta, com proteção contra duplicações.
6. **Crescimento incremental:** local-first no começo; depois galeria, loja, imagens por IA, contas, nuvem, colaboração e Drive.
7. **Código testável:** geometria e regras do puzzle independentes do renderizador.

## Documentação (fonte de verdade)

| Documento | Conteúdo |
| --- | --- |
| [Visão do produto](docs/01-PRODUTO.md) | Conceito, requisitos, gameplay, sacolas, moedas, galeria e critérios |
| [Experiência mobile-first](docs/02-UX-MOBILE-FIRST.md) | Layout, controles touch/mouse, acessibilidade, sons, performance |
| [Arquitetura técnica](docs/03-ARQUITETURA.md) | Frameworks, responsabilidades, estrutura de pastas, deploy e testes |
| [Motor de jogo](docs/04-MOTOR-DE-JOGO.md) | Geometria de peças, câmera, grupos, encaixes, algoritmos e contratos TypeScript |
| [Persistência e economia](docs/05-DADOS-E-ECONOMIA.md) | Esquema SQL proposto, saves, moedas, loja, autoria e segurança |
| [Multiplayer, Drive e IA](docs/06-INTEGRACOES.md) | Colaboração até 4, IA de imagens, Google Drive, privacidade |
| [Roadmap e entregas](docs/07-ROADMAP.md) | Fases implementáveis, prioridades, critérios de pronto |
| [Decisões e riscos](docs/08-DECISOES.md) | Hipóteses, trade-offs, orçamento e decisões em aberto |
| [Validação de 48 peças](docs/09-VALIDACAO-48-PECAS.md) | Testes executados, métricas do Chromium e limitações de desempenho |
| [Validação da Fase 4](docs/10-VALIDACAO-FASE-4.md) | UI, efeitos, moedas, checks e aceite físico pendente |
| [Orientações para agentes](AGENTS.md) | Regras para Codex/assistentes que implementarem o projeto |

## Stack e arquitetura

- **Fundação instalada:** Next.js 16 (App Router), React 19, TypeScript estrito e Tailwind CSS 4.
- **Testes instalados:** Vitest + Testing Library e Playwright.
- **Renderização instalada:** PixiJS v8 com WebGL, isolado em componente client-only e carregado sob demanda.
- **Persistência instalada:** IndexedDB via Dexie, validação Zod e snapshots versionados.
- **Estilos/componentes:** Tailwind CSS + componentes acessíveis; ícones Lucide.
- **Estado local do jogo:** controladores TypeScript independentes de React/Pixi; Zustand permanece uma opção futura.
- **Validação e testes:** Zod, Vitest, Testing Library, Playwright (mobile/desktop).
- **Contas preparadas (F5.1):** Supabase Auth/Postgres, Storage privado e APIs via Route Handlers; ativação externa pendente. Realtime permanece futuro.
- **Deploy:** GitHub → Vercel com Preview Deployments por PR e produção pela main.
- **IA de imagens no futuro:** API de geração de imagens acionada **somente no servidor**, com limites e controle de custo.
- **Google Drive no futuro:** exportação/sincronização opcional de backups, sem torná-lo banco principal.

## Primeira experiência jogável (MVP 0.1)

- Um puzzle próprio, com imagem licenciada de exemplo e entre **24 e 48 peças**.
- Mesa grande, tapete no centro, peças espalhadas ao redor.
- Câmera com zoom, pan e rotação; navegação touch e mouse sem conflito com arrastar peças.
- Pegar, mover, girar, encaixar e agrupar peças; sacolas com nomes editáveis.
- Som de encaixe, animação discreta, moedas locais demonstrativas e celebração de conclusão.
- Salvamento automático no dispositivo com recuperação ao recarregar.
- Ajustes de som, movimento reduzido e qualidade de renderização.

**Fora do MVP 0.1:** banco remoto, login obrigatório, compra real, marketplace, Drive, multiplayer e geração paga de imagens. Tudo isso está especificado para etapas seguintes.

## Desenvolvimento local

Use Node.js 24 LTS (`nvm use`, se disponível) e npm. O modo local não exige variáveis ou serviços externos. Contas e cópias privadas dependem da configuração opcional do Supabase; veja [ativação da F5.1](supabase/README.md).

```sh
npm ci
npm run dev
```

Abra a porta 3000 no seu ambiente local. Na abertura, escolha **24 peças · tranquilo** ou **48 peças · mais desafiador**. O botão **Iniciar** abre `/play` (24) ou `/play?pieces=48` (48), com uma mesa navegável em PixiJS v8. Arraste uma peça ou grupo com um dedo ou mouse para movê-lo; arraste uma área vazia para mover a visão. Com dois dedos, mova, faça pinça para zoom e gire a mesa ao redor do ponto entre os dedos. A roda do mouse amplia no cursor. Abra **Ferramentas** para zoom, giro de 90°, centralização, seleção de peças, preferências e ajuda. A barra principal mantém somente Bolsas, Guia, Ver imagem e Ferramentas. Girar/Encaixar aparecem ao selecionar uma peça; dicas não alteram o tamanho da mesa. Ao focar o canvas, as setas movem a peça selecionada (ou a visão se não houver seleção), +/− ampliam/reduzem, R gira a peça selecionada (ou a mesa), Escape desmarca e Home centraliza. A lista **Selecionar peça** e o botão **Girar peça** oferecem alternativas por teclado/toque. **Ver seleção** aproxima a peça escolhida, útil para as peças menores no modo 48. O toque admite pequena proximidade do contorno; o mouse mantém o contorno exato.

A mesa, o feltro 4:3 e as bolsas etiquetadas são desenhados proceduralmente. Ambas as malhas usam uma ilustração vetorial original 800×600, [Lago sereno](public/puzzles/demo/lago-sereno-v1.svg), dedicada a CC0 com [licença registrada](public/puzzles/demo/LICENSE.md). **Ver imagem** abre a referência.

O grupo selecionado ganha contorno dourado e vem para a frente. **Guia no tapete** começa ligado em novas montagens e continua desligável. Mostra somente espaços retangulares neutros, sem imagem fantasma ou indicação antecipada do lugar correto. Durante o arraste, a célula sob a peça fica amarela, independentemente de estar certa. Ao soltar, a peça precisa pertencer àquela célula e estar na orientação original; então fica centralizada no espaço. Uma tentativa inválida no tapete devolve a peça/grupo ao local anterior, ou à bolsa de onde foi retirada. A origem da bolsa é preservada mesmo após reload. Fora do tapete a organização continua livre. **Ver imagem** permanece uma referência separada e explícita. A preferência do guia em saves existentes é respeitada; Novo puzzle volta ao padrão ligado. Solte peças vizinhas com orientação igual perto da posição correta para encaixar. O botão **Encaixar** ou Enter também tenta unir a seleção; Shift+setas faz ajustes finos. O contador mostra os encaixes únicos (38 em 24 peças; 82 em 48) e os grupos restantes. O contorno inteiro do grupo fica limitado à mesa. Cancelar um arraste, perder foco, redimensionar a tela ou iniciar um gesto com dois dedos desfaz o movimento em andamento; girar com R confirma a posição atual. Ao reunir todas as peças, a conclusão é reconhecida onde estiver a obra, sem exigir o tapete; **Alinhar obra** posiciona a montagem no tapete na orientação original. Movimentos e giros posteriores preservam as conexões. Sons curtos originais são sintetizados após interação, com mute/volume. Em **Ferramentas → Conforto → Testar som**, é possível ativar e conferir os efeitos; o status distingue áudio ativado, silenciado ou bloqueado pelo navegador. A ativação é tentada também ao terminar o toque e cliques, preservando o primeiro efeito enquanto o contexto retoma por até 350 ms. Brilho e celebração são breves e opcionais; **Continuar olhando** dispensa a celebração, **Alinhar no tapete** enquadra a obra. Movimento reduzido (do sistema ou em Ferramentas) desliga os efeitos; qualidade Econômica limita DPR e desliga partículas.

**Bolsas** abre um painel para criar, renomear, mover e consultar bolsas. Arraste uma peça solta sobre uma bolsa para guardar ou use a seleção do painel. Toque numa bolsa para abri-la; arraste para movê-la. Retirar devolve a mesma peça à mesa. Grupos encaixados continuam na mesa.

O progresso é salvo automaticamente **neste navegador**, separadamente para 24 e 48 peças: posições, grupos, conexões, bolsas, conclusão, câmera, opção do guia, preferências, ledger de moedas e origens pendentes de bolsa. O rodapé indica salvamento/restauração e permite baixar backup JSON. Saves incompatíveis ou conflitos com outra aba bloqueiam a sobrescrita e exibem um aviso. Limpar os dados do navegador remove o progresso; não há sincronização entre dispositivos nem importação de backup nesta fase. Movimentos cancelados não são confirmados no save.

O enquadramento inicial mostra as peças ao redor do tapete; o pan alcança toda a mesa. Recortes e distribuição inicial são reproduzíveis pela seed. É necessário WebGL disponível no navegador; falhas de inicialização mostram uma mensagem com opção de tentar novamente.

Moedas são demonstrativas e **por definição de puzzle**: +1 por conexão única, bônus de +20 no modo 24 e +30 no modo 48. O total máximo é 58/112, respectivamente. Reload e **Novo puzzle** preservam o ledger: recomeçar o mesmo puzzle não gera moedas novamente. Novo puzzle pede confirmação e reinicia posições/bolsas, mantendo saldo e preferências. Saves antigos migram sem crédito retroativo; recompensas de conexões já existentes ficam marcadas a zero. Não há loja, compra real ou transferência para contas online.

## Validação

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

Playwright inicia o servidor de produção automaticamente; execute o build antes e deixe a porta 3000 livre. Os projetos cobrem 390×844 com toque e 1440×900 com mouse, navegação por teclado, entrada na mesa, carregamento das 24 peças, referência, reprodução após recarregar, falha/retry do asset, controles de câmera, seleção/arraste/giro das peças em quatro ângulos de câmera, encaixes com câmera girada, montagem completa de 24/48 peças e alinhamento da obra, bolsas e retomada de câmera/guia/inventário, proteção de saves incompatíveis e backup, cancelamento e transição de peça para câmera, arraste da visão, pinça/giro por toque emulado, roda do mouse, rotação de viewport, recarregamento, saída/reentrada e ausência de overflow horizontal. As capturas ficam em `test-results/` (ignorado pelo Git). Para usar Chromium já instalado, informe `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium` ao executar os testes. Não é necessário instalar browsers para os testes unitários.

Para servir manualmente o build: `npm run start`. `npm run test:watch` executa os testes de componentes em modo interativo.

A rota fica em `src/app`; a landing, em `src/components/landing`; a interface da mesa, em `src/components/game`. As transformações puras da câmera ficam em `src/game/core/camera`, a entrada em `src/game/input` e o renderer em `src/game/renderer-pixi`, conforme [arquitetura](docs/03-ARQUITETURA.md). PixiJS é carregado apenas no navegador. A câmera não depende de PixiJS, React ou DOM. As APIs de conta são opcionais e ficam isoladas em src/app/api e src/lib/supabase.

## Contas e cópias privadas — F5.1

**Sua conta** no início (ou em Ferramentas) oferece entrada por código de e-mail quando o servidor está configurado. É possível guardar cópias privadas de 24/48 peças e restaurá-las em outro aparelho com confirmação. A troca arquiva a montagem anterior no histórico local. A sincronização é manual nesta fase: novos movimentos exigem guardar outra cópia.

Câmera, preferências de conforto e moedas ficam no aparelho; backups não criam saldo online. O jogo continua sem login. Sem Supabase configurado, a tela informa a indisponibilidade e não simula uma conta conectada. Migrações, RLS, variáveis e aceites pendentes estão em [supabase/README.md](supabase/README.md).

## Próximos passos

A Fase 0.2 conecta a Vercel após o primeiro build validado e prepara assets licenciados. A Fase 1.1 entrega o canvas, mesa e câmera; a Fase 1.2 acrescenta pinça, rotação por gesto e roda do mouse. A Fase 2.1 entrega a definição determinística, recortes e distribuição inicial de 24 peças. A Fase 2.2 acrescenta seleção, arraste e giro das peças, preservando a navegação da câmera. A Fase 2.3 acrescenta encaixes, grupos rígidos e conclusão do puzzle de 24 peças. A Fase 2.4 acrescenta escolha de 24/48 peças, aproximação da seleção e ajustes de toque/renderização. A Fase 2.5 implementa o guia opcional de posicionamento no tapete. As Fases 3.1 e 3.2 entregam bolsas e autosave local. A soltura passa a considerar a posição final do ponteiro, corrigindo o ajuste no guia quando falta o último evento de movimento. A Fase 4 acrescenta interface compacta, efeitos, preferências e moedas. O próximo marco é validar o MVP em Chrome Android/Safari iOS reais e conferir o deploy Vercel; a base de contas/cópias da F5.1 já está preparada e requer ativação Supabase; depois vem o catálogo na F5.2. Testes em dispositivos reais de iOS/Android continuam necessários quando houver gestos e canvas.

## Organização de entregas

O Codex deve propor PRs pequenos, com resumo do que mudou, testes executados e evidências de como se comporta no mobile. Não iniciar implementações de multiplayer, geração de IA ou Google Drive antes que o núcleo de montagem esteja testado.

## Referências oficiais

- https://nextjs.org/docs/app
- https://pixijs.com/8.x/guides/components/events
- https://vercel.com/docs/plans/hobby
- https://supabase.com/docs/guides/realtime
- https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- https://developers.openai.com/api/docs/guides/image-generation
