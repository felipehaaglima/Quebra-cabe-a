# 04 — Motor do puzzle, geometria, câmera e encaixes

**Objetivo:** regras determinísticas para qualquer renderizador. Este documento contém **contratos e exemplos orientadores**; orientam a implementação incremental. Câmera, malha, distribuição, grupos rígidos, snaps e conclusão dos demos de 24/48 peças existem em `src/game/core`. Bolsas e persistência local foram acrescentadas nas F3.1/F3.2; recompensas locais são aplicadas pelo motor na F4.2. A implementação de grupos fica em `src/game/core/puzzle/groups.ts`: translation + rotate(canonicalCenter, quarterTurn), sem coordenadas de câmera no estado do puzzle.

## 1. Espaços de coordenadas

- **Puzzle space:** origem (0,0) no canto superior esquerdo da imagem completa; grade e curvas em unidades lógicas.
- **World space:** mesa grande; tapete e peças usam estas coordenadas persistidas.
- **View/screen space:** pixels CSS da viewport de cada usuário, afetados pela câmera.
- **Texture space:** pixels da imagem original; nunca salvar posições de gameplay em coordenadas da textura.

Transformação de world para screen:

~~~text
screen = viewportCenter + zoom * rotate(world - cameraCenter, cameraAngle)
world  = cameraCenter + rotate((screen - viewportCenter) / zoom, -cameraAngle)
~~~

**Consequências:**
- Pan altera cameraCenter, não as peças.
- Rotacionar a mesa altera cameraAngle, não a orientação física salva das peças.
- Zoom focal na posição do cursor ou do centro da pinça preserva o worldPoint debaixo do gesto.
- Coordenadas de DOM, touch e mouse passam pela mesma normalização antes do hit test.

### Código de referência: câmera 2D

~~~ts
export type Vec2 = { x: number; y: number };
export type Camera = { center: Vec2; zoom: number; angleRad: number };
export type Viewport = { width: number; height: number };

export function rotate(p: Vec2, angleRad: number): Vec2 {
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
}

export function worldToScreen(
  point: Vec2, camera: Camera, viewport: Viewport
): Vec2 {
  const d = rotate({
    x: point.x - camera.center.x,
    y: point.y - camera.center.y,
  }, camera.angleRad);
  return {
    x: viewport.width / 2 + d.x * camera.zoom,
    y: viewport.height / 2 + d.y * camera.zoom,
  };
}

export function screenToWorld(
  point: Vec2, camera: Camera, viewport: Viewport
): Vec2 {
  const d = {
    x: (point.x - viewport.width / 2) / camera.zoom,
    y: (point.y - viewport.height / 2) / camera.zoom,
  };
  const local = rotate(d, -camera.angleRad);
  return {
    x: local.x + camera.center.x,
    y: local.y + camera.center.y,
  };
}
~~~

Teste: screenToWorld(worldToScreen(p)) ≈ p para múltiplos ângulos, zooms e tamanhos.

## 2. Definição determinística de puzzle

~~~ts
type PuzzleDefinition = {
  id: string;
  version: number;
  sourceImageId: string;     // asset imutável e estável
  imageWidth: number;
  imageHeight: number;
  rows: number;
  columns: number;
  seed: string;              // formas e espalhamento reproduzíveis
  pieceRotation: "quarter-turns"; // 0, 90, 180, 270 graus
  geometryVersion: 1;
};

type EdgeType = "flat" | "tab" | "socket";
type Side = "top" | "right" | "bottom" | "left";
type PieceGeometry = {
  pieceId: string;        // "row:column"
  row: number;
  column: number;
  polygon: Vec2[];       // curvas discretizadas para máscara/hit test
  edges: Record<Side, EdgeType>;
  canonicalOrigin: Vec2; // posição quando puzzle 100% montado
};
~~~

Regras de geração:
1. Dividir imagem em grid com dimensões de células calculadas a partir da proporção.
2. Cada aresta interna do grid é gerada **uma vez**, com seed determinística derivada de seus índices; o vizinho usa a mesma curva em sentido inverso e com polaridade complementar.
3. Arestas externas são planas.
4. Curvas tipo tab/socket em Bézier com amplitudes limitadas para não se cruzarem; usar suavização e recorte alfa.
5. Recortar textura da imagem em cada polígono e permitir extravasamento de tabs; não recortar fora das abas por acidente.
6. O conjunto completo cobre a imagem original sem lacunas ou sobreposições erradas.
7. Imagem, seed, dimensões, versão e grade ficam congeladas em sessões já criadas.

**Teste de propriedade:** cada aresta interna tem exatamente um par compatível; borda não encaixa com interior; todas as peças da malha recompõem a imagem original.

## 3. Posição inicial das peças

- Calcular bounding box de cada peça incluindo abas e margens.
- Reservar área do tapete e objetos principais; escolher slots distribuídos ao redor da mesa.
- Embaralhar com PRNG seedado e jitter pequeno, com verificações de colisão para não ocultar inteiramente outras peças.
- Fallback para mesa mais larga, setores ou bandejas se o número de peças não couber.
- Peças inicialmente desmontadas, soltas e com orientação aleatória de 0/90/180/270 se a dificuldade exigir.
- Proibido randomizar novamente no refresh ou após reconexão (a posição inicial é uma seed; o estado ativo vem do save).

## 4. Modelo de grupos

Peças unidas são um **grupo rígido**. Uma peça tem coordenadas canônicas dentro do puzzle, mas sua posição mundial decorre da transformação do grupo.

~~~ts
type QuarterTurn = 0 | 1 | 2 | 3;

type Piece = {
  id: string;
  canonicalOrigin: Vec2;
  pieceGeometryId: string;
  bagId: string | null;    // somente peças soltas no primeiro MVP
};

type PieceGroup = {
  id: string;
  pieceIds: string[];    // conjunto disjunto de IDs
  x: number;             // tradução no mundo
  y: number;
  quarterTurn: QuarterTurn;
  zIndex: number;
};

type PuzzleSession = {
  schemaVersion: number;
  id: string;
  puzzleId: string;
  groups: PieceGroup[];
  pieces: Piece[];
  confirmedConnections: string[];
  bags: BagState[];
  progress: number;
  completedAt: string | null;
};
~~~

Para cada peça do grupo, sua posição final de referência no mundo depende de groupTranslation + rotate(canonicalOrigin, groupRotation). A modelagem exata de pivô deve ser consistente com o renderer e testada em todos os quadrantes.

**Invariante:** toda peça está em exatamente um grupo; grupos não compartilham IDs; não destruir o grupo antigo sem mover membros para o novo grupo.

## 5. Detecção e resolução de snap

**F2.3 implementada:** ao soltar após um drag válido, ou solicitar Encaixar/Enter, busca-se o grupo vizinho de menor erro com a mesma orientação. A tolerância é `clamp(18 / zoom, 6, 48)` em unidades de mundo. O grupo ativo adota exatamente a transformação do alvo; se a união extrapolar a mesa, ela é rejeitada. O passo primário une dois grupos e registra todas as conexões canônicas internas, incluindo ciclos, com IDs ordenados e únicos. Cancelamento, segundo dedo ou perda de foco não provocam snap. Setas com Shift ajustam a seleção em passos de 4 pixels de tela; as setas normais usam 20.

Os passos abaixo preservam o desenho de referência para evolução do motor:

Não usar "distância entre centros de sprites" como único critério: peças vizinhas podem ter centros distantes e grupos grandes precisam de correspondência exata.

Algoritmo sugerido após soltar peça/grupo:

1. Buscar, no grafo canônico, vizinhos das peças do grupo ativo que ainda pertençam a outro grupo.
2. Para cada par de grupos candidatos, estimar a transformação que alinha os pontos canônicos das peças adjacentes.
3. Validar **orientação compatível** (diferença angular máxima; MVP só quartos de volta).
4. Calcular distância residual em world space e comparar com limite baseado em distância visual: **thresholdWorld = thresholdScreenPx / camera.zoom**, limitado a mínimo/máximo.
5. Selecionar candidato de menor erro e aplicar a transformação exata de encaixe.
6. Fundir grupos com a transformação consolidada, atualizar índice espacial e calcular **todas** as conexões canônicas recém-validadas.
7. Emitir eventos com IDs determinísticos de conexão, registrar somente conexões ainda não confirmadas.
8. Testar vitória quando **todas as peças pertencerem ao mesmo grupo** com todas as conexões esperadas e colocar/animar grupo no tapete (ou exigir soltura no tapete, decisão de UX).
9. Rejeitar o snap se grupos estiverem guardados em sacolas ou houver lock de outro jogador (fase online).

**IDs de conexão:** ordenar os IDs das duas peças adjacentes e concatenar com separador estável; nunca recompensar o mesmo ID duas vezes.

### Pseudocódigo de referência

~~~ts
function releaseGroup(session: SessionState, movingGroupId: string) {
  const candidates = neighboringGroupsInCanonicalGrid(session, movingGroupId);

  const matches = candidates
    .map(candidate => predictSnap(session, movingGroupId, candidate))
    .filter(match => match.rotationMatches && match.distancePx <= 18)
    .sort((a, b) => a.distancePx - b.distancePx);

  if (matches.length === 0) return session;

  const aligned = alignAndMergeGroups(session, matches[0]);
  const newConnectionIds = detectNewAdjacencies(aligned)
    .filter(id => !session.confirmedConnections.has(id));

  return commitSnapAndRewardEvents(aligned, newConnectionIds);
}
~~~

A função é **ilustrativa**: tipos como SessionState e helpers pertencem à futura implementação. Evitar threshold fixo de 18 px sem testar toque.

## 6. Tapete e conclusão

**Guia por peça implementado (F2.5):** as dimensões base vêm da imagem/grade (24 peças: 800/6 × 600/4; 48 peças: 100 × 100), com abas além da célula. O botão opcional mostra imagem a 24% de opacidade e contornos canônicos no tapete. A seleção destaca seu destino, com aviso textual para posição distante, orientação incorreta, proximidade e alinhamento. No estado de domínio, somente um grupo a 0° e com `|translation| <= snapTolerance(zoom)` pode receber translation=(0,0) ao soltar ou pedir Encaixar. Não há alteração de escala nem bloqueio: o grupo pode sair livremente. Ativar/desativar ou cancelar o gesto não ajusta posições. O alinhamento isolado não cria conexões; após o ajuste, só vizinhos com a mesma transformação exata se unem. Uniões adicionais já alinhadas são resolvidas sem deslocamentos cumulativos e as conexões continuam únicas.

- A área útil do tapete deve ter aspecto igual ao aspect ratio da imagem e dimensão worldUnits correspondente ao puzzle completo.
- A montagem pode ocorrer fora do tapete; ao completar, dar ao jogador a opção de alinhar a obra ao tapete com animação suave. Se conclusão exigir estar sobre o tapete, comunicar isso claramente.
- Não reamostrar imagem ou mudar escala de peças arbitrariamente para "fazer caber". O tamanho esperado do puzzle e o tapete são derivados da mesma definição.
- A recompensa de conclusão deve acontecer **uma vez por sessão** (ID da sessão como chave idempotente).
- Arte final exibida por camada da imagem inteira só depois de validação de conclusão, evitando costuras, sem perder referência aos grupos.

## 7. Sacolas e z-order

~~~ts
type BagState = {
  id: string;
  label: string;
  x: number;
  y: number;
  isExpanded: boolean;
  pieceIds: string[];
};
~~~

- Um pieceId está na mesa **ou** numa sacola, nunca simultaneamente.
- Guardar remove a peça da renderização no mundo sem excluí-la do estado.
- Retirar cria/reativa um grupo solto na posição desejada e o traz à frente.
- Sacolas têm posição world; bandeja com peças é UI em screen.
- Guardar grupo unido é proibido no MVP para evitar regras ambíguas de desmontagem.
- Renomear sacola não afeta IDs ou posição de peças.
- Ações inválidas devem falhar de forma recuperável, nunca eliminar peças.

## 8. Pipeline de renderização PixiJS

1. Carregar textura da imagem e máscaras/meshes de geometria determinística.
2. Cachear recortes/mascaras reutilizáveis por tamanho e seed.
3. Criar layers: mesa → tapete → sombras → sacolas → peças/grupos → efeitos.
4. Não criar React component por peça ou sincronizar o mundo inteiro a cada pointermove.
5. Atualizar transforms dos containers Pixi; renderer recebe diff de estado ou comandos.
6. Para hit testing, usar polígonos da peça em posição mundial, não só sua bounding box retangular.
7. Dispor de fallback de qualidade, controle DPR, culling e limpeza de recursos no unmount.

## 9. Áudio e momentos de recompensa

Gerar feedback só para eventos confirmados. Exemplos:

~~~ts
type GameFeedbackEvent =
  | { kind: "grab"; pieceId: string }
  | { kind: "drop"; pieceId: string }
  | { kind: "snap"; connectionIds: string[] }
  | { kind: "coins"; amount: number }
  | { kind: "completed"; puzzleId: string };
~~~

Áudio é uma projeção desses eventos, não um gatilho de mutação de estado. No replay/sync online, não tocar recompensas repetidas por duplicação de mensagem.

## 10. Matriz de testes obrigatórios

- Determinismo: mesma seed gera mesmos recortes e distribuição inicial.
- Cada par de vizinhos internos tem curva complementar.
- Transformações screen↔world são inversíveis com zoom/pan/rotação.
- Reunir A+B e depois C preserva posição relativa e todas as peças.
- Group snapping funciona após múltiplas rotações de câmera.
- Ajustar zoom não muda o número de snaps válidos em uma cena física idêntica.
- Conexão não recompensa duas vezes, mesmo com refresh e múltiplas tentativas.
- Move/rotate não desagrupa peças já unidas.
- Tirar e colocar peça em sacola preserva 100% de inventário.
- Soltar peça fora da mesa deve ser limitado/recuperável.
- Mudar viewport/orientação não altera save canônico.
- Monte 24/48/100 peças em testes sintéticos e verifique consistência dos grupos.

## Soltura e bolsas (F3.1/F3.2)

Antes de confirmar a soltura, o controlador aplica as coordenadas de pointerup em world space, cobrindo navegadores que omitem o último pointermove. Cancelamentos não aplicam essa posição. Com guia ligado, mesmo um toque/pequeno ajuste pode alinhar a seleção próxima e orientada a 0°.

Bolsas associam IDs de peças soltas ao inventário, sem excluir sua geometria ou grupo canônico. Peças guardadas não participam do hit test nem dos candidatos de encaixe. Retirar remove a associação e posiciona a mesma peça ao lado da bolsa, respeitando os limites da mesa. O snapshot durante arraste usa a última transformação confirmada.

## Recompensas (F4.2)

Após um snap canônico, `claimRewards` compara as chaves de conexões e conclusão com o ledger persistido. O controlador atualiza saldo/ledger antes de publicar o snapshot e só então entrega eventos de feedback ao adaptador de áudio/visual. Publicar UI, selecionar, girar ou aproximar isoladamente no guia não cria recompensa. Nova montagem preserva ledger por definição, impedindo replays premiados. O renderer não altera saldo.

## Revisão do guia — reservas e rollback (31/10/2026)

`slotAt` converte centro lógico em célula, independentemente de ID/orientação. `hoveredSlots` fornece somente o espaço sob a peça/grupo em arraste ao renderer. O adaptador não recebe o destino canônico como realce, nem usa imagem ou cores de validação. `validMatPlacement` aceita orientação 0 e centros em suas células canônicas; `releaseWithGuide` centraliza e une apenas vizinhos válidos. O tamanho inteiro da célula é área de soltura, sem exigir proximidade antecipada do centro.

No fim do drag, uma tentativa inválida que alcança células do tapete restaura o grupo original inteiro antes de publicar/save. Origens de bolsa pendentes retornam a peça à bolsa original e restauram sua transformação anterior. Erros não chegam ao ledger nem ao snap. Fora do tapete, permanece a organização/encaixe livre; desativar o guia confirma a retirada da bolsa. O modo livre continua disponível também sobre o tapete com guia desligado.
