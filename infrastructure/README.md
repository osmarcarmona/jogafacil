# JogaFacil Infrastructure

AWS SAM (Serverless Application Model) templates for deploying JogaFacil application.

## Architecture

### Backend Stack (jogafacil-backend-{stage})
- API Gateway HTTP API with CORS enabled
- Lambda functions (Python 3.11) deployed via SAM:
  - Students, Coaches, Teams, Places, Schedule, Payments
- DynamoDB tables for data persistence
- IAM roles and permissions

### Frontend Stack (jogafacil-frontend-{stage})
- S3 bucket for static website hosting
- CloudFront distribution for CDN
- Custom error pages for SPA routing

## Prerequisites

- AWS CLI configured with appropriate credentials
- AWS SAM CLI installed ([Installation Guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html))
- Docker (for building Lambda functions)
- Node.js and npm (for frontend build)

## Installation

### Install SAM CLI

```bash
# macOS
brew install aws-sam-cli

# Linux
pip install aws-sam-cli

# Verify installation
sam --version
```

## Deployment

### Quick Deploy (Recommended)

```bash
# Deploy full stack (backend + frontend) to dev environment
./deploy.sh dev

# Deploy full stack to staging
./deploy.sh staging

# Deploy full stack to production
./deploy.sh prod
```

### Deploy Backend Only

```bash
# Deploy only backend infrastructure
./deploy-backend.sh dev

# Deploy to other environments
./deploy-backend.sh staging
./deploy-backend.sh prod
```

### Deploy Frontend Only

```bash
# Deploy only frontend (requires backend to be deployed first)
./deploy-frontend.sh dev

# Deploy to other environments
./deploy-frontend.sh staging
./deploy-frontend.sh prod
```

### Manual SAM Deployment

```bash
# Build Lambda functions
sam build --template-file infrastructure/backend.yaml --use-container

# Deploy backend
sam deploy \
  --template-file infrastructure/backend.yaml \
  --stack-name jogafacil-backend-dev \
  --parameter-overrides Stage=dev Environment=dev \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --config-env dev

# Deploy frontend
aws cloudformation deploy \
  --template-file infrastructure/frontend.yaml \
  --stack-name jogafacil-frontend-dev \
  --parameter-overrides Stage=dev Environment=dev
```

### Update Frontend Application

After making changes to the React app, redeploy the frontend:

```bash
./deploy-frontend.sh dev
```

This will build the React app and sync it to S3, then invalidate the CloudFront cache.

## Local Development

### Run API Locally

```bash
# Start local API Gateway
sam local start-api --template-file infrastructure/backend.yaml

# API will be available at http://localhost:3000
```

### Invoke Function Locally

```bash
# Invoke a specific function
sam local invoke StudentsFunction --event events/get-students.json

# Generate sample event
sam local generate-event apigateway http-api-proxy > events/sample-event.json
```

### Test with Docker

```bash
# Build and test
sam build --use-container
sam local start-api --warm-containers EAGER
```

## SAM Configuration

The `samconfig.toml` file contains deployment configurations for different environments:

- **dev**: Auto-deploy without confirmation
- **staging**: Deploy with confirmation
- **prod**: Deploy with confirmation and additional safeguards

## Environment Variables

The deployment scripts use the following defaults:

```bash
AWS_REGION=us-west-1      # Default region
AWS_PROFILE=debitech      # AWS profile configured in scripts
```

To override the region:
```bash
export AWS_REGION=us-east-1
./deploy.sh dev
```

To use a different profile, edit the deployment scripts and update the `PROFILE` variable.

## Stack Outputs

### Backend Stack
- `ApiEndpoint`: API Gateway endpoint URL
- `StudentsTableName`: DynamoDB table for students
- `CoachesTableName`: DynamoDB table for coaches
- `TeamsTableName`: DynamoDB table for teams
- `PlacesTableName`: DynamoDB table for places
- `ScheduleTableName`: DynamoDB table for schedule
- `PaymentsTableName`: DynamoDB table for payments

### Frontend Stack
- `FrontendBucketName`: S3 bucket name
- `CloudFrontURL`: CloudFront distribution URL
- `CloudFrontDistributionId`: CloudFront distribution ID

## API Endpoints

Base URL: `https://{api-id}.execute-api.{region}.amazonaws.com/{stage}`

### Students
- `GET /students` - List all students
- `GET /students/{id}` - Get student by ID
- `POST /students` - Create student
- `PUT /students/{id}` - Update student
- `DELETE /students/{id}` - Delete student

### Coaches
- `GET /coaches` - List all coaches
- `GET /coaches/{id}` - Get coach by ID
- `POST /coaches` - Create coach
- `PUT /coaches/{id}` - Update coach
- `DELETE /coaches/{id}` - Delete coach

### Teams
- `GET /teams` - List all teams
- `GET /teams/{id}` - Get team by ID
- `POST /teams` - Create team
- `PUT /teams/{id}` - Update team
- `DELETE /teams/{id}` - Delete team

### Places
- `GET /places` - List all places
- `GET /places/{id}` - Get place by ID
- `POST /places` - Create place
- `PUT /places/{id}` - Update place
- `DELETE /places/{id}` - Delete place

### Schedule
- `GET /schedule` - List all schedules
- `GET /schedule/{id}` - Get schedule by ID
- `POST /schedule` - Create schedule
- `PUT /schedule/{id}` - Update schedule
- `DELETE /schedule/{id}` - Delete schedule

### Payments
- `GET /payments` - List all payments
- `GET /payments/{id}` - Get payment by ID
- `POST /payments` - Create payment
- `PUT /payments/{id}` - Update payment
- `DELETE /payments/{id}` - Delete payment

## Monitoring and Logs

### View Logs

```bash
# Tail logs for a function
sam logs --stack-name jogafacil-backend-dev --name StudentsFunction --tail

# View logs from CloudWatch
aws logs tail /aws/lambda/jogafacil-students-dev --follow
```

### Sync Changes (Development)

```bash
# Watch for changes and auto-deploy
sam sync --stack-name jogafacil-backend-dev --watch
```

## Cleanup

```bash
# Delete backend stack
sam delete --stack-name jogafacil-backend-dev

# Delete frontend stack
aws cloudformation delete-stack --stack-name jogafacil-frontend-dev

# Empty S3 bucket first if needed
aws s3 rm s3://jogafacil-frontend-dev --recursive
```

## Troubleshooting

### Build Issues

```bash
# Clean build artifacts
rm -rf .aws-sam

# Rebuild with verbose output
sam build --use-container --debug
```

### Deployment Issues

```bash
# Validate template
sam validate --template-file infrastructure/backend.yaml

# Check stack events
aws cloudformation describe-stack-events --stack-name jogafacil-backend-dev
```

## Cost Optimization

- DynamoDB uses PAY_PER_REQUEST billing mode (no provisioned capacity)
- Lambda functions use minimal configuration:
  - 128MB memory (lowest available)
  - 10 second timeout
- CloudFront uses PriceClass_100 (North America and Europe only)
- S3 bucket uses standard storage class
- No DynamoDB Streams or GSI indexes to minimize costs

## Security Notes

- API Gateway has CORS enabled for all origins (update for production)
- Lambda functions have minimal IAM permissions
- Consider adding API authentication (Cognito, API Keys) for production
- Enable AWS WAF for API Gateway in production
