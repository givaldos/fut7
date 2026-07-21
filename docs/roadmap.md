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
- [x] Editar cadastro administrativo até a reivindicação; depois dela, restringir owner/admin aos dados do vínculo.
- [x] Remover atleta sem afetar perfil global/outros times, minimizando o cadastro e preservando a identificação necessária às súmulas históricas.
- [ ] Pesquisar e filtrar o elenco por nome, posição e situação.

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
- [x] Identidade global, vínculo aprovado por time e resposta pelo próprio atleta dentro da janela.

### M1.6 Escalação de jogo

Selecionar apenas confirmados, montar titulares/reservas e distribuir por posição compatível com a modalidade. Registrar override justificado para exceções.

### M1.7 Divisão do racha

Gerar de 2 a N times equilibrados a partir dos confirmados, levando em conta goleiros, posições, avaliação opcional e histórico de equilíbrio. O algoritmo sugere; o gestor confirma e pode ajustar.

### M1.8 Convite e vínculo do atleta

- [x] Criar perfil por OTP no WhatsApp e associar ao BID pendente sem senha.
- [x] Permitir um perfil em vários times com aprovação independente.
- [x] Oferecer, na página do time, escolha clara entre entrar com WhatsApp e criar o primeiro perfil.
- [x] Perfil pessoal público/privado com posições globais.
- [ ] Fluxo assistido para reivindicar um BID administrativo antigo cujo telefone coincida, com trilha explícita para conflitos.

### M1.8.1 Home administrativa

- [x] Ativação gamificada e removida automaticamente após a missão de estreia.
- [x] Próximo jogo e chamada como foco principal no mobile.
- [x] Linha do tempo de eventos e movimentações recentes do BID.
- [x] Configurações e convites fora da home, em área própria do time.

### M1.8.2 Vitrine social do time

- [x] Sobre e redes sociais editáveis por owner/admin.
- [x] Escudo, capa e galeria com storage privado e publicação por URL temporária.
- [x] Escolha administrativa de uma foto de destaque com composição editorial responsiva.
- [x] Página pública editorial, mobile-first e orientada a entrada no time.
- [x] BID público limitado ao consentimento individual do atleta.
- [x] Foto global do atleta com recorte, storage privado, troca/remoção e acesso do BID ao perfil público.

### M1.9 Súmula e estatísticas básicas

- [x] Placar, nomes dos times e observações gerais por ocorrência.
- [x] Gols com assistência opcional e cartões amarelo/vermelho para atletas confirmados.
- [x] Correção de lances com ajuste do placar e auditoria.
- [x] Encerramento explícito antes de contabilizar estatísticas pessoais.
- [x] Acompanhamento mobile pelo atleta e agregados em perfil privado/público consentido.
- [ ] Métricas avançadas, filtros por time/temporada e importação de súmulas antigas.

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
- análises históricas por time e temporada sem ranking vexatório;
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
