# 01 — Visão de produto e game design

**Estado:** proposta de produto, não implementação. **Idioma inicial:** pt-BR. **Plataforma inicial:** web responsiva/PWA no futuro.

## 1. Fantasia do jogador

Quero chegar a uma mesa bonita e espaçosa, abrir um quebra-cabeça, espalhar as peças, organizá-las do meu jeito e montar com tranquilidade. O encaixe deve ser satisfatório. Posso voltar quando quiser, ganhar moedas por conquistas e futuramente montar com amigos e guardar as obras em uma galeria.

**Não é** uma lista de puzzles 2D com peças rigidamente presas a uma grade estática. A mesa é um espaço explorável e persistente, com liberdade de organização.

## 2. Loop principal

1. Abrir o jogo → continuar uma montagem ou escolher um novo puzzle.
2. Ver a **mesa grande** vista de cima com texturas acolhedoras e um **tapete central** onde a imagem completa caberá exatamente.
3. Ver **todas as peças desmontadas e espalhadas** ao redor (se necessário, distribuídas também em zonas organizadas), sem peças já encaixadas por padrão.
4. Explorar a mesa: zoom, mover câmera, girar visão; pegar, arrastar e girar peças.
5. Separar peças (borda, cor, região etc.) manualmente na mesa ou em **sacolas** etiquetadas.
6. Encaixar peça com peça e/ou com grupos; cada conexão correta gera feedback audiovisual e progresso.
7. Receber moedas por avanço válido e por completar o puzzle, com limites anti-farm.
8. Visualizar a montagem final cobrindo a área útil do tapete, celebrar e futuramente colocar na **galeria do dono**.
9. Gastar moedas em novos puzzles e repetir.

## 3. Mesa, tapete e peças — requisitos

### Mesa

- Mundo de coordenadas 2D maior que a viewport: por exemplo, área inicial configurável equivalente a **3 vezes a largura e 3 vezes a altura do tapete**, sem fixar pixels de dispositivo.
- Aparência de mesa de madeira com iluminação suave, sombra nos objetos e perspectiva superior.
- O tapete é um retângulo de feltro com proporção **igual à proporção final do puzzle**, podendo incluir margem visual. A imagem montada cobre toda a **área de montagem** do tapete, não necessariamente sua borda decorativa.
- Zoom mínimo permite ver o conjunto inteiro; zoom máximo permite avaliar detalhes das conexões.
- O jogador pode **rotacionar a visão da mesa**; as posições no mundo não são corrompidas pela rotação da câmera.
- A mesa pode ter áreas úteis: tapete central, peças soltas, sacolas e zona livre. Sem obrigar o jogador a usar sacolas.

### Peças

- Recortes de quebra-cabeça com saliências/entradas que se correspondem; bordas externas retas.
- Peças geradas de forma **determinística** por imagem + grade + seed: todos os participantes veem as mesmas peças.
- Peças começam **desmontadas e desordenadas**, mas sem nascer sobrepostas de forma impossível de acessar.
- A posição inicial precisa evitar cobrir completamente sacolas, controles ou o tapete.
- Peças podem ser selecionadas, arrastadas, giradas (passos de 90° inicialmente) e opcionalmente trazidas para frente na camada visual.
- **Encaixe físico visual:** duas peças ou grupos com bordas corretas, alinhamento e orientação dentro de tolerâncias se unem em um grupo; o grupo passa a se mover junto.
- A montagem pode acontecer sobre o tapete **ou em qualquer lugar da mesa**; o grupo final pode ser levado/centralizado no tapete para conclusão.
- A posição relativa e orientação entre peças de um grupo são sempre preservadas. Peças não podem se sobrepor incorretamente por erro de lógica.
- A ligação entre peças só conta uma vez para recompensa. Um grupo pode conter 2 ou mais peças.
- Embaralhamento de peças e geração de geometria são testáveis sem renderização.

### Sacolas de organização

- Sacolas visualmente apoiadas na mesa, não só uma modal que remove a sensação de organização.
- Usuário cria/renomeia etiquetas (ex.: "bordas", "azul", "céu"), muda posição e recolhe/expande a sacola.
- Arrastar peças para uma sacola as retira da área livre; tocar numa sacola abre uma bandeja com miniaturas das peças armazenadas para trazê-las de volta.
- Escolher uma sacola e mover várias peças para ela poderá vir em uma versão posterior, sem seleção múltipla obrigatória no início.
- Não perder peças; exibir contagem em cada sacola e ação "encontrar peças".
- Regra inicial: guardar apenas **peças soltas**. Suporte a grupos maiores em sacolas é decisão futura.
- Manter sacolas no mundo da mesa, mas com alvos de soltura suficientemente grandes no mobile.
- Possibilidade de organizar só espalhando e agrupando visualmente na mesa; sacolas são opcionais.

## 4. Progressão e recompensa

- Moedas com nome provisório "moedas" (arte e nomenclatura podem mudar).
- MVP local: moedas ilustrativas salvas no dispositivo; não têm valor monetário ou compras reais.
- Regras sugeridas, sujeitas a playtest:
  - +1 moeda por **nova conexão correta** entre peças, não por qualquer drag, tap ou reencaixe repetido.
  - bônus por montar o puzzle inteiro (ex.: +20 moedas para um puzzle pequeno).
  - eventualmente bônus por tamanho/dificuldade e conquistas (sem pressionar por tempo).
- A economia precisa ser controlável por configuração; ajustar ganhos/preços por dificuldade sem alterar motor.
- Em versão com conta, **somente o servidor** credita moedas e registra transações idempotentes; cliente nunca envia saldo final.
- Puzzle adquirido dá direito de começar novas montagens. Custos e catálogo dependem de playtest.
- Não adotar "pay-to-win", rankings agressivos ou penalidade por demora como padrão.

## 5. Catálogo e imagens

- Começar com **uma imagem de teste com direito de uso claro**, depois catálogo curado.
- Puzzles terão metadados: título, imagem, autor/origem/licença, proporção, dificuldade, grades possíveis, preço em moedas, tags, data de publicação.
- A IA poderá gerar imagens para adicionar ao catálogo e/ou oferecer geração personalizada em etapa posterior.
- Imagem gerada **não é uma peça pronta**: a imagem base passa pelo gerador determinístico de malha, que cria todos os recortes.
- Não depender de IA durante a montagem. O puzzle já publicado deve ser reproduzível e não desaparecer por mudanças no provedor.
- Moderação, políticas de conteúdo, copyright, limites de uso e custo de API antes de ativar geração aberta aos usuários.

## 6. Conta, salvamento e galeria

- **MVP:** jogar como visitante, salvar progressos no IndexedDB e restaurar sem conta.
- **Fase online:** login opcional, sincronização entre dispositivos e galeria do perfil.
- **Propriedade:** cada sessão/obra tem um único dono; colaboradores aparecem como créditos, nunca como proprietários do puzzle.
- Galeria do dono mostra puzzles completos, imagem, data, duração opcional (sem pressão), participantes e contribuições.
- Quando uma montagem recebe ajuda, a galeria do dono exibe nome/avatar dos ajudantes com consentimento apropriado.
- A galeria do ajudante pode mostrar "participei" separadamente, sem copiar propriedade para a galeria de puzzles próprios.
- Backups opcionais no Google Drive; o armazenamento primário online fica no banco e Storage da aplicação.

## 7. Colaboração futura

- Até **4 pessoas na mesma montagem**: 1 dono + até 3 ajudantes simultâneos.
- Convite via link privado (preferencialmente convite com expiração), entrada autenticada inicialmente.
- Câmeras independentes; cada pessoa pode girar/arrastar/usar zoom sem afetar visão das demais.
- Movimento de peça replicado de forma suave; somente uma pessoa pode ter o controle de uma peça/grupo por vez.
- Conexões validadas pelo servidor; participante que promoveu uma conexão válida recebe crédito de participação.
- Todos veem estados de sacolas e grupos sincronizados; permitir sacolas particulares só se a regra for definida depois.
- Dono controla participantes, remove convites e pode encerrar a sessão.
- Ao sair/reconectar ninguém perde progresso; participantes podem permanecer referenciados na obra concluída.

## 8. Jornada inicial (MVP)

**Abertura:** botão "Começar" → mesa e puzzle de exemplo com instrução discreta e dispensável "Arraste uma peça. Use dois dedos para mover e ampliar".

**Durante:** barra discreta com progresso, moedas, configurações. Ajuda acessível, não intrusiva. Tapete claramente visível com área de montagem sem sobreposição dos comandos.

**Organização:** saco com etiqueta na borda da mesa; gesto de arrastar uma peça sobre ele realça o alvo. Abrir saco permite encontrar e retirar peças, mesmo com zoom diferente.

**Encaixe:** peça aproxima do destino → leve magnetismo e sombra → som curto, brilho pequeno e contagem de moedas, respeitando "reduzir movimento" e mutar som.

**Conclusão:** grupo completo posicionado sobre tapete, imagem completa, pequena celebração, quantidade de moedas conquistadas e ação "Novo puzzle"/"Continuar olhando". Nunca impedir a visualização da obra final.

## 9. Critérios globais de aceite

- Uma pessoa sem instrução técnica consegue iniciar e montar pelo menos 24 peças em smartphone com toque.
- Nenhuma peça se perde quando vai à sacola, muda de zoom, roda a mesa ou atualiza a página.
- Rotação da câmera não altera posição relativa/adjacência nem o resultado do snap.
- Estado salvo e restaurado mantém peças, grupos, sacolas, moedas e câmera.
- O puzzle completo cobre geometricamente a área útil do tapete.
- Moedas não duplicam por abrir/fechar página ou separar e unir grupo já recompensado.
- Interface funcional com mouse/teclado e toque, com área clicável confortável.
- Abertura e continuidade acessíveis sem cadastro no MVP.

## 10. Fora do escopo inicial

- Rendering 3D completo/física em tempo real.
- Multiplataforma nativa mobile.
- Microtransações/compra com dinheiro real.
- Chat por voz, ranking competitivo, gamificação punitiva.
- Suporte a milhares de peças e dispositivos antigos já na versão 0.1.
- Publicação de imagens de IA não moderadas.
