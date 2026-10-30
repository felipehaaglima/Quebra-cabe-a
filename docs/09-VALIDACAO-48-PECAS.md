# Validação da Fase 2.4 — 30/10/2026

Workflow: escolher 24 ou 48 peças na abertura, mover/girar, encaixar e concluir o puzzle na mesa. O modo de 24 peças conserva sua definição e distribuição versionadas. O de 48 usa grade 6×8 e tem 82 conexões.

Lint, typecheck, build, 84 testes unitários e 28 testes Playwright passaram. A suíte de navegador montou os puzzles de 24 e 48 peças pela interface, em 390×844 com toque emulado e em 1440×900 com mouse; cobriu conclusão, giro/alinhamento, cancelamento, mudança de orientação, reload e falhas de carregamento/WebGL. Capturas foram conferidas. O teste usa Chromium instalado no ambiente; Android/iOS físicos não foram testados.

## Observação de desempenho

O cenário `escolhe 48 peças e amplia a seleção` aproxima uma peça e envia 32 movimentos, cancelando ao final. Ele coleta `TaskDuration` e `JSHeapUsedSize` pela API Performance do Chromium. A comparação abaixo usa o custo acumulado da thread principal durante essa sequência, antes do cache dos recortes e após a versão final com cache/mipmaps.

| Projeto Chromium | Antes: CPU da sequência | Depois: CPU da sequência | Heap JS depois |
| --- | ---: | ---: | ---: |
| mobile | 3826 ms | 1082 ms | 18.4 MiB |
| desktop | 10036 ms | 3317 ms | 18.1 MiB |

São execuções únicas num ambiente de testes compartilhado, com dois workers, sem isolamento de carga. Esses números não medem FPS, latência individual, memória da GPU nem desempenho em um telefone real. Não estabelecem as metas de 60/30 fps da documentação de UX.

A otimização gera uma textura compacta de cada recorte uma vez, evitando as máscaras por peça em cada movimento. Mipmaps suavizam o zoom reduzido; contornos e hit tests continuam usando a geometria original. As texturas geradas são liberadas ao destruir a cena. Nós de peças são indexados e só são reordenados quando necessário. O renderer já opera sob demanda e mantém o limite de DPR em 2.

Para repetir a coleta, execute o build e `npm run test:e2e -- --grep "escolhe 48" --reporter=list,json`, definindo `PLAYWRIGHT_JSON_OUTPUT_FILE` para o destino do relatório. As métricas são anexadas como `interaction-metrics`. Use `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` apenas quando optar por um Chromium já instalado.

## Limites atuais

O progresso permanece em memória e reinicia ao sair/recarregar. As sacolas são decorativas. O guia opcional por peça no tapete foi planejado como F2.5 e ainda não está ativo. Validar gestos, legibilidade e desempenho em Android e iOS reais permanece necessário.
