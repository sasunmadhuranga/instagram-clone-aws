pipeline {
    agent any

    triggers {
        githubPush()
    }

    environment {
        AWS_REGION = "us-east-1"
        ECR_REPO = "630596767614.dkr.ecr.us-east-1.amazonaws.com/mern-instagram-backend"
        IMAGE_TAG = "${BUILD_NUMBER}"
        AWS_BUCKET_NAME = "mern-instagram-frontend-1237ft45"
    }

    stages {

        stage('Clone Repo') {
            steps {
                git(
                    url: 'https://github.com/sasunmadhuranga/instagram-clone-aws.git',
                    branch: 'master',
                    credentialsId: 'github-creds'
                )
            }
        }

        // ================= BACKEND =================

        stage('Build Backend Image') {
            steps {
                dir('server') {
                    sh 'docker build -t instagram-backend .'
                }
            }
        }

        stage('Tag Backend Image') {
            steps {
                sh 'docker tag instagram-backend $ECR_REPO:$IMAGE_TAG'
            }
        }

        stage('Push Backend Image') {
            steps {
                sh '''
                aws ecr get-login-password --region $AWS_REGION | \
                docker login --username AWS --password-stdin $ECR_REPO

                docker push $ECR_REPO:$IMAGE_TAG
                '''
            }
        }

        stage('Deploy Backend to EKS') {
            steps {
                sh '''
                kubectl set image deployment/backend backend=$ECR_REPO:$IMAGE_TAG
                kubectl rollout status deployment/backend
                '''
            }
        }

        // ================== FRONTEND ==================

        stage('Build Frontend') {
            steps {
                dir('client') {
                    sh 'npm install'
                    sh 'npm run build'
                }
            }
        }

        stage('Deploy Frontend to S3') {
            steps {
                sh 'aws s3 sync client/build/ s3://$AWS_BUCKET_NAME'
            }
        }
    }
}