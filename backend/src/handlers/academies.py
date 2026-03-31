import os
import boto3
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler import APIGatewayHttpResolver
from aws_lambda_powertools.logging import correlation_paths
from aws_lambda_powertools.utilities.typing import LambdaContext

from middleware.auth_middleware import require_auth

# Initialize Powertools
logger = Logger()
tracer = Tracer()
app = APIGatewayHttpResolver()

# DynamoDB setup
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['TABLE_NAME'])


@app.get("/academies")
@require_auth(allowed_roles=["admin", "coach"])
@tracer.capture_method
def list_academies():
    """List all academies"""
    logger.info("Listing all academies")

    try:
        result = table.scan()
        items = result.get('Items', [])
        logger.info(f"Found {len(items)} academies")
        return {"academies": items}
    except Exception as e:
        logger.exception("Error listing academies")
        raise


@app.get("/academies/<academy_id>")
@require_auth(allowed_roles=["admin", "coach"])
@tracer.capture_method
def get_academy(academy_id: str):
    """Get a single academy by ID"""
    logger.info(f"Getting academy: {academy_id}")

    try:
        result = table.get_item(Key={'id': academy_id})

        if 'Item' not in result:
            logger.warning(f"Academy not found: {academy_id}")
            return {"error": "Academy not found"}, 404

        return result['Item']
    except Exception as e:
        logger.exception(f"Error getting academy {academy_id}")
        raise


@logger.inject_lambda_context(correlation_id_path=correlation_paths.API_GATEWAY_HTTP)
@tracer.capture_lambda_handler
def handler(event: dict, context: LambdaContext) -> dict:
    """Main Lambda handler with Powertools integration"""
    return app.resolve(event, context)
