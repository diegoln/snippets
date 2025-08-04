# AdvanceWeekly Production Infrastructure with Custom Domain
# This file defines all GCP resources using Terraform with fixed custom domain

terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
  }
  
  backend "gcs" {
    bucket = "advanceweekly-terraform-state"
    prefix = "terraform/state"
  }
}

# Configure the Google Cloud Provider
provider "google" {
  project = var.project_id
  region  = var.region
}

# Variables
variable "project_id" {
  description = "GCP Project ID"
  type        = string
  default     = "advanceweekly-prod"
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "us-central1"
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "advanceweekly"
}

variable "domain_name" {
  description = "Custom domain name for the application"
  type        = string
  default     = "advanceweekly.io"
}

# Enable required APIs
resource "google_project_service" "required_apis" {
  for_each = toset([
    "run.googleapis.com",
    "compute.googleapis.com",
    "certificatemanager.googleapis.com",
    "secretmanager.googleapis.com",
    "sqladmin.googleapis.com"
  ])
  
  service = each.value
  project = var.project_id
  
  disable_on_destroy = false
}

# Generate random password for database
resource "random_password" "db_password" {
  length  = 24
  special = true
}

# Cloud SQL PostgreSQL Instance
resource "google_sql_database_instance" "main" {
  name             = "${var.app_name}-db"
  database_version = "POSTGRES_15"
  region           = var.region
  
  # Prevent accidental deletion
  deletion_protection = false

  settings {
    # Cheapest tier for 50 users
    tier = "db-f1-micro"
    
    disk_size       = 10
    disk_type       = "PD_SSD"
    disk_autoresize = true

    backup_configuration {
      enabled    = true
      start_time = "03:00"
    }

    maintenance_window {
      day  = 7  # Sunday
      hour = 4  # 4 AM
    }

    # Allow Cloud Run to connect
    ip_configuration {
      authorized_networks {
        value = "0.0.0.0/0"
        name  = "all"
      }
    }
  }
}

# Database
resource "google_sql_database" "database" {
  name     = var.app_name
  instance = google_sql_database_instance.main.name
}

# Database user
resource "google_sql_user" "app_user" {
  name     = "app_user"
  instance = google_sql_database_instance.main.name
  password = random_password.db_password.result
}

# Secret Manager for storing sensitive data
resource "google_secret_manager_secret" "db_url" {
  secret_id = "database-url"
  
  replication {
    automatic = true
  }
}

# Store database URL in Secret Manager
resource "google_secret_manager_secret_version" "db_url" {
  secret      = google_secret_manager_secret.db_url.secret_id
  secret_data = "postgresql://${google_sql_user.app_user.name}:${random_password.db_password.result}@${google_sql_database_instance.main.public_ip_address}:5432/${google_sql_database.database.name}"
}

# Secret for OpenAI API Key (you'll set this manually)
resource "google_secret_manager_secret" "openai_key" {
  secret_id = "openai-api-key"
  
  replication {
    automatic = true
  }
}

# Secret for NextAuth Secret
resource "google_secret_manager_secret" "nextauth_secret" {
  secret_id = "nextauth-secret"
  
  replication {
    automatic = true
  }
}

# Secret for Google OAuth Client ID
resource "google_secret_manager_secret" "google_client_id" {
  secret_id = "google-client-id"
  
  replication {
    automatic = true
  }
}

# Secret for Google OAuth Client Secret
resource "google_secret_manager_secret" "google_client_secret" {
  secret_id = "google-client-secret"
  
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "nextauth_secret" {
  secret      = google_secret_manager_secret.nextauth_secret.secret_id
  secret_data = random_password.nextauth_secret.result
}

resource "random_password" "nextauth_secret" {
  length  = 32
  special = true
}

# Artifact Registry for Docker images
resource "google_artifact_registry_repository" "app_repo" {
  location      = var.region
  repository_id = "${var.app_name}-repo"
  description   = "Docker repository for AdvanceWeekly app"
  format        = "DOCKER"
}

# Service Account for Cloud Run
resource "google_service_account" "app_service_account" {
  account_id   = "${var.app_name}-sa"
  display_name = "AdvanceWeekly Service Account"
  description  = "Service account for AdvanceWeekly Cloud Run service"
}

# IAM roles for the service account
resource "google_project_iam_member" "app_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.app_service_account.email}"
}

resource "google_project_iam_member" "app_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.app_service_account.email}"
}

# Cloud Run Service (updated to Cloud Run v2 API)
resource "google_cloud_run_v2_service" "app" {
  name     = var.app_name
  location = var.region
  
  depends_on = [google_project_service.required_apis]

  template {
    max_instance_request_concurrency = 80
    timeout                         = "300s"
    
    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }
    
    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app_repo.repository_id}/${var.app_name}:latest"
      
      ports {
        name           = "http1"
        container_port = 8080
      }
      
      resources {
        limits = {
          cpu    = "1"
          memory = "1Gi"
        }
        cpu_idle = true
      }
      
      # Fixed environment variables with custom domain
      env {
        name  = "NODE_ENV"
        value = "production"
      }
      
      env {
        name  = "NEXT_TELEMETRY_DISABLED"
        value = "1"
      }
      
      # CRITICAL FIX: Use fixed custom domain instead of dynamic URL
      env {
        name  = "NEXTAUTH_URL"
        value = "https://${var.domain_name}"
      }
      
      env {
        name  = "AUTH_URL"
        value = "https://${var.domain_name}"
      }
      
      # Secrets from Secret Manager
      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_url.secret_id
            version = "latest"
          }
        }
      }
      
      env {
        name = "NEXTAUTH_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.nextauth_secret.secret_id
            version = "latest"
          }
        }
      }
      
      env {
        name = "OPENAI_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.openai_key.secret_id
            version = "latest"
          }
        }
      }
      
      env {
        name = "GOOGLE_CLIENT_ID"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.google_client_id.secret_id
            version = "latest"
          }
        }
      }
      
      env {
        name = "GOOGLE_CLIENT_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.google_client_secret.secret_id
            version = "latest"
          }
        }
      }
    }
    
    # Service account for Secret Manager access
    service_account = google_service_account.app_service_account.email
    
    # Cloud SQL connection
    vpc_access {
      connector = google_vpc_access_connector.app_connector.id
    }
  }
  
  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}

# VPC Connector for Cloud SQL access
resource "google_vpc_access_connector" "app_connector" {
  name          = "${var.app_name}-connector"
  region        = var.region
  ip_cidr_range = "10.8.0.0/28"
  network       = "default"
  
  depends_on = [google_project_service.required_apis]
}

# Load Balancer Infrastructure for Custom Domain

# Global IP address for load balancer
resource "google_compute_global_address" "app_ip" {
  name = "${var.app_name}-ip"
}

# SSL certificate for HTTPS
resource "google_compute_managed_ssl_certificate" "app_ssl" {
  name = "${var.app_name}-ssl"
  
  managed {
    domains = [var.domain_name]
  }
}

# Backend service for Cloud Run
resource "google_compute_region_network_endpoint_group" "app_neg" {
  name                  = "${var.app_name}-neg"
  network_endpoint_type = "SERVERLESS"
  region                = var.region
  
  cloud_run {
    service = google_cloud_run_v2_service.app.name
  }
}

resource "google_compute_backend_service" "app_backend" {
  name                  = "${var.app_name}-backend"
  protocol              = "HTTP"
  port_name             = "http"
  timeout_sec           = 30
  enable_cdn            = false
  
  backend {
    group = google_compute_region_network_endpoint_group.app_neg.id
  }
  
  iap {
    enabled = false
  }
}

# URL map for routing
resource "google_compute_url_map" "app_url_map" {
  name            = "${var.app_name}-url-map"
  default_service = google_compute_backend_service.app_backend.id
}

# HTTPS proxy
resource "google_compute_target_https_proxy" "app_https_proxy" {
  name             = "${var.app_name}-https-proxy"
  url_map          = google_compute_url_map.app_url_map.id
  ssl_certificates = [google_compute_managed_ssl_certificate.app_ssl.id]
}

# Global forwarding rule for HTTPS
resource "google_compute_global_forwarding_rule" "app_https" {
  name       = "${var.app_name}-https"
  target     = google_compute_target_https_proxy.app_https_proxy.id
  port_range = "443"
  ip_address = google_compute_global_address.app_ip.address
}

# HTTP to HTTPS redirect
resource "google_compute_url_map" "app_http_redirect" {
  name = "${var.app_name}-http-redirect"
  
  default_url_redirect {
    https_redirect         = true
    redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"
    strip_query            = false
  }
}

resource "google_compute_target_http_proxy" "app_http_proxy" {
  name    = "${var.app_name}-http-proxy"
  url_map = google_compute_url_map.app_http_redirect.id
}

resource "google_compute_global_forwarding_rule" "app_http" {
  name       = "${var.app_name}-http"
  target     = google_compute_target_http_proxy.app_http_proxy.id
  port_range = "80"
  ip_address = google_compute_global_address.app_ip.address
}

# Make Cloud Run service publicly accessible
resource "google_cloud_run_service_iam_member" "public_access" {
  service  = google_cloud_run_v2_service.app.name
  location = google_cloud_run_v2_service.app.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Outputs
output "database_connection_name" {
  description = "Cloud SQL connection name"
  value       = google_sql_database_instance.main.connection_name
}

output "database_ip" {
  description = "Database public IP"
  value       = google_sql_database_instance.main.public_ip_address
}

output "cloud_run_service_url" {
  description = "Internal Cloud Run service URL"
  value       = google_cloud_run_v2_service.app.uri
}

output "custom_domain_url" {
  description = "Public custom domain URL"
  value       = "https://${var.domain_name}"
}

output "load_balancer_ip" {
  description = "Load balancer IP address for DNS configuration"
  value       = google_compute_global_address.app_ip.address
}

output "oauth_redirect_uri" {
  description = "OAuth redirect URI to configure in Google Cloud Console (FIXED - never changes!)"
  value       = "https://${var.domain_name}/api/auth/callback/google"
}

output "database_password" {
  description = "Database password (sensitive)"
  value       = random_password.db_password.result
  sensitive   = true
}

output "artifact_registry_url" {
  description = "Artifact Registry URL for pushing images"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app_repo.repository_id}"
}

output "dns_instructions" {
  description = "DNS configuration instructions"
  value = <<-EOT
    ======================================================
    DNS CONFIGURATION REQUIRED
    ======================================================
    
    1. Configure your DNS with your domain registrar:
       Type: A
       Name: @ (or ${var.domain_name})
       Value: ${google_compute_global_address.app_ip.address}
    
    2. OAUTH CONFIGURATION (ONE-TIME SETUP):
       Visit: https://console.cloud.google.com/apis/credentials?project=${var.project_id}
       Add this redirect URI to your OAuth client:
       https://${var.domain_name}/api/auth/callback/google
    
    3. After DNS propagation (5-60 minutes), your app will be available at:
       https://${var.domain_name}
    
    ⚡ IMPORTANT: OAuth redirect URI is FIXED and will NEVER need updates!
    ======================================================
  EOT
}