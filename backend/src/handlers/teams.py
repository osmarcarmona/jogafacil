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


@app.get("/teams")
@tracer.capture_method
def list_teams():
    """List all teams"""
    logger.info("Listing all teams")
    
    try:
        result = table.scan()
        items = result.get('Items', [])
        logger.info(f"Found {len(items)} teams")
        return {"teams": items}
    except Exception as e:
        logger.exception("Error listing teams")
        raise


@app.get("/teams/<team_id>")
@tracer.capture_method
def get_team(team_id: str):
    """Get a single team by ID"""
    logger.info(f"Getting team: {team_id}")
    
    try:
        result = table.get_item(Key={'id': team_id})
        
        if 'Item' not in result:
            logger.warning(f"Team not found: {team_id}")
            return {"error": "Team not found"}, 404
        
        logger.info(f"Team found: {team_id}")
        return result['Item']
    except Exception as e:
        logger.exception(f"Error getting team {team_id}")
        raise


@app.post("/teams")
@tracer.capture_method
def create_team():
    """Create a new team"""
    data = app.current_event.json_body
    logger.info("Creating team", extra={"data": data})
    
    try:
        team = {
            'id': str(uuid.uuid4()),
            'name': data.get('name'),
            'category': data.get('category'),
            'coachId': data.get('coachId'),
            'schedule': data.get('schedule', []),
            'ageGroup': data.get('ageGroup'),
            'maxCapacity': data.get('maxCapacity'),
            'currentSize': data.get('currentSize', 0),
            'status': 'active',
            'academy': data.get('academy'),
            'createdAt': datetime.utcnow().isoformat(),
            'updatedAt': datetime.utcnow().isoformat()
        }
        
        team = {k: v for k, v in team.items() if v is not None}
        table.put_item(Item=team)
        logger.info(f"Team created successfully: {team['id']}")
        
        return team, 201
    except Exception as e:
        logger.exception("Error creating team")
        raise


@app.put("/teams/<team_id>")
@tracer.capture_method
def update_team(team_id: str):
    """Update an existing team"""
    data = app.current_event.json_body
    logger.info(f"Updating team: {team_id}", extra={"data": data})
    
    try:
        update_expr = 'SET '
        expr_values = {}
        expr_names = {}
        
        fields = ['name', 'category', 'coachId', 'schedule', 'ageGroup', 
                  'maxCapacity', 'currentSize', 'status', 'academy']
        
        for field in fields:
            if field in data:
                update_expr += f'#{field} = :{field}, '
                expr_values[f':{field}'] = data[field]
                expr_names[f'#{field}'] = field
        
        update_expr += '#updatedAt = :updatedAt'
        expr_values[':updatedAt'] = datetime.utcnow().isoformat()
        expr_names['#updatedAt'] = 'updatedAt'
        
        table.update_item(
            Key={'id': team_id},
            UpdateExpression=update_expr,
            ExpressionAttributeValues=expr_values,
            ExpressionAttributeNames=expr_names
        )
        
        logger.info(f"Team updated successfully: {team_id}")
        result = table.get_item(Key={'id': team_id})
        return result.get('Item', {})
    except Exception as e:
        logger.exception(f"Error updating team {team_id}")
        raise


@app.delete("/teams/<team_id>")
@tracer.capture_method
def delete_team(team_id: str):
    """Delete a team"""
    logger.info(f"Deleting team: {team_id}")
    
    try:
        table.delete_item(Key={'id': team_id})
        logger.info(f"Team deleted successfully: {team_id}")
        return {"message": "Team deleted successfully"}
    except Exception as e:
        logger.exception(f"Error deleting team {team_id}")
        raise


@logger.inject_lambda_context(correlation_id_path=correlation_paths.API_GATEWAY_HTTP)
@tracer.capture_lambda_handler
def handler(event: dict, context: LambdaContext) -> dict:
    """Main Lambda handler with Powertools integration"""
    return app.resolve(event, context)
