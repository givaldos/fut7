# Runbook

## Ambientes

Use três fronteiras separadas:

- local: Supabase via Docker e chaves locais;
- preview/staging: projeto Supabase próprio ou branches de preview quando o plano permitir;
- produção: projeto Supabase exclusivo, jamais usado por preview.

Não reutilize senha, chave secreta, Turnstile secret ou banco entre ambientes.

## Bootstrap local

1. Instale Node.js 24, npm 11 e Docker Desktop.
2. Rode `npm ci`.
3. Rode `npm run db:start` e `npm run db:reset`.
4. Rode `npm run db:types` após qualquer migration.
5. Copie `.env.example` para `.env.local` e preencha com as credenciais locais exibidas por `npx supabase status`.
6. Rode `npm run dev`.

O cadastro público real fica indisponível em produção se Turnstile ou a chave server-side estiverem ausentes. Em desenvolvimento, o restante da interface pode subir sem essas integrações.

## Provisionamento remoto

O módulo em `infra/terraform` cria/configura:

- projeto e settings do Supabase;
- projeto Vercel ligado ao GitHub e variáveis de runtime;
- ruleset da branch `main`.

Use Terraform 1.11+ com HCP Terraform para estado remoto criptografado, lock e histórico. O bloco `cloud {}` recebe organização e workspace por ambiente. Nunca execute com estado local em uma máquina compartilhada.

```bash
cp infra/terraform/terraform.tfvars.example infra/terraform/terraform.tfvars
terraform -chdir=infra/terraform init
terraform -chdir=infra/terraform plan
terraform -chdir=infra/terraform apply
```

Defina `TF_CLOUD_ORGANIZATION`, `TF_WORKSPACE` e `TF_TOKEN_app_terraform_io` antes do `init`. O workspace HCP deve existir e usar uma versão Terraform compatível.

Credenciais dos providers devem entrar somente por variáveis de ambiente:

- `SUPABASE_ACCESS_TOKEN`;
- `VERCEL_API_TOKEN`;
- `GITHUB_TOKEN`.

O `terraform.tfvars` contém identificadores e também valores sensíveis de bootstrap; está ignorado pelo Git. Para CI, mapeie inputs com `TF_VAR_*` e um cofre de segredos.

## Segredos do GitHub Actions

Crie um Environment protegido chamado `production` e adicione:

- `SUPABASE_ACCESS_TOKEN`: token de automação com escopo mínimo;
- `SUPABASE_PROJECT_ID`: ref do projeto de produção;
- `SUPABASE_DB_PASSWORD`: senha de produção.
- `TF_API_TOKEN`: token de equipe do HCP Terraform com acesso só ao workspace;
- `VERCEL_API_TOKEN`: token de automação do projeto/time;
- `INFRA_GITHUB_TOKEN`: fine-grained token para rulesets deste repositório;
- `TURNSTILE_SITE_KEY` e `TURNSTILE_SECRET_KEY`.

Crie também as Repository Variables:

- `TF_CLOUD_ORGANIZATION` e `TF_WORKSPACE`;
- `SUPABASE_ORGANIZATION_ID`;
- `APP_URL`;
- `REQUIRED_APPROVALS` (comece em `0` enquanto houver um único mantenedor);
- `ENABLE_TERRAFORM_APPLY` como `true` somente depois de revisar um primeiro `plan` manual.

Restrinja o Environment à branch `main`. Se houver mais de uma pessoa responsável, exija aprovação para deploy de produção.

## Fluxo de entrega

1. Criar branch `codex/<tema>` ou `feat/<tema>`.
2. Implementar com testes e migration quando necessário.
3. Abrir pull request usando o template.
4. Aguardar `quality`, `database`, `dependency-review` e CodeQL.
5. Fazer merge somente após revisão.
6. A Vercel publica a aplicação automaticamente.
7. O workflow `Deploy database` aplica migrations em produção de forma serializada.

Migrações destrutivas usam expand/contract: primeiro adicionar estrutura compatível, depois migrar dados e código, só então remover a estrutura antiga em outro deploy. Nunca editar uma migration já aplicada.

## Primeira ativação do repositório

O ruleset referencia checks que só existem depois que os workflows executarem ao menos uma vez. Para o primeiro bootstrap:

1. enviar a fundação para `main`;
2. aguardar a primeira execução dos workflows;
3. configurar o HCP Terraform e as variáveis/segredos acima;
4. aplicar o Terraform com `enable_github_ruleset = true`;
5. testar um pull request pequeno para confirmar o bloqueio.

## Rollback

- aplicação: promover na Vercel o último deployment conhecido como bom;
- banco: preferir migration corretiva forward-only; restaurar backup apenas em incidente de perda/corrupção;
- segredo: revogar, emitir novo, atualizar cofre/Vercel/GitHub e reimplantar;
- regra de acesso: bloquear o fluxo afetado, preservar evidências, adicionar teste de regressão e aplicar correção.

## Incidente

1. Conter: revogar credenciais e desabilitar o caminho afetado.
2. Preservar logs e linha do tempo sem copiar PII para canais informais.
3. Avaliar times, titulares e dados impactados.
4. Corrigir e validar em ambiente isolado.
5. Notificar responsáveis e titulares conforme obrigação legal.
6. Registrar causa raiz, ações e teste que impede recorrência.
