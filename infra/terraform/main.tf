locals {
  repository_full_name = "${var.github_owner}/${var.github_repository}"
  supabase_url         = "https://${supabase_project.production.id}.supabase.co"
}

resource "supabase_project" "production" {
  organization_id         = var.supabase_organization_id
  name                    = "fut7-production"
  database_password       = var.supabase_database_password
  region                  = var.supabase_region
  instance_size           = var.supabase_instance_size
  legacy_api_keys_enabled = false

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [database_password]
  }
}

resource "supabase_settings" "production" {
  project_ref = supabase_project.production.id

  database = jsonencode({
    statement_timeout = "10s"
  })

  api = jsonencode({
    db_schema            = "public,storage,graphql_public"
    db_extra_search_path = "public,extensions"
    max_rows             = 1000
  })

  auth = jsonencode({
    site_url                                          = var.app_url
    uri_allow_list                                    = "${var.app_url}/auth/confirm,${var.app_url}/auth/recovery"
    disable_signup                                    = false
    jwt_exp                                           = 3600
    mailer_autoconfirm                                = false
    mailer_secure_email_change_enabled                = true
    mailer_otp_exp                                    = 600
    mailer_otp_length                                 = 6
    mailer_subjects_confirmation                      = "Confirme seu e-mail — FUT7"
    mailer_templates_confirmation_content             = <<-HTML
      <!doctype html>
      <html lang="pt-BR">
        <body style="margin:0;background:#f4f4f5;color:#18181b;font-family:Arial,sans-serif">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px">
            <tr><td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#fff;border-radius:16px;padding:32px">
                <tr><td>
                  <p style="margin:0 0 8px;color:#16a34a;font-size:14px;font-weight:700">FUT7</p>
                  <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25">Confirme seu e-mail</h1>
                  <p style="margin:0 0 24px;color:#52525b;font-size:16px;line-height:1.5">Confirme este endereço para concluir a criação da sua conta de administrador.</p>
                  <p style="margin:0 0 24px"><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=email&amp;next=/app" style="display:inline-block;border-radius:10px;background:#16a34a;color:#fff;padding:12px 20px;font-size:16px;font-weight:700;text-decoration:none">Confirmar e-mail</a></p>
                  <p style="margin:0;color:#71717a;font-size:13px;line-height:1.5">Este link é pessoal e expira em poucos minutos. Se você não criou esta conta, ignore esta mensagem.</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
      </html>
    HTML
    mailer_subjects_recovery                          = "Redefina sua senha — FUT7"
    mailer_templates_recovery_content                 = <<-HTML
      <!doctype html>
      <html lang="pt-BR">
        <body style="margin:0;background:#f4f4f5;color:#18181b;font-family:Arial,sans-serif">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px">
            <tr><td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#fff;border-radius:16px;padding:32px">
                <tr><td>
                  <p style="margin:0 0 8px;color:#16a34a;font-size:14px;font-weight:700">FUT7</p>
                  <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25">Redefina sua senha</h1>
                  <p style="margin:0 0 24px;color:#52525b;font-size:16px;line-height:1.5">Recebemos uma solicitação para recuperar sua conta administrativa.</p>
                  <p style="margin:0 0 24px"><a href="{{ .SiteURL }}/auth/recovery?token_hash={{ .TokenHash }}&amp;type=recovery" style="display:inline-block;border-radius:10px;background:#16a34a;color:#fff;padding:12px 20px;font-size:16px;font-weight:700;text-decoration:none">Escolher nova senha</a></p>
                  <p style="margin:0;color:#71717a;font-size:13px;line-height:1.5">Este link é pessoal, só pode ser usado uma vez e expira em poucos minutos. Se você não solicitou a recuperação, ignore esta mensagem.</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
      </html>
    HTML
    mailer_notifications_password_changed_enabled    = true
    mailer_subjects_password_changed_notification     = "Sua senha foi alterada — FUT7"
    mailer_templates_password_changed_notification_content = <<-HTML
      <!doctype html>
      <html lang="pt-BR">
        <body style="margin:0;background:#f4f4f5;color:#18181b;font-family:Arial,sans-serif">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px">
            <tr><td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#fff;border-radius:16px;padding:32px">
                <tr><td>
                  <p style="margin:0 0 8px;color:#16a34a;font-size:14px;font-weight:700">FUT7</p>
                  <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25">Sua senha foi alterada</h1>
                  <p style="margin:0 0 16px;color:#52525b;font-size:16px;line-height:1.5">A senha da sua conta administrativa foi atualizada e as sessões anteriores foram encerradas.</p>
                  <p style="margin:0;color:#71717a;font-size:13px;line-height:1.5">Se você não fez esta alteração, solicite uma nova recuperação imediatamente e avise o responsável pela plataforma.</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
      </html>
    HTML
    smtp_admin_email                                  = var.smtp_admin_email
    smtp_host                                         = var.smtp_host
    smtp_port                                         = var.smtp_port
    smtp_user                                         = var.smtp_user
    smtp_pass                                         = var.smtp_password
    smtp_sender_name                                  = var.smtp_sender_name
    smtp_max_frequency                                = 60
    rate_limit_email_sent                             = var.auth_email_rate_limit
    password_min_length                               = 12
    refresh_token_rotation_enabled                    = true
    external_phone_enabled                            = true
    sms_autoconfirm                                   = false
    sms_max_frequency                                 = 60
    sms_otp_exp                                       = 600
    sms_otp_length                                    = 6
    sms_provider                                      = "twilio"
    sms_template                                      = "Seu código FUT7 é {{ .Code }}"
    sms_twilio_account_sid                            = var.twilio_account_sid
    sms_twilio_auth_token                             = var.twilio_auth_token
    sms_twilio_message_service_sid                    = var.twilio_message_service_sid
    security_captcha_enabled                          = true
    security_captcha_provider                         = "turnstile"
    security_captcha_secret                           = var.turnstile_secret_key
    security_manual_linking_enabled                   = false
    security_update_password_require_reauthentication = true
  })

  storage = jsonencode({
    fileSizeLimit = 5242880
    features = {
      imageTransformation = { enabled = false }
      s3Protocol          = { enabled = false }
    }
  })
}

data "supabase_apikeys" "production" {
  project_ref = supabase_project.production.id
  depends_on  = [supabase_settings.production]
}

resource "vercel_project" "production" {
  name                                              = "fut7"
  framework                                         = "nextjs"
  node_version                                      = "24.x"
  git_fork_protection                               = true
  public_source                                     = false
  automatically_expose_system_environment_variables = false

  git_repository = {
    type = "github"
    repo = local.repository_full_name
  }
}

resource "vercel_project_environment_variable" "supabase_url" {
  project_id = vercel_project.production.id
  key        = "NEXT_PUBLIC_SUPABASE_URL"
  value_wo   = local.supabase_url
  target     = ["production"]
  sensitive  = true
  comment    = "Managed by Terraform. Public at runtime despite provider sensitivity."
}

resource "vercel_project_environment_variable" "supabase_publishable_key" {
  project_id = vercel_project.production.id
  key        = "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
  value_wo   = data.supabase_apikeys.production.publishable_key
  target     = ["production"]
  sensitive  = true
  comment    = "Managed by Terraform. Public browser key; authorization still relies on RLS."
}

resource "vercel_project_environment_variable" "supabase_secret_key" {
  project_id = vercel_project.production.id
  key        = "SUPABASE_SECRET_KEY"
  value_wo   = data.supabase_apikeys.production.secret_keys[0].api_key
  target     = ["production"]
  sensitive  = true
  comment    = "Server-only key that bypasses RLS. Never expose or log."
}

resource "vercel_project_environment_variable" "app_url" {
  project_id = vercel_project.production.id
  key        = "APP_URL"
  value_wo   = var.app_url
  target     = ["production"]
  sensitive  = true
  comment    = "Canonical production origin."
}

resource "vercel_project_environment_variable" "turnstile_site_key" {
  project_id = vercel_project.production.id
  key        = "NEXT_PUBLIC_TURNSTILE_SITE_KEY"
  value_wo   = var.turnstile_site_key
  target     = ["production"]
  sensitive  = true
  comment    = "Turnstile browser site key."
}

resource "vercel_project_environment_variable" "turnstile_secret_key" {
  project_id = vercel_project.production.id
  key        = "TURNSTILE_SECRET_KEY"
  value_wo   = var.turnstile_secret_key
  target     = ["production"]
  sensitive  = true
  comment    = "Turnstile server verification key."
}

resource "github_repository_ruleset" "main" {
  count       = var.enable_github_ruleset ? 1 : 0
  name        = "main-protection"
  repository  = var.github_repository
  target      = "branch"
  enforcement = "active"

  conditions {
    ref_name {
      include = ["~DEFAULT_BRANCH"]
      exclude = []
    }
  }

  rules {
    deletion                = true
    non_fast_forward        = true
    required_linear_history = true

    pull_request {
      allowed_merge_methods             = ["squash"]
      dismiss_stale_reviews_on_push     = true
      require_code_owner_review         = var.required_approvals > 0
      require_last_push_approval        = var.required_approvals > 0
      required_approving_review_count   = var.required_approvals
      required_review_thread_resolution = true
    }

    required_status_checks {
      strict_required_status_checks_policy = true

      required_check { context = "quality" }
      required_check { context = "database" }
      required_check { context = "dependency-review" }
      required_check { context = "analyze-javascript-typescript" }
      required_check { context = "terraform-check" }
    }
  }
}
