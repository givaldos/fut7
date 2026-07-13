terraform {
  required_version = ">= 1.11.0, < 2.0.0"

  # HCP Terraform supplies encrypted remote state and locking. The organization
  # and workspace are injected through TF_CLOUD_ORGANIZATION and TF_WORKSPACE.
  cloud {}

  required_providers {
    github = {
      source  = "integrations/github"
      version = "6.12.1"
    }
    supabase = {
      source  = "supabase/supabase"
      version = "1.9.1"
    }
    vercel = {
      source  = "vercel/vercel"
      version = "5.3.0"
    }
  }
}

provider "github" {
  owner = var.github_owner
}

provider "supabase" {}

provider "vercel" {
  team = var.vercel_team
}
