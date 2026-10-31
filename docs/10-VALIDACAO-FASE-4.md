# Validação da Fase 4 — 31/10/2026

A entrega implementa F4.1/F4.2 e o polimento/validação automatizada de F4.3. O aceite físico do MVP permanece pendente.

## Resultado e experiência

No estado inicial, o canvas ocupa mais de 70% da altura em 390×844 e 1440×900, verificado por Playwright. A dock mantém quatro ações. Girar/encaixar/desmarcar aparecem somente com seleção numa faixa de altura estável, fora da área das peças. Visão, seleção por lista, conforto, ajuda, backup e nova montagem ficam no painel recolhível com rolagem própria. Dicas não redimensionam a câmera. Avisos de falha no save continuam visíveis sem abrir o painel.

Sons são síntese original curta, sem samples, loops ou rede. Web Audio só inicializa após interação; indisponibilidade não bloqueia o jogo. Brilho/partículas duram no máximo 900 ms e são suprimidos por movimento reduzido do sistema/interno ou qualidade econômica. A celebração é dispensável e não reaparece no restore. Alinhar no tapete mantém a obra manipulável.

Moedas: +1 por conexão canônica única, bônus +20/+30, saldos máximos 58/112 por definição. Restart preserva ledger, saldo e preferências; não permite repetir recompensas. Saves v1/v2 migram preservando a montagem, sem prêmio retroativo. O saldo é local por puzzle, sem valor financeiro ou wallet online.

## Checks executados

- `npm run lint`, `npm run typecheck`, 114 testes unitários e `npm run build`: aprovados.
- Suíte completa Playwright: 46 aprovados em Chromium, dois workers, mobile touch emulado e desktop mouse. Montagem completa de 24/48 peças e reload com saldos 58/112; grupos, guia, câmera, bolsas, cancelamento, resize e tratamento de erros.
- Após evitar renders extras quando não há brilho ativo, build/checks repetidos e seis cenários de preferências/restart/conclusão com efeitos reaprovados.
- Dois cenários adicionais com DPR 3: resolução automática limitada a 2, econômica a 1, preferência restaurada e inventário inalterado. São 48 cenários distintos validados no total; os dois adicionais foram executados separadamente.
- Áudio: testes com contexto controlado cobrem início após gesto, mute/volume, limite de vozes e liberação; navegação real cobre degradação e fluxos com/sem efeitos. Não houve audição por uma pessoa neste ambiente.
- Migração e economia: testes unitários montam ambas as dificuldades duas vezes, passam por restore/restart e confirmam ausência de duplicação. Incluem ledger antigo a zero e ações que não pagam moedas.

Capturas conferidas em mobile/desktop: mesa inicial, preferências, bolsas, grupos e conclusão. O diretório `test-results/` é ignorado pelo Git. O workflow existente executa qualidade/build/Playwright em push/PR, com dois workers e artefatos de falhas por sete dias; resultado remoto precisa ser observado após o push.

## Aceite físico e deploy pendentes

1. Em Chrome Android e Safari iOS reais, iniciar/continuar sem conta; mover, girar, usar dois dedos, cancelar e alternar retrato/paisagem. Conferir safe areas e legibilidade.
2. Ouvir sons, mudar mute/volume, usar redução de movimento e qualidade econômica. Confirmar conforto e fluidez no aparelho, sem inferir FPS a partir da emulação.
3. Conferir no deploy Vercel a versão integrada, restauração do progresso, conclusão e nova montagem. A URL/estado do deploy não foi verificado neste ambiente.

A validação automatizada não substitui esses itens. Login, catálogo/loja, backend, Drive e multiplayer continuam fora desta entrega.

## Evolução posterior do guia

Este registro descreve a entrega original da Fase 4. Em seguida, a pedido do usuário, o guia passou a reservas neutras sem imagem, padrão ligado em novas montagens, amarelo apenas na tentativa e retorno à origem/bolsa ao falhar. O snapshot evoluiu para v4 para preservar origem de bolsas após reload. A regra atual está em `docs/04-MOTOR-DE-JOGO.md` e `docs/05-DADOS-E-ECONOMIA.md`.
