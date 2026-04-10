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


@app.get("/coaches")
@require_auth(allowed_roles=["admin", "coach"])
@tracer.capture_method
def list_coaches():
    """List all coaches, optionally filtered by academy"""
    academy = app.current_event.get_query_string_value("academy")
    logger.info("Listing coaches", extra={"academy": academy})
    
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
        
        logger.info(f"Found {len(items)} coaches")
        return {"coaches": items}
    except Exception as e:
        logger.exception("Error listing coaches")
        raise


@app.get("/coaches/<coach_id>")
@require_auth(allowed_roles=["admin", "coach"])
@tracer.capture_method
def get_coach(coach_id: str):
    """Get a single coach by ID"""
    logger.info(f"Getting coach: {coach_id}")
    
    try:
        result = table.get_item(Key={'id': coach_id})
        
        if 'Item' not in result:
            logger.warning(f"Coach not found: {coach_id}")
            return {"error": "Coach not found"}, 404
        
        logger.info(f"Coach found: {coach_id}")
        return result['Item']
    except Exception as e:
        logger.exception(f"Error getting coach {coach_id}")
        raise


@app.post("/coaches")
@require_auth(allowed_roles=["admin"])
@tracer.capture_method
def create_coach():
    """Create a new coach"""
    data = app.current_event.json_body
    logger.info("Creating coach", extra={"data": data})
    
    try:
        salary_raw = data.get('salaryPerTraining', 0)
        salary_per_training = Decimal(str(salary_raw)) if salary_raw else Decimal('0')

        coach = {
            'id': str(uuid.uuid4()),
            'name': data.get('name'),
            'email': data.get('email'),
            'phone': data.get('phone'),
            'specialty': data.get('specialty'),
            'certifications': data.get('certifications', []),
            'experience': data.get('experience'),
            'status': 'active',
            'academy': data.get('academy'),
            'salaryPerTraining': salary_per_training,
            'createdAt': datetime.utcnow().isoformat(),
            'updatedAt': datetime.utcnow().isoformat()
        }
        
        coach = {k: v for k, v in coach.items() if v is not None}
        table.put_item(Item=coach)
        logger.info(f"Coach created successfully: {coach['id']}")
        
        return coach, 201
    except Exception as e:
        logger.exception("Error creating coach")
        raise


@app.put("/coaches/<coach_id>")
@require_auth(allowed_roles=["admin"])
@tracer.capture_method
def update_coach(coach_id: str):
    """Update an existing coach"""
    data = app.current_event.json_body
    logger.info(f"Updating coach: {coach_id}", extra={"data": data})
    
    try:
        update_expr = 'SET '
        expr_values = {}
        expr_names = {}
        
        fields = ['name', 'email', 'phone', 'specialty', 'certifications', 'experience', 'status', 'academy']
        
        for field in fields:
            if field in data:
                update_expr += f'#{field} = :{field}, '
                expr_values[f':{field}'] = data[field]
                expr_names[f'#{field}'] = field
        
        if 'salaryPerTraining' in data:
            update_expr += '#salaryPerTraining = :salaryPerTraining, '
            salary_raw = data['salaryPerTraining']
            expr_values[':salaryPerTraining'] = Decimal(str(salary_raw)) if salary_raw else Decimal('0')
            expr_names['#salaryPerTraining'] = 'salaryPerTraining'

        update_expr += '#updatedAt = :updatedAt'
        expr_values[':updatedAt'] = datetime.utcnow().isoformat()
        expr_names['#updatedAt'] = 'updatedAt'
        
        table.update_item(
            Key={'id': coach_id},
            UpdateExpression=update_expr,
            ExpressionAttributeValues=expr_values,
            ExpressionAttributeNames=expr_names
        )
        
        logger.info(f"Coach updated successfully: {coach_id}")
        result = table.get_item(Key={'id': coach_id})
        return result.get('Item', {})
    except Exception as e:
        logger.exception(f"Error updating coach {coach_id}")
        raise


@app.delete("/coaches/<coach_id>")
@require_auth(allowed_roles=["admin"])
@tracer.capture_method
def delete_coach(coach_id: str):
    """Delete a coach"""
    logger.info(f"Deleting coach: {coach_id}")
    
    try:
        table.delete_item(Key={'id': coach_id})
        logger.info(f"Coach deleted successfully: {coach_id}")
        return {"message": "Coach deleted successfully"}
    except Exception as e:
        logger.exception(f"Error deleting coach {coach_id}")
        raise


@logger.inject_lambda_context(correlation_id_path=correlation_paths.API_GATEWAY_HTTP)
@tracer.capture_lambda_handler
def handler(event: dict, context: LambdaContext) -> dict:
    """Main Lambda handler with Powertools integration"""
    return app.resolve(event, context)
