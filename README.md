# Quebra-cabeça — jogo cozy, mobile-first

> **Status em 30/10/2026:** Fase 2.2 implementada: mesa navegável com 24 peças recortadas do puzzle Lago sereno. **As peças já podem ser selecionadas, arrastadas e giradas; encaixes e salvamento ainda não estão implementados.**

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
| [Orientações para agentes](AGENTS.md) | Regras para Codex/assistentes que implementarem o projeto |

## Stack e arquitetura

- **Fundação instalada:** Next.js 16 (App Router), React 19, TypeScript estrito e Tailwind CSS 4.
- **Testes instalados:** Vitest + Testing Library e Playwright.
- **Renderização instalada:** PixiJS v8 com WebGL, isolado em componente client-only e carregado sob demanda.
- **Demais camadas abaixo:** planejadas para as próximas fases.
- **Estilos/componentes:** Tailwind CSS + componentes acessíveis; ícones Lucide.
- **Estado local do jogo:** Zustand; persistência IndexedDB via Dexie.
- **Validação e testes:** Zod, Vitest, Testing Library, Playwright (mobile/desktop).
- **Contas e backend futuro:** Supabase Auth, Postgres, Storage e Realtime; APIs seguras via Route Handlers da Next.js.
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

Use Node.js 24 LTS (`nvm use`, se disponível) e npm. Nenhuma variável de ambiente, conta ou serviço externo é necessário.

```sh
npm ci
npm run dev
```

Abra a porta 3000 no seu ambiente local. O botão **Iniciar** abre `/play`, com uma mesa navegável em PixiJS v8. Arraste uma peça com um dedo ou mouse para movê-la; arraste uma área vazia para mover a visão. Com dois dedos, mova, faça pinça para zoom e gire a mesa ao redor do ponto entre os dedos. A roda do mouse amplia no cursor. Os botões oferecem zoom, giro de 90° e centralização como alternativa. Ao focar o canvas, as setas movem a peça selecionada (ou a visão se não houver seleção), +/− ampliam/reduzem, R gira a peça selecionada (ou a mesa), Escape desmarca e Home centraliza. A lista **Selecionar peça** e o botão **Girar peça** oferecem alternativas por teclado/toque. A mesa, o feltro 4:3 e as sacolas decorativas são desenhados proceduralmente. As 24 peças usam uma ilustração vetorial original 800×600, [Lago sereno](public/puzzles/demo/lago-sereno-v1.svg), dedicada a CC0 com [licença registrada](public/puzzles/demo/LICENSE.md). **Ver imagem** abre a referência. A peça selecionada ganha contorno dourado e vem para a frente. O contorno inteiro fica limitado à mesa. Cancelar um arraste, perder foco, redimensionar a tela ou iniciar um gesto com dois dedos desfaz o movimento em andamento; girar com R confirma a posição atual. Encaixes, áudio e persistência ainda não estão implementados. A câmera é temporária: recarregar ou sair da mesa restaura a visão inicial. O enquadramento inicial mostra as peças ao redor do tapete; o pan alcança toda a mesa. Recortes e posições iniciais são reproduzíveis pela seed, sem novo sorteio ao recarregar. **Movimentos desta etapa são temporários e voltam à distribuição inicial ao recarregar ou sair.** É necessário WebGL disponível no navegador; falhas de inicialização mostram uma mensagem com opção de tentar novamente.

## Validação

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

Playwright inicia o servidor de produção automaticamente; execute o build antes e deixe a porta 3000 livre. Os projetos cobrem 390×844 com toque e 1440×900 com mouse, navegação por teclado, entrada na mesa, carregamento das 24 peças, referência, reprodução após recarregar, falha/retry do asset, controles de câmera, seleção/arraste/giro das peças em quatro ângulos de câmera, cancelamento e transição de peça para câmera, arraste da visão, pinça/giro por toque emulado, roda do mouse, rotação de viewport, recarregamento, saída/reentrada e ausência de overflow horizontal. As capturas ficam em `test-results/` (ignorado pelo Git). Para usar Chromium já instalado, informe `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium` ao executar os testes. Não é necessário instalar browsers para os testes unitários.

Para servir manualmente o build: `npm run start`. `npm run test:watch` executa os testes de componentes em modo interativo.

A rota fica em `src/app`; a landing, em `src/components/landing`; a interface da mesa, em `src/components/game`. As transformações puras da câmera ficam em `src/game/core/camera`, a entrada em `src/game/input` e o renderer em `src/game/renderer-pixi`, conforme [arquitetura](docs/03-ARQUITETURA.md). PixiJS é carregado apenas no navegador. A câmera não depende de PixiJS, React ou DOM; nenhum serviço de backend foi adicionado.

## Próximos passos

A Fase 0.2 conecta a Vercel após o primeiro build validado e prepara assets licenciados. A Fase 1.1 entrega o canvas, mesa e câmera; a Fase 1.2 acrescenta pinça, rotação por gesto e roda do mouse. A Fase 2.1 entrega a definição determinística, recortes e distribuição inicial de 24 peças. A Fase 2.2 acrescenta seleção, arraste e giro das peças, preservando a navegação da câmera. O próximo passo é a Fase 2.3: encaixes válidos e grupos que se movem juntos. Testes em dispositivos reais de iOS/Android continuam necessários quando houver gestos e canvas.

## Organização de entregas

O Codex deve propor PRs pequenos, com resumo do que mudou, testes executados e evidências de como se comporta no mobile. Não iniciar implementações de multiplayer, geração de IA ou Google Drive antes que o núcleo de montagem esteja testado.

## Referências oficiais

- https://nextjs.org/docs/app
- https://pixijs.com/8.x/guides/components/events
- https://vercel.com/docs/plans/hobby
- https://supabase.com/docs/guides/realtime
- https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- https://developers.openai.com/api/docs/guides/image-generation
