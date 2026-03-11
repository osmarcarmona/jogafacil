# JogaFacil Backend - Lambda Functions

Python Lambda functions for the JogaFacil application.

## Structure

```
backend/
├── src/
│   ├── handlers/
│   │   ├── students.py
│   │   ├── coaches.py
│   │   ├── teams.py
│   │   ├── places.py
│   │   ├── schedule.py
│   │   └── payments.py
│   ├── models/
│   │   ├── student.py
│   │   ├── coach.py
│   │   ├── team.py
│   │   ├── place.py
│   │   ├── schedule.py
│   │   └── payment.py
│   └── services/
│       ├── base_service.py
│       ├── student_service.py
│       ├── coach_service.py
│       ├── team_service.py
│       ├── place_service.py
│       ├── schedule_service.py
│       └── payment_service.py
└── package-lambdas.sh
```

## Functions

Each Lambda function provides CRUD operations for its respective resource:

- **Students**: Manage student records
- **Coaches**: Manage coach information
- **Teams**: Manage team data and assignments
- **Places**: Manage training locations
- **Schedule**: Manage training and match schedules
- **Payments**: Manage payment records and status

## API Operations

All endpoints support:
- `GET /resource` - List all items
- `GET /resource/{id}` - Get single item
- `POST /resource` - Create new item
- `PUT /resource/{id}` - Update item
- `DELETE /resource/{id}` - Delete item

## Deployment

### Package Lambda Functions

```bash
cd backend
./package-lambdas.sh dev
```

This creates a `dist/lambda-functions.zip` file with all handlers, models, and services.

### Deploy with CloudFormation

The CloudFormation template references the Lambda code from `../backend/src`. When deploying:

1. Package the functions:
```bash
cd backend
./package-lambdas.sh dev
```

2. Upload to S3 (optional for production):
```bash
aws s3 cp dist/lambda-functions.zip s3://your-bucket/lambda/
```

3. Deploy the stack:
```bash
cd ..
./deploy.sh dev
```

### Using SAM CLI (Alternative)

You can also use AWS SAM CLI to package and deploy:

```bash
sam build
sam deploy --guided
```

## Environment Variables

Each function expects:
- `TABLE_NAME`: DynamoDB table name (set automatically by CloudFormation)

## Response Format

All responses include CORS headers and follow this structure:

Success:
```json
{
  "statusCode": 200,
  "body": {
    "data": {}
  }
}
```

Error:
```json
{
  "statusCode": 400,
  "body": {
    "error": "Error message"
  }
}
```

## Local Testing

To test locally, install dependencies:
```bash
pip install boto3
```

Set environment variables:
```bash
export TABLE_NAME=jogafacil-students-dev
export AWS_REGION=us-east-1
```

## Dependencies

- boto3 (AWS SDK for Python) - included in Lambda runtime
- Standard library only (json, uuid, datetime, decimal)
