output "cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "cluster_name" {
  value = module.eks.cluster_name
}

output "media_bucket_name" {
  value = aws_s3_bucket.media_bucket.bucket
}

output "frontend_url" {
  value = aws_s3_bucket_website_configuration.frontend.website_endpoint
}

output "ecr_repository_url" {
  value = aws_ecr_repository.backend.repository_url
}

output "frontend_bucket_name" {
  value = aws_s3_bucket.frontend.bucket
}

output "alb_controller_role_arn" {
  value = module.alb_controller_irsa.iam_role_arn
}