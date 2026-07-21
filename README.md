# Fut7

Plataforma multi-time, mobile-first e preparada para WhatsApp para organizar atletas, agendas, presenças, divisões de racha e escalações de futebol de campo, society e futsal.

## Estado atual

Esta fundação já entrega:

- aplicação Next.js 16/Node.js 24 em português;
- design system próprio sobre Tailwind e Radix, com navegação e alvos de toque mobile-first;
- autenticação Supabase com sessão em cookies;
- identidade global do atleta com login sem senha por OTP no WhatsApp;
- perfil pessoal editável com foto recortável, público/privado em `/p/{handle}` e conectado a vários times;
- página social do time com capa, sobre, redes, galeria, agenda e BID público consentido;
- página pública de cada time em `/t/{slug}`;
- cadastro público com campos persistentes, posições, Turnstile e confirmação do WhatsApp antes do BID;
- painel autenticado e troca de time para administradores multi-time;
- onboarding PLG com criação guiada do primeiro time, caixa de convites e ativação derivada do uso real;
- convites administrativos vinculados ao e-mail verificado, com expiração, aceite explícito e compartilhamento por WhatsApp;
- BID administrativo para cadastrar atletas com até três posições preferenciais, aprovar/rejeitar solicitações públicas e ativar/inativar o vínculo;
- agenda avulsa ou semanal (até 52 ocorrências), com modalidade, adversário, local e chamada criada automaticamente para o elenco ativo;
- confirmação de presença pelo próprio atleta e acompanhamento independente da aprovação em cada time;
- súmula mobile por partida com placar, gols, assistências, cartões, observações e correções auditadas;
- acompanhamento da partida pelo atleta, com atualização automática, e estatísticas em perfis pessoais e públicos consentidos;
- modelo PostgreSQL completo para atletas, posições, recorrências, eventos, presença, times do racha, escalações, consentimentos, fila de notificações e auditoria;
- isolamento por time via Row Level Security (RLS), inclusive testes automatizados;
- CI, análise de dependências e CodeQL com ações fixadas por SHA;
- infraestrutura declarativa para Supabase, Vercel e regras do GitHub.

Onboarding, convites, identidade do atleta, BID, agenda, chamada e estatísticas básicas por partida já estão operacionais. O editor tático, a divisão equilibrada e análises históricas avançadas permanecem no roadmap.

## Pré-requisitos

- Node.js 24 e npm 11;
- Docker Desktop para o Supabase local;
- Supabase CLI, instalada como dependência do projeto;
- Terraform 1.11+ somente para provisionar a infraestrutura remota.

## Desenvolvimento local

```bash
npm ci
npm run db:start
npm run db:reset
npm run db:types
cp .env.example .env.local
npm run dev
```

Depois de iniciar o Supabase, rode `npx supabase status` e copie para `.env.local` apenas os valores locais correspondentes. Nunca versione `.env.local`, chaves secretas, tokens ou estado do Terraform.

Para testar o OTP local, use `+55 11 99999-9999` e o código `123456`. Esse par existe apenas em `supabase/config.toml`; produção usa o serviço Twilio configurado pelo Terraform.

Validação completa:

```bash
npm run lint
npm run typecheck
npm test
npm run db:lint
npm run db:test
npm run build
npm run security:audit
```

## Organização

- `app/`: páginas públicas, autenticação e painel autenticado;
- `components/`: componentes de interface mobile-first;
- `lib/`: acesso a dados, autenticação, ambiente e controles de segurança;
- `supabase/migrations/`: schema versionado e políticas RLS;
- `supabase/tests/`: testes pgTAP de isolamento e API pública;
- `infra/terraform/`: Supabase, Vercel e proteção do GitHub como código;
- `docs/`: arquitetura, segurança, operação e roadmap;
- `.github/`: CI/CD, revisão de dependências e análise estática.

## Leitura recomendada

1. [Arquitetura](docs/architecture.md)
2. [Segurança](docs/security.md)
3. [Runbook de ambientes e deploy](docs/runbook.md)
4. [Roadmap e backlog](docs/roadmap.md)

## Regra de entrega

Todo incremento deve entrar por pull request, passar por `quality`, `database`, `dependency-review` e CodeQL, incluir migração/testes quando tocar no banco e preservar o isolamento multi-time. Alterações manuais nos dashboards devem ser refletidas em código no mesmo pull request para evitar drift.
