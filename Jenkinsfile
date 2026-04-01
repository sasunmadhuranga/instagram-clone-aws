pipeline {
    agent any

    environment {
        AWS_REGION = "us-east-1"
        ECR_REPO = "630596767614.dkr.ecr.us-east-1.amazonaws.com/mern-instagram-backend"
        IMAGE_TAG = "${BUILD_NUMBER}"
        AWS_BUCKET_NAME = "mern-instagram-frontend-1237ft45"
        REACT_APP_API_URL = "http://k8s-default-backendi-c43ba1e474-103569890.us-east-1.elb.amazonaws.com/api"
    }

    stages {

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
                withCredentials([aws(credentialsId: 'aws-creds',
                                     accessKeyVariable: 'AWS_ACCESS_KEY_ID',
                                     secretKeyVariable: 'AWS_SECRET_ACCESS_KEY')]) {
                    sh '''
                    aws ecr get-login-password --region $AWS_REGION | \
                    docker login --username AWS --password-stdin $ECR_REPO
                    docker push $ECR_REPO:$IMAGE_TAG
                    '''
                }
            }
        }

        stage('Deploy Backend to EKS') {
            steps {
                withCredentials([aws(credentialsId: 'aws-creds',
                                     accessKeyVariable: 'AWS_ACCESS_KEY_ID',
                                     secretKeyVariable: 'AWS_SECRET_ACCESS_KEY')]) {
                    sh '''
                    aws eks update-kubeconfig --region $AWS_REGION --name mern-cluster
                    kubectl set image deployment/backend backend=$ECR_REPO:$IMAGE_TAG
                    kubectl rollout status deployment/backend
                    '''
                }
            }
        }

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
                withCredentials([aws(credentialsId: 'aws-creds',
                                    accessKeyVariable: 'AWS_ACCESS_KEY_ID',
                                    secretKeyVariable: 'AWS_SECRET_ACCESS_KEY')]) {
                    sh """
                    aws s3 sync client/build/ s3://${AWS_BUCKET_NAME} --delete
                    """
                }
            }
        }
    }
}