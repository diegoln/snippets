# AdvanceWeekly Production Infrastructure
# This file defines all GCP resources using Terraform

terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
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

# Cloud Run Service
resource "google_cloud_run_service" "app" {
  name     = var.app_name
  location = var.region

  template {
    spec {
      service_account_name = google_service_account.app_service_account.email
      
      containers {
        image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app_repo.repository_id}/${var.app_name}:latest"
        
        ports {
          container_port = 3000
        }

        env {
          name  = "DATABASE_URL"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.db_url.secret_id
              key  = "latest"
            }
          }
        }

        env {
          name  = "NEXTAUTH_SECRET"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.nextauth_secret.secret_id
              key  = "latest"
            }
          }
        }

        env {
          name  = "NEXTAUTH_URL"
          value = "https://${var.app_name}-${random_id.service_suffix.hex}-uc.a.run.app"
        }

        env {
          name  = "OPENAI_API_KEY"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.openai_key.secret_id
              key  = "latest"
            }
          }
        }

        env {
          name  = "GOOGLE_CLIENT_ID"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.google_client_id.secret_id
              key  = "latest"
            }
          }
        }

        env {
          name  = "GOOGLE_CLIENT_SECRET"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.google_client_secret.secret_id
              key  = "latest"
            }
          }
        }

        resources {
          limits = {
            cpu    = "1000m"
            memory = "512Mi"
          }
        }
      }
    }

    metadata {
      annotations = {
        "autoscaling.knative.dev/maxScale" = "10"
        "run.googleapis.com/cloudsql-instances" = google_sql_database_instance.main.connection_name
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}

# Random suffix for unique URLs
resource "random_id" "service_suffix" {
  byte_length = 4
}

# Make Cloud Run service publicly accessible
resource "google_cloud_run_service_iam_member" "public_access" {
  service  = google_cloud_run_service.app.name
  location = google_cloud_run_service.app.location
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

output "app_url" {
  description = "Cloud Run service URL"
  value       = google_cloud_run_service.app.status[0].url
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