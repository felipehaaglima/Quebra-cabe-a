# Ativar contas e cópias privadas (F5.1)

O repositório está preparado para Supabase, mas nenhum projeto externo foi criado ou configurado automaticamente. O jogo funciona sem variáveis: `/account` informa que a conta ainda não está disponível e mantém a montagem local.

## Configuração do projeto

1. No painel Supabase, criar um projeto para desenvolvimento/preview; usar outro para produção. Conferir plano, região e limites antes de criar. Não é necessário habilitar serviços pagos para testar o código.
2. Aplicar `migrations/202610310001_accounts_and_backups.sql` pelo SQL Editor do projeto correto ou pelo workflow de migrações da CLI Supabase. O arquivo é uma migração inicial única; não executá-lo repetidamente sobre tabelas já criadas.
3. Em Authentication → Providers, habilitar Email e permitir novos cadastros. A entrada é por código OTP, sem senha.
4. Nos templates de e-mail de confirmação/código (Confirm signup e Magic Link), incluir `{{ .Token }}` como código visível. A tela aceita códigos numéricos de 6 a 8 dígitos. Ela não depende de abrir um link de login. Ajustar a duração/quantidade de dígitos no painel se necessário.
5. Configurar remetente/SMTP e limites do Auth. O remetente de teste do Supabase pode restringir destinatários e envios; verificar a configuração antes de abrir cadastro público. Não usar credenciais SMTP no frontend.
6. Configurar Site URL e redirects permitidos para os domínios de cada ambiente, mesmo que o fluxo atual seja por código digitado. Não usar wildcard amplo para produção.
7. Definir no servidor Next/Vercel `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY`, conforme `.env.example`. A chave deve ser publishable ou a antiga anon. `service_role`/`sb_secret_` são recusadas. Nenhuma chave administrativa é necessária para a aplicação.
8. Reiniciar o servidor/redeploy após definir variáveis. Não definir banco de produção nas variáveis de previews não confiáveis. Se `APP_ORIGIN` for usado, deve ser a origem do site daquele ambiente.

Não enviar chaves privadas pelo chat ou colocar `.env.local` no Git. O publishable key fica no servidor neste projeto; os tokens de sessão usam cookies HttpOnly, SameSite=Lax e Secure em produção. Somente Route Handlers acessam o provedor.

## Experiência entregue

- Início → Sua conta, ou Ferramentas → Conta e cópias na nuvem.
- Entrar/criar conta por e-mail + código; sair revoga a sessão deste aparelho.
- Guardar cópia de 24/48 peças cria um snapshot privado e imutável. Não há sincronização contínua: depois de novos movimentos, guardar outra cópia.
- Outro aparelho pode entrar na mesma conta e revisar/restaurar uma cópia.
- A restauração pede confirmação, revalida inventário/geometria e arquiva atomicamente a montagem local anterior antes de trocar. Se outra aba mudou o save ou ele é incompatível, a troca é bloqueada.
- Histórico deste aparelho recupera as montagens anteriores sem apagar a que estiver ativa. Moedas/ledger locais são unidos sem duplicar prêmios. Histórico não é enviado automaticamente à conta.
- Câmera, preferências de conforto e moedas não são enviadas na cópia. Progresso importado é marcado como já recompensado a zero neste aparelho. Não cria saldo financeiro nem transfere moedas online.
- IDs e timestamps das cópias vêm do banco. RLS restringe leitura/inserção ao dono; não há atualização/exclusão de snapshots nesta fase. Idempotência por usuário/requestId evita sobrescrever uma cópia existente.

## Storage

A migração prepara o bucket privado `puzzle-private`, com leitura/inserção somente no prefixo `<auth.uid()>/...`, imagens JPEG/PNG/WebP e limite de 10 MiB. Não há interface de upload nesta fase; o demo continua um asset imutável versionado no repositório. Catálogo/loja/galeria são fases seguintes.

## Testar a ativação real

1. Aplicar migração em projeto de testes e conferir RLS em profiles/cloud_saves e políticas de Storage.
2. Com e-mails A e B, autenticar, guardar uma cópia e confirmar que B não a lista nem a busca por UUID conhecido. Testar também sem sessão.
3. Entrar como A em outro aparelho, revisar/restaurar a cópia e abrir a mesa. Conferir peças, bolsas, grupos e guia.
4. Antes da troca, ter uma montagem local diferente e confirmar que ela aparece no histórico e pode ser restaurada.
5. Repetir/expirar um código, sair, limpar cookies, simular rede indisponível e abrir duas abas. Conferir erros sem perda de progresso.
6. Verificar cookies HttpOnly/Secure no deploy HTTPS e ausência de tokens/chaves administrativas no bundle/logs.

`npm test` executa testes de APIs/validação e a migração em PostgreSQL local via PGlite com dois usuários, roles e RLS. Os schemas auth/storage de testes reproduzem os contratos necessários, não o serviço Supabase completo. Playwright testa a indisponibilidade real sem configuração e a UI conectada com respostas de API simuladas. Envio/recebimento de e-mail, Auth/Storage hospedados, dois aparelhos reais e deploy configurado precisam da ativação acima; não foram declarados validados sem projeto.
