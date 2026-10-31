# 08 — Decisões técnicas, riscos e hipóteses

**Data-base:** 30/10/2026. Este documento registra o que foi decidido a partir da visão inicial, o que é hipótese de engenharia e o que precisa ser validado com jogo real. **Não interpretar estimativas como garantias comerciais.**

## 1. Decisões adotadas agora

| ID | Decisão | Justificativa |
| --- | --- | --- |
| ADR-001 | Priorizar **mobile-first**, adaptar ao desktop | Gestos do usuário devem orientar gameplay e UI desde o início |
| ADR-002 | Mesa virtual **2D com profundidade simulada**, não 3D pleno | Acelera MVP, reduz consumo gráfico e melhora controle |
| ADR-003 | **Next.js + TypeScript** para site/BFF | Integra com Vercel e permite escalar UI e API |
| ADR-004 | **PixiJS v8** para tabuleiro | Render eficiente de muitas peças, máscaras e transforms |
| ADR-005 | Motor de puzzle em **TS puro** | Testabilidade, replay, compatibilidade com futuro servidor |
| ADR-006 | Primeiro **local-first** (IndexedDB) | Jogo começa rápido, sem login, banco nem custos de rede |
| ADR-007 | **Supabase** quando precisar de conta/nuvem | Auth, Postgres, Storage, Realtime e políticas de acesso |
| ADR-008 | Monetização de moedas **somente após gameplay local** | Evita criar economia e infraestrutura antes de existir diversão |
| ADR-009 | IA **não gera as peças individualmente**, gera imagem-base | Coerência visual, determinismo e redução de custo |
| ADR-010 | Drive é **backup/exportação opcional**, não banco central | Evita conflitos e dependência de OAuth para multiplayer |
| ADR-011 | Multiplayer de **1 dono + até 3 ajudantes** | Alinha regra de autoria e reduz concorrência inicial |
| ADR-012 | **Galeria pertence ao dono**, colaboradores são referenciados | Propriedade e participação são conceitos separados |
| ADR-013 | **Vercel após o primeiro build funcional** | Evita deploy quebrado de um repo vazio |
| ADR-014 | **Nenhum dinheiro real no MVP** | Mantém economia como sistema de progressão, sem pagamentos ou obrigações adicionais |
| ADR-015 | Conclusão reconhecida ao unir todas as peças e conexões, com alinhamento ao tapete opcional | Permite montar em qualquer lugar; a ação Alinhar obra restaura posição e orientação do tapete sem alterar conexões |
| ADR-016 | Guia opcional no tapete, sem travar ou redimensionar peças | Mostra a referência e ajusta grupos próximos a 0°; preservar montagem livre, cancelamento e conexões únicas |

## 2. Perguntas de produto abertas — não bloqueiam a Fase 0

1. **Nome final e marca:** "Quebra-cabeça" é provisório; nome do repositório é Quebra-cabe-a.
2. **Aparência das sacolas:** papel, tecido, caixas ou múltiplos cosméticos; regra funcional é maior prioridade.
3. **Como girar peças:** quartos de volta com botão/tecla R no MVP; giro livre apenas se testes provarem que melhora, sem comprometer snap.
4. **Conclusão e tapete:** F2.3 adota alinhamento opcional por botão após reconhecer a montagem (ADR-015); validar a experiência em playtest.
5. **Quantas peças iniciais:** protótipo em 24; testar 48; 100+ em fases posteriores.
6. **Preço e prêmio das moedas:** números ilustrativos, ajustar para valor percebido e dificuldade.
7. **Moedas dos ajudantes:** progressão compartilhada, recompensa individual por contribuição ou somente ao dono? Decidir antes de multiplayer.
8. **Visibilidade da galeria:** privada por padrão; opção pública/compartilhamento após controles de segurança.
9. **Upload de fotos próprias:** funcionalidade desejável, mas ainda não confirmada para primeira versão online.
10. **Google Drive:** começar por backup de progresso, imagem final exportada ou ambos? Documento de integrações prevê ambos, entregar em fases se necessário.
11. **IA personalizada:** catálogo curado primeiro; geração on-demand depende de modelo econômico e segurança.
12. **Persistência offline PWA:** IndexedDB no MVP, suporte PWA completo em momento posterior.

## 3. Riscos prioritários e mitigação

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Gestos de peça conflitam com navegação da câmera | Muito alto | Testar pointer arbitration no smartphone na Fase 1; cancelar drag ao entrar segundo dedo |
| Render de máscaras e centenas de peças consome memória | Alto | Pixi, culling, cache de máscaras, quality presets, teste em celular real |
| Geometria com tabs não corresponde entre vizinhos | Alto | Gerar aresta uma vez, usar pares complementares e teste de reconstrução |
| Peças somem ou teletransportam após refresh | Muito alto | Invariantes do motor, autosave versionado e migração |
| Moedas são duplicadas por snap repetido | Alto | IDs únicos de conexão e ledger idempotente |
| Recompensas online são fraudadas via cliente | Muito alto | Validação servidor e transação; sem confiar em claims do browser |
| Multiplayer perde sincronismo | Alto | Revisions, leases, commits autoritativos e resync por snapshot |
| Geração por IA se torna financeiramente inviável | Alto | Catálogo pronto, quota, moderação, budget, cache, job queue |
| Fotos/nomes de usuários ficam públicos sem consentimento | Muito alto | Privado por padrão, RLS, autorização, consentimento e exclusão |
| Google Drive vira fonte de conflitos | Médio/alto | Usar backup/exportação, checagem de revisão e sem overwrite automático |
| Plano de hospedagem gratuito bloqueia negócio | Médio/alto | MVP pessoal sem monetização, rever termos antes de uso comercial |
| Agente tenta desenvolver tudo de uma vez | Alto | AGENTS.md e roadmap com PRs pequenos, aceites objetivos |

## 4. Custos e hospedagem

### MVP 0.1 (pessoal, sem usuários em escala)

- **Vercel Hobby:** pode hospedar Next.js com deploy GitHub; é voltada a projetos pessoais não comerciais e tem quotas/limites. Confirmar elegibilidade no momento do deploy.
- **Sem banco remoto:** Dexie/IndexedDB no navegador.
- **Sem IA ativa:** catálogo demo com imagens cujos direitos estejam claros.
- **Sem autenticação:** entrar no puzzle sem cadastro.
- **Sem Realtime:** custo de rede quase nulo além de assets/app.

**Não afirmar custo garantido de R$0 para uso comercial ou tráfego arbitrário.** Domínio próprio, assets pagos, observabilidade e armazenamento futuro podem gerar despesa.

### Depois do MVP

| Serviço | O que consome | Como controlar |
| --- | --- | --- |
| Supabase Database | storage, requests, backup e computação | snapshots raros, índices, retenção |
| Supabase Storage | imagens originais, miniaturas, egress | compressão, assets por checksum, política de cache |
| Realtime | mensagens/presença e conexões | throttle drag, salas pequenas, snapshots |
| API de geração de imagem | tokens/resolução/qualidade, chamadas | quota, caching, budget server-side |
| Vercel | Functions, bandwidth, builds | observabilidade e upgrades conforme uso |
| Google Cloud OAuth/Drive | autenticação, quotas e política de app | escopo mínimo, sincronização por demanda |

Links de referência:
- https://vercel.com/docs/plans/hobby
- https://supabase.com/docs/guides/realtime
- https://developers.openai.com/api/docs/guides/image-generation
- https://developers.google.com/workspace/drive/api/guides/api-specific-auth

## 5. Métricas de sucesso (definir depois de testes)

**Experiência:**
- Tempo até começar a montar sem cadastro.
- Percentual de sessões que chegam ao primeiro encaixe.
- Percentual de pessoas que consegue concluir puzzle de 24 peças.
- Quantidade de erros de drag/pan, peças perdidas e problemas com sacolas.
- Estabilidade de FPS em aparelhos-alvo e tempo de carregamento.

**Continuidade:**
- Taxa de saves restaurados corretamente.
- Pessoas que retornam à montagem após pausar.
- Progressão sem duplicidade de moedas.

**Fases futuras:**
- Taxa de conclusão multiplayer com 2–4 participantes.
- Integridade de contribuições e idempotência.
- Custo de infraestrutura por usuário ativo e por puzzle IA.
- Taxa de falhas ao restaurar Drive.

Coletar métricas com privacidade, sem enviar conteúdo de imagens privadas ou eventos detalhados desnecessários.

## 6. Critério de revisão das decisões

Reavaliar este arquivo quando:
- Um teste com jogadores mostrar dificuldade de controles ou de diversão.
- A performance em celulares não atingir o mínimo confortável.
- Novos serviços pagos ou monetização entrarem no produto.
- A regra de contribuição/autoria for negociada.
- Uma implementação exigir mudança de stack ou modelo de persistência.

A decisão revisada deve registrar motivo, impactos e plano de migração.

## 7. Não-objetivos da arquitetura inicial

- Microserviços, Kafka, filas distribuídas para drag de peças.
- Gerar asset por IA a cada movimento/encaixe.
- Ambiente multi-região, escalonamento complexo sem usuários reais.
- 3D fotorealista ou física completa.
- Dados de progressão financeiros no navegador como fonte oficial após ativar contas.
- Obrigatoriedade de usar Google Drive para jogar.

## Bolsas e persistência local — F3.1/F3.2 (30/10/2026)

- Escopo conjunto autorizado pelo usuário. Bolsas guardam somente peças soltas; o inventário continua no modelo canônico, com associação à bolsa e exclusão do hit test/snap enquanto guardadas.
- Um save por definição/dificuldade, validado com Zod e revisão transacional. Dados incompatíveis e conflitos de outra aba bloqueiam sobrescrita; backup JSON permanece disponível. Não há sincronização de abas ou importação nesta fase.
- Transformações são persistidas em world space; zoom da câmera é relativo ao enquadramento, preservando resize. Não persistir o estado intermediário de um gesto cancelável.
- Pointerup fornece a posição final da peça antes do commit, mesmo se faltar pointermove. Correção coberta por regressão unitária e navegador touch/mouse; teste físico iOS/Android permanece pendente.

Validação desta entrega: lint, typecheck, 107 testes unitários, build de produção e 40 testes Playwright passaram. Viewports: 390×844 com toque emulado e 1440×900 com mouse. Inclui bolsas em ambas as dificuldades, montagem completa e retomada, câmera/guia, soltura sem último movimento, cancelamentos, inventário integral, migração e conflito de revisão (unitários), save incompatível preservado e download de backup (navegador). Capturas em `test-results/` (não versionadas). Teste físico em Android/iOS e sincronização entre dispositivos continuam pendentes.

## Fase 4 — UI, feedback e economia local (31/10/2026)

Escopo completo autorizado pelo usuário. Prioridade de UI: mesa dominante, quatro atalhos, controles contextuais e ferramentas recolhidas. Feedback visual é finito, sem ticker contínuo, desabilitado por movimento reduzido do sistema/interno ou qualidade econômica. Áudio procedural original (proveniência em `public/audio/LICENSE.md`), opcional e iniciado após gesto; sem música ou serviço online.

Recompensas ficam no motor puro e ledger do snapshot v3, jamais no renderer. +1/conexão; bônus configurado +20/+30. Ledger por definição atravessa nova montagem para impedir farming; saldos de 24/48 são independentes. Migração marca conexões antigas como premiadas com valor zero, sem gerar moeda retroativa. Novo puzzle reinicia a mesma definição determinística, com confirmação, mantendo preferências/saldo/ledger. Não adiciona catálogo, wallet global ou backend.

A implementação da F4.3 não equivale à aprovação de release em aparelhos reais. Chromium emulado não comprova Safari iOS/Chrome Android físicos, qualidade sonora nem FPS em celulares. CI existente foi ajustada para dois workers; sua execução remota e o deploy Vercel precisam ser conferidos após push.
