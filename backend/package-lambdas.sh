#!/bin/bash

# Package Lambda functions for deployment

set -e

STAGE=${1:-dev}
OUTPUT_DIR="dist"

echo "Packaging Lambda functions for ${STAGE} environment..."

# Create output directory
mkdir -p ${OUTPUT_DIR}

# Package each Lambda function
cd src

echo "Creating Lambda deployment package..."
zip -r ../${OUTPUT_DIR}/lambda-functions.zip handlers/ models/ services/ -x "*.pyc" -x "__pycache__/*"

cd ..

echo "Lambda functions packaged successfully!"
echo "Package location: ${OUTPUT_DIR}/lambda-functions.zip"
echo ""
echo "To deploy, upload to S3 and update CloudFormation template:"
echo "aws s3 cp ${OUTPUT_DIR}/lambda-functions.zip s3://your-bucket/lambda/"
