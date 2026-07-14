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

- [x] Roteador de ativação entre time existente, convite pendente e criação do primeiro time.
- [x] Criação guiada com nome, slug protegido por unicidade e modalidade principal.
- [x] Convite de administrador/organizador vinculado ao e-mail confirmado, com hash, TTL, uso único, recusa e revogação.
- [x] Compartilhamento inicial de cadastro e convite pelo WhatsApp sem acoplamento à API do provedor.
- [ ] Edição de nome, slug, modalidade e fuso com proteção contra takeover.
- [ ] Transferência de owner com reautenticação e confirmação das duas partes.

### M1.2 Gestão do BID

- [x] Listar elenco e solicitações pendentes com PII restrita a staff.
- [x] Cadastrar atleta ativo com até três posições ordenadas da modalidade do time.
- [x] Aprovar/rejeitar cadastro público e ativar/inativar atleta.
- [ ] Pesquisar, editar cadastro e trocar preferências após a criação.

### M1.3 Agenda avulsa

- [x] Criar e listar jogo/amistoso/campeonato/treino com local, modalidade, adversário e janela de confirmação.
- [x] Abrir chamada automaticamente para o elenco ativo.
- [ ] Editar, cancelar/concluir e configurar limite de atletas.

### M1.4 Agenda recorrente

- [x] Criar uma série semanal e materializar de 2 a 52 ocorrências com chamadas independentes.
- [ ] Estender a janela de forma idempotente e editar/cancelar uma ocorrência ou série sem alterar o histórico.

### M1.5 Confirmação de presença

- [x] Chamada mobile administrativa com confirmação, recusa, dúvida e limpeza da resposta.
- [x] Contadores por estado e base de confirmados para a escala.
- [ ] Vínculo de conta e resposta de um toque pelo próprio atleta, respeitando capacidade e janela.

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
