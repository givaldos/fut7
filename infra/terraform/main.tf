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
    uri_allow_list                                    = "${var.app_url}/auth/confirm,${var.app_url}/update-password"
    disable_signup                                    = false
    jwt_exp                                           = 3600
    mailer_autoconfirm                                = false
    mailer_secure_email_change_enabled                = true
    mailer_otp_exp                                    = 600
    mailer_otp_length                                 = 6
    password_min_length                               = 12
    refresh_token_rotation_enabled                    = true
    security_captcha_enabled                          = false
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
