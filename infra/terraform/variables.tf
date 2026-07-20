variable "github_owner" {
  description = "GitHub user or organization that owns the repository."
  type        = string
  default     = "givaldos"
}

variable "github_repository" {
  description = "GitHub repository name."
  type        = string
  default     = "fut7"
}

variable "enable_github_ruleset" {
  description = "Enable after the required checks have run at least once."
  type        = bool
  default     = false
}

variable "required_approvals" {
  description = "Required pull-request approvals. Start at zero for a solo maintainer and raise when another reviewer is available."
  type        = number
  default     = 0

  validation {
    condition     = var.required_approvals >= 0 && var.required_approvals <= 10
    error_message = "required_approvals must be between 0 and 10."
  }
}

variable "supabase_organization_id" {
  description = "Supabase organization slug."
  type        = string
}

variable "supabase_database_password" {
  description = "Strong, unique production database password. Keep it in a secrets manager."
  type        = string
  sensitive   = true
}

variable "supabase_region" {
  description = "Supabase database region close to Vercel gru1."
  type        = string
  default     = "sa-east-1"
}

variable "supabase_instance_size" {
  description = "Supabase compute size."
  type        = string
  default     = "micro"
}

variable "vercel_team" {
  description = "Optional Vercel team slug or ID. Null uses the personal account."
  type        = string
  default     = null
  nullable    = true
}

variable "app_url" {
  description = "Canonical HTTPS production URL without a trailing slash."
  type        = string

  validation {
    condition     = can(regex("^https://[^/]+$", var.app_url))
    error_message = "app_url must be an HTTPS origin without a trailing slash."
  }
}

variable "turnstile_site_key" {
  description = "Cloudflare Turnstile site key for the production hostname."
  type        = string
  sensitive   = true
}

variable "turnstile_secret_key" {
  description = "Cloudflare Turnstile secret key."
  type        = string
  sensitive   = true
}

variable "smtp_host" {
  description = "Transactional SMTP hostname used by Supabase Auth."
  type        = string

  validation {
    condition     = length(trimspace(var.smtp_host)) >= 3
    error_message = "smtp_host must be a valid SMTP hostname."
  }
}

variable "smtp_port" {
  description = "Transactional SMTP port. Usually 587 for STARTTLS or 465 for TLS."
  type        = number
  default     = 587

  validation {
    condition     = var.smtp_port >= 1 && var.smtp_port <= 65535
    error_message = "smtp_port must be between 1 and 65535."
  }
}

variable "smtp_user" {
  description = "Transactional SMTP username."
  type        = string
  sensitive   = true
}

variable "smtp_password" {
  description = "Transactional SMTP password or API key."
  type        = string
  sensitive   = true
}

variable "smtp_admin_email" {
  description = "Verified From address for authentication emails."
  type        = string

  validation {
    condition     = can(regex("^[^@[:space:]]+@[^@[:space:]]+\\.[^@[:space:]]+$", var.smtp_admin_email))
    error_message = "smtp_admin_email must be a valid email address."
  }
}

variable "smtp_sender_name" {
  description = "Sender name shown on authentication emails."
  type        = string
  default     = "FUT7"

  validation {
    condition     = length(trimspace(var.smtp_sender_name)) >= 2 && length(var.smtp_sender_name) <= 80
    error_message = "smtp_sender_name must be between 2 and 80 characters."
  }
}

variable "auth_email_rate_limit" {
  description = "Maximum authentication emails sent per hour by Supabase Auth."
  type        = number
  default     = 30

  validation {
    condition     = var.auth_email_rate_limit >= 2 && var.auth_email_rate_limit <= 1000
    error_message = "auth_email_rate_limit must be between 2 and 1000."
  }
}

variable "twilio_account_sid" {
  description = "Twilio Account SID used by Supabase Auth for WhatsApp OTP."
  type        = string
  sensitive   = true
}

variable "twilio_auth_token" {
  description = "Twilio auth token used by Supabase Auth. Keep it only in the HCP Terraform workspace."
  type        = string
  sensitive   = true
}

variable "twilio_message_service_sid" {
  description = "Twilio Messaging Service SID enabled for the WhatsApp sender."
  type        = string
  sensitive   = true
}
