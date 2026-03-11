#!/bin/bash

# JogaFacil Backend Deployment Script

set -e

STAGE=${1:-dev}
STACK_NAME="jogafacil-backend-${STAGE}"
REGION=${AWS_REGION:-us-west-1}
PROFILE="debitech"

echo "Deploying JogaFacil backend to ${STAGE} environment in ${REGION} using profile ${PROFILE}"

# Build Lambda functions
echo "Building Lambda functions with SAM..."
sam build --template-file infrastructure/backend.yaml

# Package and deploy
echo "Packaging and deploying backend stack..."
sam deploy \
  --template-file .aws-sam/build/template.yaml \
  --stack-name ${STACK_NAME} \
  --parameter-overrides Stage=${STAGE} Environment=${STAGE} \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --region ${REGION} \
  --config-env ${STAGE} \
  --profile ${PROFILE} \
  --resolve-s3 \
  --no-confirm-changeset

echo "Backend stack deployed successfully!"

# Get stack outputs
echo ""
echo "Stack Outputs:"
echo "=============="

API_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
  --output text \
  --region ${REGION} \
  --profile ${PROFILE})

echo "API Endpoint: ${API_ENDPOINT}"

# Get all table names
STUDENTS_TABLE=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --query 'Stacks[0].Outputs[?OutputKey==`StudentsTableName`].OutputValue' \
  --output text \
  --region ${REGION} \
  --profile ${PROFILE})

COACHES_TABLE=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --query 'Stacks[0].Outputs[?OutputKey==`CoachesTableName`].OutputValue' \
  --output text \
  --region ${REGION} \
  --profile ${PROFILE})

TEAMS_TABLE=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --query 'Stacks[0].Outputs[?OutputKey==`TeamsTableName`].OutputValue' \
  --output text \
  --region ${REGION} \
  --profile ${PROFILE})

PLACES_TABLE=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --query 'Stacks[0].Outputs[?OutputKey==`PlacesTableName`].OutputValue' \
  --output text \
  --region ${REGION} \
  --profile ${PROFILE})

SCHEDULE_TABLE=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --query 'Stacks[0].Outputs[?OutputKey==`ScheduleTableName`].OutputValue' \
  --output text \
  --region ${REGION} \
  --profile ${PROFILE})

PAYMENTS_TABLE=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --query 'Stacks[0].Outputs[?OutputKey==`PaymentsTableName`].OutputValue' \
  --output text \
  --region ${REGION} \
  --profile ${PROFILE})

echo ""
echo "DynamoDB Tables:"
echo "  Students: ${STUDENTS_TABLE}"
echo "  Coaches: ${COACHES_TABLE}"
echo "  Teams: ${TEAMS_TABLE}"
echo "  Places: ${PLACES_TABLE}"
echo "  Schedule: ${SCHEDULE_TABLE}"
echo "  Payments: ${PAYMENTS_TABLE}"

echo ""
echo "Backend deployment complete!"
echo ""
echo "Test your API:"
echo "  curl ${API_ENDPOINT}/students"
