#!/bin/bash

# JogaFacil Infrastructure Deployment Script

set -e

STAGE=${1:-dev}
STACK_NAME_BACKEND="jogafacil-backend-${STAGE}"
STACK_NAME_FRONTEND="jogafacil-frontend-${STAGE}"
REGION=${AWS_REGION:-us-west-1}
PROFILE="debitech"

echo "Deploying JogaFacil infrastructure to ${STAGE} environment in ${REGION} using profile ${PROFILE}"

# Deploy Backend Stack with SAM
echo "Building and deploying backend stack with SAM..."
sam build --template-file infrastructure/backend.yaml

sam deploy \
  --template-file infrastructure/backend.yaml \
  --stack-name ${STACK_NAME_BACKEND} \
  --parameter-overrides Stage=${STAGE} Environment=${STAGE} \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --region ${REGION} \
  --config-env ${STAGE} \
  --profile ${PROFILE} \
  --resolve-s3 \
  --no-confirm-changeset

echo "Backend stack deployed successfully!"

# Get API endpoint
API_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME_BACKEND} \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
  --output text \
  --region ${REGION} \
  --profile ${PROFILE})

echo "API Endpoint: ${API_ENDPOINT}"

# Deploy Frontend Stack
echo "Deploying frontend stack..."
aws cloudformation deploy \
  --template-file infrastructure/frontend.yaml \
  --stack-name ${STACK_NAME_FRONTEND} \
  --parameter-overrides Stage=${STAGE} Environment=${STAGE} \
  --region ${REGION} \
  --profile ${PROFILE}

echo "Frontend stack deployed successfully!"

# Get CloudFront URL
FRONTEND_URL=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME_FRONTEND} \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendURL`].OutputValue' \
  --output text \
  --region ${REGION} \
  --profile ${PROFILE})

echo "Frontend URL: ${FRONTEND_URL}"

echo ""
echo "Deployment complete!"
echo "API Endpoint: ${API_ENDPOINT}"
echo "Frontend URL: ${FRONTEND_URL}"
