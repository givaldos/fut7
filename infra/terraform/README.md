# Infraestrutura Terraform

Este módulo declara os recursos remotos do Fut7. Migrações e políticas do banco continuam em `supabase/` e são aplicadas pelo workflow de deploy.

Requisitos:

- Terraform 1.11+;
- HCP Terraform com workspace exclusivo, locking e histórico;
- `SUPABASE_ACCESS_TOKEN`, `VERCEL_API_TOKEN` e `GITHUB_TOKEN` no ambiente;
- arquivo `terraform.tfvars` local ou variáveis `TF_VAR_*` vindas de um cofre.

Não faça commit de estado, plano salvo, tokens ou `terraform.tfvars`. Configure `TF_CLOUD_ORGANIZATION`, `TF_WORKSPACE` e `TF_TOKEN_app_terraform_io`; o bloco `cloud {}` mantém o state remoto. O provider do Supabase lê chaves geradas para configurar a Vercel, então o state deve ser tratado como secreto.

O ruleset começa desabilitado porque GitHub só reconhece um required check depois de sua primeira execução. Após a primeira CI verde, aplique novamente com `enable_github_ruleset = true`.

O workflow `Terraform` valida todo pull request e, depois que a variável `ENABLE_TERRAFORM_APPLY=true` for habilitada, aplica automaticamente a configuração revisada quando `main` é atualizada. Proteja o Environment `production` e use tokens de automação com o menor escopo possível.

Previews da Vercel não devem usar o banco de produção em operação real. Antes de abrir pull requests de terceiros ou adicionar dados reais, provisione um Supabase de staging/branch e substitua as variáveis de preview.
