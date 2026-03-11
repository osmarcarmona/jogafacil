import os
import uuid
from datetime import datetime
import boto3
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler import APIGatewayHttpResolver
from aws_lambda_powertools.logging import correlation_paths
from aws_lambda_powertools.utilities.typing import LambdaContext

# Initialize Powertools
logger = Logger()
tracer = Tracer()
app = APIGatewayHttpResolver()

# DynamoDB setup
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['TABLE_NAME'])


@app.get("/places")
@tracer.capture_method
def list_places():
    """List all places"""
    logger.info("Listing all places")
    
    try:
        result = table.scan()
        items = result.get('Items', [])
        logger.info(f"Found {len(items)} places")
        return {"places": items}
    except Exception as e:
        logger.exception("Error listing places")
        raise


@app.get("/places/<place_id>")
@tracer.capture_method
def get_place(place_id: str):
    """Get a single place by ID"""
    logger.info(f"Getting place: {place_id}")
    
    try:
        result = table.get_item(Key={'id': place_id})
        
        if 'Item' not in result:
            logger.warning(f"Place not found: {place_id}")
            return {"error": "Place not found"}, 404
        
        logger.info(f"Place found: {place_id}")
        return result['Item']
    except Exception as e:
        logger.exception(f"Error getting place {place_id}")
        raise


@app.post("/places")
@tracer.capture_method
def create_place():
    """Create a new place"""
    data = app.current_event.json_body
    logger.info("Creating place", extra={"data": data})
    
    try:
        place = {
            'id': str(uuid.uuid4()),
            'name': data.get('name'),
            'address': data.get('address'),
            'capacity': data.get('capacity'),
            'facilities': data.get('facilities', []),
            'coordinates': data.get('coordinates'),
            'availability': data.get('availability', []),
            'hourlyRate': data.get('hourlyRate'),
            'status': 'active',
            'academy': data.get('academy'),
            'createdAt': datetime.utcnow().isoformat(),
            'updatedAt': datetime.utcnow().isoformat()
        }
        
        place = {k: v for k, v in place.items() if v is not None}
        table.put_item(Item=place)
        logger.info(f"Place created successfully: {place['id']}")
        
        return place, 201
    except Exception as e:
        logger.exception("Error creating place")
        raise


@app.put("/places/<place_id>")
@tracer.capture_method
def update_place(place_id: str):
    """Update an existing place"""
    data = app.current_event.json_body
    logger.info(f"Updating place: {place_id}", extra={"data": data})
    
    try:
        update_expr = 'SET '
        expr_values = {}
        expr_names = {}
        
        fields = ['name', 'address', 'capacity', 'facilities', 'coordinates', 
                  'availability', 'hourlyRate', 'status', 'academy']
        
        for field in fields:
            if field in data:
                update_expr += f'#{field} = :{field}, '
                expr_values[f':{field}'] = data[field]
                expr_names[f'#{field}'] = field
        
        update_expr += '#updatedAt = :updatedAt'
        expr_values[':updatedAt'] = datetime.utcnow().isoformat()
        expr_names['#updatedAt'] = 'updatedAt'
        
        table.update_item(
            Key={'id': place_id},
            UpdateExpression=update_expr,
            ExpressionAttributeValues=expr_values,
            ExpressionAttributeNames=expr_names
        )
        
        logger.info(f"Place updated successfully: {place_id}")
        result = table.get_item(Key={'id': place_id})
        return result.get('Item', {})
    except Exception as e:
        logger.exception(f"Error updating place {place_id}")
        raise


@app.delete("/places/<place_id>")
@tracer.capture_method
def delete_place(place_id: str):
    """Delete a place"""
    logger.info(f"Deleting place: {place_id}")
    
    try:
        table.delete_item(Key={'id': place_id})
        logger.info(f"Place deleted successfully: {place_id}")
        return {"message": "Place deleted successfully"}
    except Exception as e:
        logger.exception(f"Error deleting place {place_id}")
        raise


@logger.inject_lambda_context(correlation_id_path=correlation_paths.API_GATEWAY_HTTP)
@tracer.capture_lambda_handler
def handler(event: dict, context: LambdaContext) -> dict:
    """Main Lambda handler with Powertools integration"""
    return app.resolve(event, context)
