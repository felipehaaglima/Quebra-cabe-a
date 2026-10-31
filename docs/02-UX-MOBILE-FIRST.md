# 02 — UX, interações e acessibilidade (mobile-first)

**Regra de projeto:** desenhar a experiência de 360–430 CSS px primeiro, depois adaptar para tablets e desktop. Não esconder uma interface de desktop atrás de menus minúsculos.

## 1. Princípios

- O **tabuleiro domina a tela**. Controles ocupam pouca área útil e somem quando não são necessários.
- Sacolas e peças são **objetos do mundo**; atalhos da interface podem ajudar a alcançá-los, não substituí-los.
- Controles por gesto precisam de feedback e alternativas acessíveis: zoom +/−, botões "girar mesa" e "girar peça".
- Não colocar ações destrutivas perto de controles de navegação.
- Ícones com legenda contextual e ajuda reapresentável; evitar dependência de explicação longa.
- Estados de arrastar, encaixar, armazenar e retirar são visual e semanticamente distintos.

## 2. Layout por dispositivo

### Mobile — retrato (prioridade P0)

- Cena ocupa 100% da área disponível respeitando safe areas de notch/home indicator.
- HUD superior muito compacto: voltar, título (ou menu), progresso e moedas.
- Dock inferior com 2–4 ações: "sacolas", "centralizar", "visão", "configurações". Não cobrir peças com dock opaca grande.
- Sacolas podem ser manipuladas na mesa; modal de conteúdo vira bottom sheet com rolagem própria.
- Para abrir sacola: tocar na própria sacola ou usar botão de lista de sacolas.
- Peça selecionada ganha controle de giro acessível próximo da dock, sem depender de gestos obscuros.

### Mobile — paisagem

- HUD reorganizado lateralmente; tapete e sacolas podem ocupar proporção maior.
- Suportar troca de orientação sem resetar câmera/sessão.
- Aproveitar largura para mostrar bandeja compacta de sacola.

### Tablet

- Controles com mais espaço; painel de sacolas opcionalmente fixo e recolhível.
- Movimentação e zoom iguais ao smartphone.

### Desktop

- Mesma mesa e motor; mouse usa rolagem para zoom na posição do cursor, click+drag em espaço vazio para pan.
- Painel lateral de progresso/sacolas opcional, atalhos documentados, cursor de "grab/grabbing".
- Não forçar interface de aplicativo mobile centralizado em uma coluna estreita.

## 3. Mapeamento de controles

| Intenção | Celular/tablet | Desktop |
| --- | --- | --- |
| Selecionar peça | Toque sobre peça | Clique esquerdo |
| Mover peça/grupo | Arrastar com 1 dedo iniciado sobre peça | Arrastar com botão principal |
| Mover câmera (pan) | Arrastar com 1 dedo iniciado em área vazia, OU 2 dedos em qualquer área | Arrastar área vazia; opção espaço+arrastar |
| Zoom | Pinça com 2 dedos centrada no gesto; botões +/− | Roda do mouse centrada no cursor; botões +/− |
| Rotação da câmera | Gesto de rotação com 2 dedos ou botões dedicados | Botões / teclas opcionais Q e E |
| Rotação de peça | Selecionar + ação "Girar" (90°); gesto opcional futuro | Selecionar + R; botão de peça |
| Guardar na sacola | Arrastar peça solta sobre sacola destacada | Mesma ação |
| Abrir sacola | Tocar sacola; botão de lista se fora da visão | Clique na sacola ou painel |
| Retirar peça da sacola | Tocar peça na bandeja → posicionar na cena com toque/arraste | Arrastar miniatura para mesa |
| Centralizar tapete | Botão "Centralizar" | Botão / tecla Home |
| Desfazer | Botão opcional só para deslocamento, não para recompensas | Ctrl/Cmd+Z se implementado |

**Arbitragem de gestos:**

1. No pointerdown registrar alvo, posição inicial, timestamp e ponteiro.
2. Com 1 ponteiro, travar modo após deslocamento mínimo (ex.: 6–10 CSS px): peça se alvo interativo; câmera se fundo.
3. Ao detectar segundo ponteiro, suspender drag do primeiro e entrar em modo transform de câmera (pan+pinch+rotate).
4. Não realizar snap até pointerup de drag válido e sem segundo ponteiro ativo.
5. Controlar cancelamento por pointercancel, perda de foco e rolagem do sistema.
6. Usar Pointer Events com canvas touch-action: none **apenas na região interativa do jogo**; preservar rolagem/gestos normais em overlays e menus.
7. Camera e peças usam conversão screen/world, jamais coordenadas de viewport armazenadas em saves.

## 4. Câmera e sensação de controle

- Zoom dentro de limites lógicos (ex.: visão geral até 3x/4x; valores calibrados depois), interpolação suave opcional.
- Pinch mantém o ponto sob os dedos estável; rotação preserva ponto focal.
- Pequeno amortecimento em pan; sem inércia exagerada ao arrastar peças.
- Atalho de reenquadramento para nunca "perder a mesa".
- Arrastar perto da borda pode fazer auto-pan com velocidade limitada em desktop e mobile (a partir da segunda iteração).
- Rotação da visão jamais gira os dados permanentes das peças.
- Não redefinir zoom do usuário a cada snap.

## 5. Identidade visual e áudio

**Direção de arte:** jogo cozy, acolhedor e não infantilizado; mesa de madeira, tapete de feltro, sacolas de tecido/papel, luz quente, sombra leve, microanimações suaves, cores de peças fiéis à imagem.

**Som/feedback:**
- Pegar/soltar: som sutil de madeira/papel, com variação discreta.
- Conexão correta: som curto e harmônico, animação de magnetismo e brilho pequeno.
- Moedas: reforço agradável, sem barulho excessivo a cada snap.
- Completar: celebração com opção "pular" e imagem final intacta.
- Mute global, efeitos e música em controles separados.
- Inicializar áudio somente após interação do usuário (restrições de browsers mobile).
- Vibração somente quando compatível e habilitada; nunca necessária para jogar.
- Respeitar prefers-reduced-motion e opção interna para reduzir/desligar partículas.

## 6. Acessibilidade e conforto

- Botões com alvo mínimo de 44×44 CSS px quando viável; sem texto minúsculo.
- Contraste legível para HUD, modais e moedas; estado não comunicado apenas por cor.
- Labels/aria para menus, progresso e ações de sacolas.
- Teclas para zoom, pan, giro, selecionar e encaixar quando viável. **Acessibilidade de manipulação completa via teclado requer projeto e testes específicos**, não presumir que canvas é acessível sozinho.
- Não depender de áudio ou vibração; feedback visual textual alternativo.
- Sem cronômetro forçado, timers de urgência ou recompensa por velocidade na experiência base.
- Modo "foco": minimizar HUD e reduzir ruído visual.
- Fonte com tamanhos escaláveis e legibilidade em 200% quando painéis estiverem abertos.

## 7. Performance — metas iniciais a medir

- Interação fluida no aparelho-alvo; buscar **60 fps em celulares modernos** e degradação aceitável a **30 fps** nos mais limitados (metas, não promessas).
- Configuração de qualidade "automática", limitando DPR efetivo conforme capacidade.
- Culling: não renderizar detalhes de peças muito fora do viewport.
- Texturas e masks compartilhadas/cacheadas quando possível; evitar recriar canvas por frame.
- Não persistir a cada pixel de movimento; debounce/intervalo para autosave; persistir com garantia ao fim do gesto.
- Limitar efeitos e partículas conforme fps.
- Input latency observável, sem main thread bloqueada por recorte complexo.
- Carregar imagens otimizadas; pré-visualização leve, full-res somente quando necessário.
- Testar Chrome Android e Safari iOS reais, não apenas simulador.

## 8. Estados e telas

1. **Landing/Início:** continuar jogo local, iniciar puzzle, configuração de som.
2. **Seleção futura:** catálogo, dificuldade, saldo e preço.
3. **Jogo:** cena com mesa+tapete, HUD mínimo, sacolas e ferramentas.
4. **Bottom sheet de sacola:** nome/etiqueta, contador, miniaturas, ação retirar.
5. **Pause/configurações:** som, animação, qualidade, ajuda/controles.
6. **Conclusão:** pintura final, recompensas e retorno à seleção.
7. **Galeria futura:** puzzles próprios concluídos, colaboradores em cada card.
8. **Sala futura:** participantes, convites, conexão e aviso de sincronização.

## 9. Cenários de teste que bloqueiam release

- Arrastar peça com um dedo e imediatamente adicionar segundo dedo não "teleporta" a peça.
- Com câmera rodada 90°/270°, arrastar/snap funcionam nas posições certas.
- Sacola acessível mesmo longe do centro do tabuleiro ou após pan extremo.
- Em iPhone com safe area, botões e peças não ficam permanentemente inacessíveis.
- Ao tocar numa peça ao lado do botão "girar", o gesto não ativa a HUD inadvertidamente.
- Reduzir movimento e mutar som não afeta regras/recompensas.
- Orientação portrait ↔ landscape preserva montagem.
- Ao perder conexão (fase multiplayer), indicar offline sem descartar alterações locais não confirmadas.

## Interface implementada na Fase 4

A mesa recebe a maior parte da altura inicial. A dock mantém Bolsas, Guia, Ver imagem e Ferramentas; o painel de Ferramentas reúne visão, busca por peça, conforto, ajuda, backup e nova montagem, com rolagem própria. A seleção mostra giro/encaixe/desmarcar numa faixa fixa junto à dock, sem cobrir as peças. Progresso e saldo ocupam uma linha discreta. Dicas ficam em overlay, sem mudar o enquadramento. Saves com erro mantêm aviso visível fora do painel. A referência é recolhível, sem modal bloquear a mesa.

Mute, volume, movimento reduzido e qualidade ficam persistidos por puzzle. O sistema pode reduzir movimento independentemente da preferência interna. A celebração não bloqueia a mesa e pode ser dispensada; o jogador escolhe alinhar/enquadrar a obra no tapete. Nova montagem pede confirmação separada dos controles da mesa e preserva moedas/preferências. Validar em dispositivo físico continua requisito de release.

## Guia com reservas neutras (31/10/2026)

O padrão de uma montagem nova é guia ligado. A malha mostra apenas reservas retangulares proporcionais à base das peças, sem imagem ou saliências que revelem respostas. Selecionar uma peça não ilumina seu destino. Arrastar sobre uma célula a deixa amarela tanto para tentativas certas quanto erradas. O texto diz apenas para soltar e tentar, sem dica de proximidade ou orientação correta. A referência Ver imagem continua opcional e separada.

Soltar sobre o tapete confirma apenas células e orientação canônicas; falhar devolve ao estado anterior. Peças retiradas de bolsas carregam uma origem pendente até confirmar a colocação, guardar novamente ou abandonar o guia; tentativa inválida/cancelada retorna à bolsa. Fora do tapete, a pessoa pode confirmar uma nova posição de organização. Essa confirmação encerra a origem anterior. Câmera/zoom não alteram reservas.
