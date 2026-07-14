# Segurança

## Meta de garantia

O baseline é OWASP ASVS 5.0 nível 2 e OWASP Top 10. Isso não é uma certificação: produção exige revisão independente, testes de intrusão e operação contínua. Segurança é critério de aceite em toda issue.

## Fronteiras de confiança

- todo dado de navegador, webhook, arquivo, slug e metadado do usuário é não confiável;
- a chave publicável do Supabase é pública por definição;
- a chave secreta do Supabase ignora RLS e só pode existir em runtime server-side;
- autorização é verificada no servidor e no banco, nunca deduzida da interface;
- cada consulta/escrita de domínio deve permanecer limitada ao `team_id` autorizado.

## Controles implementados

| Risco | Controle |
| --- | --- |
| A01 Broken Access Control | RLS em todas as tabelas, chaves compostas anti-cross-tenant, DAL server-side, último owner protegido, convites limitados por papel, RPCs operacionais que revalidam staff e testes pgTAP por papel |
| A02 Security Misconfiguration | headers seguros, CSP com nonce, HSTS em produção, `poweredByHeader` removido, schemas expostos mínimos, bucket privado |
| A03 Supply Chain | lockfile, versões exatas, scripts de instalação allowlisted, Dependabot, dependency review, CodeQL, ações GitHub fixadas por SHA |
| A04 Cryptographic Failures | TLS pelas plataformas, segredos fora do Git, tokens de convite aleatórios persistidos somente como SHA-256, variáveis sensíveis na Vercel, estado remoto do Terraform obrigatório |
| A05 Injection | Zod, SQL parametrizado pelo SDK, RPC tipada, sem `eval`/`new Function`, regras ESLint |
| A06 Insecure Design | PII separada, consentimento explícito, registro público pendente, outbox idempotente, deny-by-default |
| A07 Authentication Failures | cookies geridos pelo Supabase SSR, claims verificados no servidor, senha local mínima de 12 caracteres, confirmação de e-mail, redirecionamento interno validado |
| A08 Data Integrity Failures | migrations imutáveis, CI, branch protegida, constraints, aceite de convite transacional com row lock, cadastro de atleta/evento atômico, auditoria e workflows fixados por SHA |
| A09 Logging and Alerting | audit log de mudanças sensíveis sem conteúdo integral da PII; runbook prevê alertas e resposta a incidente |
| A10 Exceptional Conditions | erros públicos genéricos, timeouts, limites de tamanho, criação de times serializada e limitada por conta, falha fechada para anti-bot em produção, operações idempotentes |

## Cadastro público

O formulário usa duas camadas de validação, campo honeypot, Turnstile validado no servidor, limite de tamanho e resposta genérica. A RPC privilegiada não pode ser executada pelos papéis `anon` ou `authenticated`; somente o servidor a chama com a chave secreta. Todo cadastro entra como `pending`, invisível no diretório público até aprovação e opt-in.

O Turnstile não substitui rate limiting. Antes de abrir produção, configure limite por IP/slug no firewall da Vercel ou serviço equivalente, com política conservadora e observabilidade de falsos positivos.

## Operações administrativas

- criação de atleta, dados privados, posições e inclusão nas chamadas futuras ocorre em uma RPC transacional;
- aprovação pública usa bloqueio de linha, só aceita estado `pending` e não pode ser repetida;
- criação de evento materializa a série e popula a chamada do elenco no mesmo commit;
- alteração administrativa de presença confere evento, atleta ativo e time novamente no banco;
- `INSERT` direto em `athletes`, `athlete_private`, `venues`, `events` e `event_attendance` foi removido de `authenticated` para impedir agregados parciais;
- mudanças de status de atleta, evento e presença continuam registradas em `audit_logs` sem copiar PII.

## LGPD e privacidade

- definir controlador, operadores e base legal antes da coleta real;
- publicar Termos e Política de Privacidade versionados;
- coletar apenas dados necessários e registrar a versão aceita;
- permitir acesso, correção, portabilidade e eliminação conforme obrigação aplicável;
- definir retenção para cadastros rejeitados, auditoria, backups e notificações;
- formalizar DPA com fornecedores e mapear transferência internacional;
- não usar telefone para WhatsApp sem consentimento válido ou outra base legal revisada;
- usar `privacy_notes` apenas para informação operacional estritamente necessária, nunca dados sensíveis sem avaliação jurídica.

## Checklist antes de produção

- [ ] domínio e URLs de callback definitivos configurados;
- [ ] SMTP transacional próprio e políticas SPF/DKIM/DMARC;
- [ ] Turnstile e rate limiting ativos;
- [ ] MFA obrigatório para owners/admins quando o fluxo for implementado;
- [ ] segredos exclusivos por ambiente, rotação testada e sem legado `service_role`/`anon` quando possível;
- [ ] Supabase e Vercel na região definida, com backups/PITR e teste de restauração;
- [ ] previews protegidos e sem apontar para dados de produção;
- [ ] logs sem tokens, telefones, e-mails ou payloads de autenticação;
- [ ] alertas para erro, pico de cadastros, falhas de auth, RLS e outbox;
- [ ] política de retenção e rotina de exclusão implementadas;
- [ ] threat model revisado por feature e pentest independente concluído;
- [ ] plano de incidente com responsáveis, contatos e janela de comunicação;
- [ ] conta de serviço de deploy com mínimo privilégio e MFA nas contas humanas;

## Regras de contribuição

1. Não usar chave secreta em Client Component, variável `NEXT_PUBLIC_*`, log ou teste.
2. Toda tabela nova deve habilitar RLS no mesmo migration e ter teste positivo e negativo.
3. Toda escrita deve derivar o usuário da sessão verificada, nunca de `user_id` enviado pelo cliente.
4. Toda alteração de PII deve documentar finalidade, retenção e acesso.
5. Dependência nova precisa de justificativa, licença compatível e manutenção ativa.
6. Falhas de autorização, vazamento, injeção, bypass de anti-bot ou secret scanning bloqueiam o deploy.

Vulnerabilidades devem ser relatadas privadamente conforme `SECURITY.md`, sem abrir issue pública com detalhes exploráveis.
