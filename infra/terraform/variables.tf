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
