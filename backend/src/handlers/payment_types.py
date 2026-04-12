import os
import uuid
from datetime import datetime
from decimal import Decimal
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


@app.get("/payment-types")
@require_auth(allowed_roles=["admin"])
@tracer.capture_method
def list_payment_types():
    """List all payment type templates, optionally filtered by academy"""
    academy = app.current_event.get_query_string_value("academy")
    logger.info("Listing payment type templates", extra={"academy": academy})

    try:
        if academy:
            from boto3.dynamodb.conditions import Attr
            result = table.scan(FilterExpression=Attr('academy').eq(academy))
        else:
            result = table.scan()
        items = result.get('Items', [])

        while 'LastEvaluatedKey' in result:
            if academy:
                result = table.scan(FilterExpression=Attr('academy').eq(academy), ExclusiveStartKey=result['LastEvaluatedKey'])
            else:
                result = table.scan(ExclusiveStartKey=result['LastEvaluatedKey'])
            items.extend(result.get('Items', []))

        logger.info(f"Found {len(items)} payment type templates")
        return {"paymentTypes": items}
    except Exception as e:
        logger.exception("Error listing payment type templates")
        raise


@app.get("/payment-types/<template_id>")
@require_auth(allowed_roles=["admin"])
@tracer.capture_method
def get_payment_type(template_id: str):
    """Get a single payment type template by ID"""
    logger.info(f"Getting payment type template: {template_id}")

    try:
        result = table.get_item(Key={'id': template_id})

        if 'Item' not in result:
            logger.warning(f"Payment type template not found: {template_id}")
            return {"error": "Payment type template not found"}, 404

        logger.info(f"Payment type template found: {template_id}")
        return result['Item']
    except Exception as e:
        logger.exception(f"Error getting payment type template {template_id}")
        raise


@app.post("/payment-types")
@require_auth(allowed_roles=["admin"])
@tracer.capture_method
def create_payment_type():
    """Create a new payment type template"""
    data = app.current_event.json_body
    logger.info("Creating payment type template", extra={"data": data})

    try:
        name = data.get('name')
        default_amount = data.get('defaultAmount')
        academy = data.get('academy')

        if not name or not str(name).strip():
            return {"error": "Name is required"}, 400

        if default_amount is None or Decimal(str(default_amount)) <= 0:
            return {"error": "Default amount must be greater than zero"}, 400

        if not academy or not str(academy).strip():
            return {"error": "Academy is required"}, 400

        # Enforce one "Inscripción" template per academy
        if name.strip().lower() == 'inscripción':
            from boto3.dynamodb.conditions import Attr
            existing = table.scan(
                FilterExpression=Attr('academy').eq(academy)
            )
            for item in existing.get('Items', []):
                if item.get('name', '').lower() == 'inscripción':
                    return {"error": "Ya existe una cuota de inscripción para esta academia."}, 400

        template = {
            'id': str(uuid.uuid4()),
            'name': name.strip(),
            'defaultAmount': Decimal(str(default_amount)),
            'academy': academy,
            'description': data.get('description'),
            'createdAt': datetime.utcnow().isoformat(),
            'updatedAt': datetime.utcnow().isoformat()
        }

        template = {k: v for k, v in template.items() if v is not None}
        table.put_item(Item=template)
        logger.info(f"Payment type template created: {template['id']}")

        return template, 201
    except Exception as e:
        logger.exception("Error creating payment type template")
        raise


@app.put("/payment-types/<template_id>")
@require_auth(allowed_roles=["admin"])
@tracer.capture_method
def update_payment_type(template_id: str):
    """Update an existing payment type template"""
    data = app.current_event.json_body
    logger.info(f"Updating payment type template: {template_id}", extra={"data": data})

    try:
        result = table.get_item(Key={'id': template_id})
        if 'Item' not in result:
            return {"error": "Payment type template not found"}, 404

        update_expr = 'SET '
        expr_values = {}
        expr_names = {}

        fields = ['name', 'description', 'academy']
        for field in fields:
            if field in data:
                update_expr += f'#{field} = :{field}, '
                expr_values[f':{field}'] = data[field]
                expr_names[f'#{field}'] = field

        if 'defaultAmount' in data:
            update_expr += '#defaultAmount = :defaultAmount, '
            expr_values[':defaultAmount'] = Decimal(str(data['defaultAmount']))
            expr_names['#defaultAmount'] = 'defaultAmount'

        update_expr += '#updatedAt = :updatedAt'
        expr_values[':updatedAt'] = datetime.utcnow().isoformat()
        expr_names['#updatedAt'] = 'updatedAt'

        table.update_item(
            Key={'id': template_id},
            UpdateExpression=update_expr,
            ExpressionAttributeValues=expr_values,
            ExpressionAttributeNames=expr_names
        )

        logger.info(f"Payment type template updated: {template_id}")
        updated = table.get_item(Key={'id': template_id})
        return updated.get('Item', {})
    except Exception as e:
        logger.exception(f"Error updating payment type template {template_id}")
        raise


@app.delete("/payment-types/<template_id>")
@require_auth(allowed_roles=["admin"])
@tracer.capture_method
def delete_payment_type(template_id: str):
    """Delete a payment type template"""
    logger.info(f"Deleting payment type template: {template_id}")

    try:
        table.delete_item(Key={'id': template_id})
        logger.info(f"Payment type template deleted: {template_id}")
        return {"message": "Payment type template deleted successfully"}
    except Exception as e:
        logger.exception(f"Error deleting payment type template {template_id}")
        raise


@logger.inject_lambda_context(correlation_id_path=correlation_paths.API_GATEWAY_HTTP)
@tracer.capture_lambda_handler
def handler(event: dict, context: LambdaContext) -> dict:
    """Main Lambda handler with Powertools integration"""
    return app.resolve(event, context)