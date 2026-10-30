# Quebra-cabeça — jogo cozy, mobile-first

> **Status em 30/10/2026:** projeto em fase de planejamento. Este repositório contém o blueprint de produto e engenharia; **não contém ainda um jogo implementado**.

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

## Stack escolhida (proposta, não instalada)

- **Frontend/BFF:** Next.js (App Router) + TypeScript + React.
- **Renderização do tabuleiro:** PixiJS v8 (canvas 2D/WebGL/WebGPU conforme suporte), isolado da UI React.
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

## Como começar a implementar

1. Solicitar ao Codex a **Fase 0** em [docs/07-ROADMAP.md](docs/07-ROADMAP.md), seguindo [AGENTS.md](AGENTS.md).
2. Criar e validar o esqueleto Next.js e os comandos lint, typecheck, test e build.
3. Importar o repositório na Vercel depois do primeiro build bem-sucedido.
4. Trabalhar em branches e PRs; verificação visual em viewport de celular e desktop antes de aceitar mudanças.
5. Passar à primeira vertical slice: uma mesa com uma peça arrastável e câmera navegável.

> **Importante:** este README não afirma que os comandos de desenvolvimento já existem. Eles serão adicionados na Fase 0.

## Organização de entregas

O Codex deve propor PRs pequenos, com resumo do que mudou, testes executados e evidências de como se comporta no mobile. Não iniciar implementações de multiplayer, geração de IA ou Google Drive antes que o núcleo de montagem esteja testado.

## Referências oficiais

- https://nextjs.org/docs/app
- https://pixijs.com/8.x/guides/components/events
- https://vercel.com/docs/plans/hobby
- https://supabase.com/docs/guides/realtime
- https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- https://developers.openai.com/api/docs/guides/image-generation
