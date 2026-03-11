#!/bin/bash

# JogaFacil Frontend Deployment Script

set -e

STAGE=${1:-dev}
STACK_NAME="jogafacil-frontend-${STAGE}"
BACKEND_STACK_NAME="jogafacil-backend-${STAGE}"
REGION=${AWS_REGION:-us-west-1}
PROFILE="debitech"

echo "Deploying frontend infrastructure and application to ${STAGE} environment..."

# Get API endpoint from backend stack
echo "Getting API endpoint from backend stack..."
API_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name ${BACKEND_STACK_NAME} \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
  --output text \
  --region ${REGION} \
  --profile ${PROFILE} 2>/dev/null || echo "")

if [ -z "$API_ENDPOINT" ]; then
  echo "Warning: Backend stack not found or API endpoint not available."
  echo "Please deploy backend first with: ./deploy-backend.sh ${STAGE}"
  exit 1
fi

echo "Using API Endpoint: ${API_ENDPOINT}"

# Deploy Frontend Stack first (if not exists)
echo "Deploying frontend infrastructure..."
aws cloudformation deploy \
  --template-file infrastructure/frontend.yaml \
  --stack-name ${STACK_NAME} \
  --parameter-overrides Stage=${STAGE} Environment=${STAGE} \
  --region ${REGION} \
  --profile ${PROFILE}

echo "Frontend infrastructure deployed successfully!"

# Create .env.production with API endpoint
echo "Configuring API endpoint..."
cd frontend/jogafacil
echo "VITE_API_URL=${API_ENDPOINT}" > .env.production

echo "Building frontend..."
npm run build

echo "Getting S3 bucket name..."
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' \
  --output text \
  --region ${REGION} \
  --profile ${PROFILE})

echo "Uploading to S3 bucket: ${BUCKET_NAME}"
aws s3 sync dist/ s3://${BUCKET_NAME}/ --delete --region ${REGION} --profile ${PROFILE}

echo "Frontend deployed successfully!"

FRONTEND_URL=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendURL`].OutputValue' \
  --output text \
  --region ${REGION} \
  --profile ${PROFILE})

echo ""
echo "Deployment Summary:"
echo "==================="
echo "API Endpoint: ${API_ENDPOINT}"
echo "Frontend URL: ${FRONTEND_URL}"
echo ""
echo "The frontend is now connected to the backend API."
