output "supabase_project_ref" {
  description = "Supabase project reference used by CI deployment."
  value       = supabase_project.production.id
}

output "supabase_url" {
  description = "Public Supabase API origin."
  value       = local.supabase_url
}

output "vercel_project_id" {
  description = "Vercel project ID."
  value       = vercel_project.production.id
}
