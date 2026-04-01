########################################
# VPC Module
########################################
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.1.0"

  name = "mern-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b"]
  public_subnets  = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnets = ["10.0.3.0/24", "10.0.4.0/24"]

  enable_nat_gateway      = true
  single_nat_gateway      = true
  map_public_ip_on_launch = true

  public_subnet_tags = {
    "kubernetes.io/role/elb" = "1"
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = "1"
  }

  tags = {
    "kubernetes.io/cluster/mern-cluster" = "shared"
  }
}

########################################
# EKS Cluster Module
########################################
module "eks" {
  source          = "terraform-aws-modules/eks/aws"
  version         = "20.0.0"

  cluster_name    = "mern-cluster"
  cluster_version = "1.31"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  enable_irsa = true

  cluster_addons = {
    coredns    = {}
    kube-proxy = {}
    vpc-cni    = {}
  }

  eks_managed_node_groups = {
    free_tier = {
      desired_size = 1
      max_size     = 1
      min_size     = 1
      instance_types = ["t3.small"]
      ami_type = "AL2023_x86_64_STANDARD"
      associate_public_ip_address = false
      capacity_type = "ON_DEMAND"

      iam_role_additional_policies = {
        s3 = aws_iam_policy.s3_access.arn
      }
    }
  }

  cluster_endpoint_public_access  = true
  cluster_endpoint_private_access = true
  enable_cluster_creator_admin_permissions = true
}

########################################
# ECR Repositories
########################################
resource "aws_ecr_repository" "backend" {
  name         = "mern-instagram-backend"
  force_delete = true
}


########################################
# Media S3 Bucket
########################################
resource "aws_s3_bucket" "media_bucket" {
  bucket        = "mern-instagram-media-123745-bucket"
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "media_access" {
  bucket                  = aws_s3_bucket.media_bucket.id
  depends_on              = [aws_s3_bucket.media_bucket]   # add this
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "media_public_read" {
  bucket     = aws_s3_bucket.media_bucket.id
  depends_on = [aws_s3_bucket_public_access_block.media_access]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = "*"
        Action    = ["s3:GetObject"]
        Resource  = "${aws_s3_bucket.media_bucket.arn}/*"
      }
    ]
  })
}

resource "aws_s3_bucket_cors_configuration" "media_cors" {
  bucket = aws_s3_bucket.media_bucket.id
  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST"]
    allowed_origins = ["*"]
    max_age_seconds = 3000
  }
}

########################################
# Frontend S3 Bucket (Static Hosting)
########################################
resource "aws_s3_bucket" "frontend" {
  bucket        = "mern-instagram-frontend-1237ft45"
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "frontend_access" {
  bucket                  = aws_s3_bucket.frontend.id
  depends_on              = [aws_s3_bucket.frontend]
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  index_document { suffix = "index.html" }
  error_document { key    = "index.html" }
}

resource "aws_s3_bucket_ownership_controls" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_policy" "frontend_public" {
  bucket     = aws_s3_bucket.frontend.id
  depends_on = [aws_s3_bucket_public_access_block.frontend_access]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = "*"
      Action    = ["s3:GetObject"]
      Resource  = "${aws_s3_bucket.frontend.arn}/*"
    }]
  })
}

########################################
# IAM Policy for S3 Access
########################################
resource "aws_iam_policy" "s3_access" {
  name = "s3-access-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:GetObject"]
        Resource = "${aws_s3_bucket.media_bucket.arn}/*"
      }
    ]
  })
}

########################################
# ALB Controller IRSA for EKS
########################################
module "alb_controller_irsa" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "~> 5.0"

  role_name                              = "alb-controller"
  attach_load_balancer_controller_policy = true

  oidc_providers = {
    main = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["kube-system:aws-load-balancer-controller"]
    }
  }

  depends_on = [module.eks]
}