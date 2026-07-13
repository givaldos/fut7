# Roadmap e backlog

Cada item abaixo foi escrito para virar issue do GitHub. O critério global de pronto inclui responsividade a partir de 320 px, acessibilidade por teclado/leitor de tela, autorização server-side, testes e nenhum vazamento cross-tenant.

## Marco 0 — Fundação (implementado nesta entrega)

- [x] Next.js, Supabase SSR, Tailwind, validação de ambiente e headers seguros.
- [x] Schema multi-time, BID, agenda, presença, divisão, escalação, consentimento, outbox e auditoria.
- [x] RLS deny-by-default e testes pgTAP de isolamento.
- [x] Página pública por slug e solicitação pública de atleta pendente.
- [x] Shell do painel e troca de time.
- [x] CI, auditoria de dependências, CodeQL e deploy de migration.
- [x] Terraform inicial e runbooks.

## Marco 1 — MVP operacional

### M1.1 Onboarding e times

Criar onboarding do primeiro time, edição de nome/slug/modalidade/fuso e convite de administradores. Incluir prevenção de takeover de slug e reautenticação para mudar owner.

### M1.2 Gestão do BID

Listar, pesquisar, cadastrar, editar, suspender e aprovar atletas pendentes. Dados privados só aparecem a staff; o elenco público mostra apenas opt-in. Incluir preferências ordenadas por campo/society/futsal.

### M1.3 Agenda avulsa

CRUD de jogo/amistoso/campeonato/treino com local, modalidade, adversário, limite de atletas e janela de confirmação.

### M1.4 Agenda recorrente

Editor semanal e materializador idempotente de ocorrências, com cancelamento/edição de uma ocorrência sem alterar histórico ou toda a série involuntariamente.

### M1.5 Confirmação de presença

Tela mobile de um toque para confirmar, recusar ou entrar em espera; respeitar abertura/fechamento e capacidade; mostrar contagem em tempo real com estado acessível.

### M1.6 Escalação de jogo

Selecionar apenas confirmados, montar titulares/reservas e distribuir por posição compatível com a modalidade. Registrar override justificado para exceções.

### M1.7 Divisão do racha

Gerar de 2 a N times equilibrados a partir dos confirmados, levando em conta goleiros, posições, avaliação opcional e histórico de equilíbrio. O algoritmo sugere; o gestor confirma e pode ajustar.

### M1.8 Convite e vínculo do atleta

Permitir que o atleta reivindique/associe sua conta ao registro aprovado com token curto e uso único. Impedir enumeração de telefone/e-mail.

## Marco 2 — WhatsApp-first

### M2.1 Adaptador de notificações

Worker idempotente para a outbox, política de retries/dead-letter, métricas, redaction e interface independente do provedor.

### M2.2 Opt-in e templates

Fluxo completo de consentimento/revogação, templates aprovados, lembrete da abertura, lembrete a pendentes e confirmação da escalação.

### M2.3 Confirmação por link seguro

Deep link com token com hash armazenado, escopo evento-atleta, TTL curto, uso único e fallback autenticado. Rate limit e alerta de abuso.

### M2.4 Webhooks

Validar assinatura, timestamp e replay; responder rápido; processar assíncrono; mapear entrega/leitura/falha sem salvar payload integral indefinidamente.

## Marco 3 — Operação e confiança

- dashboard de métricas do time sem ranking vexatório;
- histórico de presença e escalações;
- exportação e exclusão LGPD;
- logs e alertas operacionais;
- backups/PITR e exercício de restauração;
- MFA obrigatório para funções privilegiadas;
- pentest independente e correção dos achados;
- PWA somente se trouxer valor mensurável além dos links do WhatsApp.

## Fora do MVP

- pagamentos/mensalidades;
- arbitragem e súmula oficial;
- chat interno;
- feed social;
- marketplace público de atletas.

Esses itens só entram após validar o fluxo semanal principal: convite → confirmação → divisão/escalação → comunicação.
