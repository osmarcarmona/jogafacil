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


@app.get("/schedule")
@tracer.capture_method
def list_schedule():
    """List all schedule entries, optionally filtered by academy"""
    academy = app.current_event.get_query_string_value("academy")
    logger.info("Listing schedule", extra={"academy": academy})
    
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
        
        logger.info(f"Found {len(items)} schedule entries")
        return {"schedule": items}
    except Exception as e:
        logger.exception("Error listing schedule")
        raise


@app.get("/schedule/<schedule_id>")
@tracer.capture_method
def get_schedule(schedule_id: str):
    """Get a single schedule entry by ID"""
    logger.info(f"Getting schedule: {schedule_id}")
    
    try:
        result = table.get_item(Key={'id': schedule_id})
        
        if 'Item' not in result:
            logger.warning(f"Schedule not found: {schedule_id}")
            return {"error": "Schedule not found"}, 404
        
        logger.info(f"Schedule found: {schedule_id}")
        return result['Item']
    except Exception as e:
        logger.exception(f"Error getting schedule {schedule_id}")
        raise


@app.post("/schedule")
@tracer.capture_method
def create_schedule():
    """Create a new schedule entry"""
    data = app.current_event.json_body
    logger.info("Creating schedule", extra={"data": data})
    
    try:
        schedule = {
            'id': str(uuid.uuid4()),
            'date': data.get('date'),
            'teamId': data.get('teamId'),
            'coachId': data.get('coachId'),
            'placeId': data.get('placeId'),
            'startTime': data.get('startTime'),
            'endTime': data.get('endTime'),
            'arrivalTime': data.get('arrivalTime'),
            'type': data.get('type', 'training'),
            'opponent': data.get('opponent'),
            'kit': data.get('kit'),
            'matchType': data.get('matchType'),
            'notes': data.get('notes'),
            'roster': data.get('roster'),
            'status': 'scheduled',
            'academy': data.get('academy'),
            'createdAt': datetime.utcnow().isoformat(),
            'updatedAt': datetime.utcnow().isoformat()
        }
        
        schedule = {k: v for k, v in schedule.items() if v is not None}
        table.put_item(Item=schedule)
        logger.info(f"Schedule created successfully: {schedule['id']}")
        
        return schedule, 201
    except Exception as e:
        logger.exception("Error creating schedule")
        raise


@app.put("/schedule/<schedule_id>")
@tracer.capture_method
def update_schedule(schedule_id: str):
    """Update an existing schedule entry"""
    data = app.current_event.json_body
    logger.info(f"Updating schedule: {schedule_id}", extra={"data": data})
    
    try:
        update_expr = 'SET '
        expr_values = {}
        expr_names = {}
        
        fields = ['date', 'teamId', 'coachId', 'placeId', 'startTime', 'endTime',
                  'arrivalTime', 'type', 'opponent', 'kit', 'matchType', 'notes',
                  'status', 'academy', 'roster']
        
        for field in fields:
            if field in data:
                update_expr += f'#{field} = :{field}, '
                expr_values[f':{field}'] = data[field]
                expr_names[f'#{field}'] = field
        
        update_expr += '#updatedAt = :updatedAt'
        expr_values[':updatedAt'] = datetime.utcnow().isoformat()
        expr_names['#updatedAt'] = 'updatedAt'
        
        table.update_item(
            Key={'id': schedule_id},
            UpdateExpression=update_expr,
            ExpressionAttributeValues=expr_values,
            ExpressionAttributeNames=expr_names
        )
        
        logger.info(f"Schedule updated successfully: {schedule_id}")
        result = table.get_item(Key={'id': schedule_id})
        return result.get('Item', {})
    except Exception as e:
        logger.exception(f"Error updating schedule {schedule_id}")
        raise


@app.delete("/schedule/<schedule_id>")
@tracer.capture_method
def delete_schedule(schedule_id: str):
    """Delete a schedule entry"""
    logger.info(f"Deleting schedule: {schedule_id}")
    
    try:
        table.delete_item(Key={'id': schedule_id})
        logger.info(f"Schedule deleted successfully: {schedule_id}")
        return {"message": "Schedule deleted successfully"}
    except Exception as e:
        logger.exception(f"Error deleting schedule {schedule_id}")
        raise


@logger.inject_lambda_context(correlation_id_path=correlation_paths.API_GATEWAY_HTTP)
@tracer.capture_lambda_handler
def handler(event: dict, context: LambdaContext) -> dict:
    """Main Lambda handler with Powertools integration"""
    return app.resolve(event, context)
