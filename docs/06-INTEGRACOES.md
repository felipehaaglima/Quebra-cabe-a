# 06 — Multiplayer, IA e Google Drive

**Fases posteriores ao MVP local.** Planejar as integrações agora, mas só implementá-las depois de validar a experiência principal de montagem em mobile e desktop.

## A. Multiplayer cooperativo: dono + até 3 ajudantes

### 1. Objetivo

Quatro pessoas, em dispositivos diferentes, montam **a mesma sessão** do puzzle simultaneamente. Cada participante tem sua própria câmera (zoom/pan/rotação). O dono mantém a propriedade da montagem; os ajudantes recebem créditos de participação. A obra concluída fica na **galeria do dono**.

### 2. Modelo de salas

- Session.ownerId: usuário que inicia e possui o puzzle.
- Até 3 SessionMember ativos com role helper; total máximo 4 (dono + 3).
- Convidar por URL protegida com token de uso restrito, expiração e revogação; preferir login para registrar créditos.
- Presence indica online/offline; desconexão libera locks após timeout sem excluir participação.
- Dono pode remover ajudante e revogar convites; controles de abuso e privacidade.
- A sessão persiste mesmo sem ninguém online; reentrar recupera snapshot.
- Acesso a imagens privadas respeita ownership e membership, nunca basta adivinhar ID de sessão.

### 3. Estratégia de sincronização

Usar **Supabase Realtime** em canais privados com autorização + RLS.

| Informação | Canal e regra |
| --- | --- |
| Quem está online, nomes/avatares, status | Presence |
| Movimento *provisório* da peça durante drag | Broadcast efêmero com throttling |
| Seleção/trava de peça ou grupo | Comando ao servidor para adquirir lease curto |
| Soltar/rotacionar/gravar peça e snap | Comando autenticado validado no servidor |
| Encaixe confirmado, atualização da sacola e revisão | Evento autoritativo → Broadcast |
| Estado após reconnect | Fetch snapshot/revision + eventos desde revisão |
| Saldo e galeria | Banco e endpoints autorizados, nunca Presence/Broadcast |

**Importante:** Broadcast simples de cliente para cliente **não** garante correção nem segurança. O servidor (Route Handler + Postgres/RPC transacional ou backend dedicado futuro) decide snaps e commits. Cliente pode antecipar animação, mas reconcilia com resposta oficial.

### 4. Peça sendo arrastada simultaneamente

1. Usuário A faz pointerdown → pede lease para grupo G.
2. Servidor concede lease se não há outro dono de lease ativo; guarda ownerActor, token, expiresAt e revision.
3. Usuário A manda posição visual temporária limitada por taxa (não persistente).
4. Usuário B vê a peça em movimento, mas não pode agarrá-la; recebe explicação visual discreta.
5. Ao soltar, A envia comando final com leaseToken, baseRevision, posição/rotação; servidor valida, aplica snaps e persiste; envia novo revision.
6. Ao desconectar ou exceder prazo, servidor libera lease; último estado confirmado permanece válido.
7. Duplicatas e mensagens atrasadas são ignoradas pelo par (commandId, revision).
8. Se tentativas simultâneas conflitarem, um comando é rejeitado e a UI reanima até o último snapshot confirmado.

Não fazer transação SQL para cada pixel de drag. Broadcast do drag pode ser limitado a ~10–20 updates/s como hipótese a medir.

### 5. Protocolo sugerido

~~~ts
type MultiplayerCommand = {
  commandId: string; // UUID idempotente
  sessionId: string;
  actorId: string;   // derivado pelo servidor do auth, não confiável do payload
  baseRevision: number;
  action:
    | { kind: "acquireGroupLease"; groupId: string }
    | { kind: "releaseGroup"; groupId: string; x: number; y: number; rotation: 0 | 1 | 2 | 3; leaseToken: string }
    | { kind: "moveToBag"; pieceId: string; bagId: string }
    | { kind: "renameBag"; bagId: string; label: string };
};

type MultiplayerCommit = {
  sessionId: string;
  revision: number;
  eventId: string;
  actorId: string;
  changedGroupIds: string[];
  newConnectionIds: string[];
  completed: boolean;
};
~~~

Em cada mutação o backend deve derivar actorId da identidade autenticada; nunca aceitá-lo como prova de autorização. O protocolo é referência a refinar.

### 6. Contribuição e galeria

- Na conexão nova válida, armazenar actorId do responsável pelo encaixe. Assistência na movimentação pode ser contabilizada separadamente (não inflar contribuições).
- Uma única galeria de propriedade: galleryEntry.ownerId = session.ownerId.
- Contributor references ligam participantes, contribuições e participação à obra do dono; devem suportar consentimento/privacidade do nome/avatar.
- O ajudante pode ter aba separada "Montagens em que ajudei", sem tornar o puzzle seu.
- Antes de expor galeria publicamente, permitir configurações de visibilidade "privado / link / público" conforme futuras decisões.

### 7. Testes multiplayer

- Quatro pessoas conectam; quinta pessoa recebe sala cheia ou entra como espectador somente se recurso existir.
- Dois usuários tentando mover mesmo grupo nunca criam estado divergente.
- Desconectar durante drag não perde grupo nem mantém lock eterno.
- Usuários com câmeras em ângulos distintos veem o mesmo estado canônico.
- Refresh recupera snapshot e revisões subsequentes sem repetir moedas.
- Visitante não convidado não vê sala ou imagens.
- A conclusão aparece só na galeria do dono, mantendo créditos dos três ajudantes.

## B. Integração com Google Drive

### 1. Escopo de negócio

Usuário poderá **conectar sua conta Google Drive** para guardar backups das montagens e, opcionalmente, exportar a imagem final da obra. Não usar Drive como banco transacional nem como substituto da sincronização colaborativa.

### 2. Dois modos de integração

1. **Backup privado da aplicação:** arquivos versionados de definição + snapshot + metadados no **appDataFolder**, usando scope limitado de dados do app. Usuário não navega normalmente esses arquivos na interface do Drive.
2. **Exportação visível na pasta do usuário:** PNG/WebP da obra concluída e/ou backup explicitamente escolhido pelo usuário, usando permissões limitadas (por exemplo, drive.file) e seletor de destino compatível.

São experiências diferentes. A primeira é restauração invisível no app; a segunda atende "quero o quebra-cabeça montado na minha pasta do Drive". Oferecer as duas separadamente, com consentimento.

### 3. Fluxo

~~~text
Usuário → Configurações → Conectar Google Drive
  → OAuth consent (escopos mínimos, redirect validado)
  → salvar conexão/refresh token de forma segura no backend, criptografado
  → escolher backup automático ou manual
  → construir export versionado de sessão validada
  → upload para Drive (appDataFolder) OU export explícito de imagem para pasta visível
  → registrar checksum, versão, horário e resultado
  → permitir testar restauração e desconectar/revogar
~~~

- Em modo visitante local, backup manual só é possível depois de autenticar a conta Google ou exportar arquivo local.
- Não anexar credenciais, dados confidenciais ou tokens aos exports.
- Validar tamanho, versão e integridade dos snapshots antes de restaurar.
- Se a conexão cair, manter sessão normal na plataforma e indicar backup pendente.
- Não sobrescrever automaticamente uma montagem mais nova por versão antiga do Drive.
- O usuário poderá revogar acesso e apagar backups conforme opções de privacidade; excluir conexão local não necessariamente apaga arquivos que ele exportou.
- Analisar verificação do app OAuth pelo Google quando o produto for disponibilizado publicamente.

Documentação oficial: https://developers.google.com/workspace/drive/api/guides/api-specific-auth

## C. Imagens de puzzles geradas por IA

### 1. Objetivo

Gerar **imagem base** para catálogo ou pedido do usuário, com estilo agradável, riqueza de detalhes e composição apropriada a quebra-cabeças. Depois o motor gera peças determinísticas.

### 2. Pipeline de produto

~~~text
Criar puzzle (admin / usuário elegível)
  → validar prompt + escolher categoria, proporção e dificuldade
  → autorizar custo/limite diário de gerações
  → criar job (idempotencyKey + status pending)
  → gerar imagem por API (chave somente servidor)
  → moderação/verificação de política/licença
  → converter/comprimir imagem + criar thumbnails
  → gravar asset imutável em Storage e checksum
  → definir puzzleDefinition (seed, grade, geometria)
  → publicar catálogo (manual no início)
  → criar sessões jogáveis
~~~

### 3. Regras de engenharia

- Criar interface ImageGenerationProvider com adaptadores, não acoplar a interface do jogo a um modelo específico.
- Configuração externa dos modelos e preços (atualizar periodicamente; API tem custo variável).
- Chamada **server-only**; jamais expor a chave no navegador ou em git.
- Usar limites por usuário, quota, créditos, idempotência e orçamento máximo diário.
- Cachear e reutilizar assets; **não** gerar cada vez que alguém inicia o mesmo puzzle.
- Guardar hash, proporção, resolução, origem, custos estimados e realizados, status de moderação e direitos de distribuição.
- Para geração demorada, usar fila/worker durável; **não presumir** que uma função Vercel gratuita conseguirá processar toda geração dentro do timeout.
- Redimensionar imagem sem perder consistência das peças; ao publicar puzzle, asset e versão não mudam.
- Identificar visivelmente conteúdos gerados por IA quando apropriado; impedir conteúdo ilegal, infringente ou indevido.
- Imagens privadas feitas por usuários não entram automaticamente no catálogo público.

### 4. Interface TypeScript ilustrativa

~~~ts
type ImageGenerationRequest = {
  prompt: string;
  style?: "cozy" | "nature" | "illustration" | "custom";
  aspectRatio: "1:1" | "4:3" | "3:4";
  idempotencyKey: string;
};

type GeneratedAsset = {
  storagePath: string;
  sha256: string;
  width: number;
  height: number;
  provider: string;
  model: string;
  estimatedCostUsd?: number;
};

interface ImageGenerationProvider {
  generate(req: ImageGenerationRequest): Promise<GeneratedAsset>;
}
~~~

### 5. Economia e IA

- Começar com **catálogo curado**; só depois liberar geração personalizada.
- Não prometer geração ilimitada gratuita; custo de imagem é variável e pode superar facilmente receita por usuário.
- Avaliar moeda de gameplay para desbloquear puzzles do catálogo; **não assumir que moedas gratuitas financiarão gerações ilimitadas**.
- Geração sob demanda precisa de quotas e modelo econômico separado (limites/direitos), ainda a definir.
- Títulos e prompts gerados não devem ser aceitos como comandos do servidor; tratar como dados não confiáveis.

Referência: https://developers.openai.com/api/docs/guides/image-generation

## D. Fronteiras de custo e privacidade

- MVP sem IA paga, Drive ou backend remoto pode começar quase sem custo, sujeito aos limites do host.
- Reavaliar termos da Vercel Hobby antes de uso comercial (loja monetizada, publicidade ou operação comercial).
- Banco, Storage, Realtime, geração de IA e tráfego têm quotas distintas; medir custo por puzzle e sessão.
- Pedir consentimento para Drive, links públicos, galeria compartilhada, processamento de fotos e nomes dos colaboradores.
- Não registrar tokens OAuth, prompts sensíveis nem fotos privadas em logs desnecessários.
- Política para exclusão de conta, reembolso de moedas adquiridas no app (se no futuro houver dinheiro real), dados pessoais e retenção de backups.

## E. Ordem de implementação

1. **Primeiro** motor e save local → sem rede.
2. **Depois** contas e sincronização de saves → estados online confiáveis.
3. **Depois** loja/galeria e economia autoritativa → bancos e RLS maduros.
4. **Depois** multiplayer cooperativo → locks, revisões e atribuição.
5. **Depois** geração de imagens por IA com controle de orçamento.
6. **Depois ou paralelamente à galeria online** backup/exportação para Drive, após validação OAuth.

A ordem entre Drive e geração de IA é flexível; ambos dependem de modelo de dados estável.
