import json
import os
import uuid
from datetime import datetime
from decimal import Decimal
import boto3
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler import APIGatewayHttpResolver
from aws_lambda_powertools.logging import correlation_paths
from aws_lambda_powertools.utilities.typing import LambdaContext

from services.inscription_payment import create_inscription_payment
from middleware.auth_middleware import require_auth

# Initialize Powertools
logger = Logger()
tracer = Tracer()
app = APIGatewayHttpResolver()

# DynamoDB setup
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['TABLE_NAME'])
payments_table = dynamodb.Table(os.environ.get('PAYMENTS_TABLE_NAME', 'Payments'))


@app.get("/students")
@require_auth(allowed_roles=["admin", "coach"])
@tracer.capture_method
def list_students():
    """List all students, optionally filtered by academy"""
    academy = app.current_event.get_query_string_value("academy")
    logger.info("Listing students", extra={"academy": academy})
    
    try:
        if academy:
            from boto3.dynamodb.conditions import Attr
            result = table.scan(FilterExpression=Attr('academy').eq(academy))
        else:
            result = table.scan()
        items = result.get('Items', [])
        
        # Handle pagination
        while 'LastEvaluatedKey' in result:
            if academy:
                result = table.scan(FilterExpression=Attr('academy').eq(academy), ExclusiveStartKey=result['LastEvaluatedKey'])
            else:
                result = table.scan(ExclusiveStartKey=result['LastEvaluatedKey'])
            items.extend(result.get('Items', []))
        
        logger.info(f"Found {len(items)} students")
        return {"students": items}
    except Exception as e:
        logger.exception("Error listing students")
        raise


@app.get("/students/<student_id>")
@require_auth(allowed_roles=["admin", "coach"])
@tracer.capture_method
def get_student(student_id: str):
    """Get a single student by ID"""
    logger.info(f"Getting student: {student_id}")
    
    try:
        result = table.get_item(Key={'id': student_id})
        
        if 'Item' not in result:
            logger.warning(f"Student not found: {student_id}")
            return {"error": "Student not found"}, 404
        
        logger.info(f"Student found: {student_id}")
        return result['Item']
    except Exception as e:
        logger.exception(f"Error getting student {student_id}")
        raise


@app.post("/students")
@require_auth(allowed_roles=["admin"])
@tracer.capture_method
def create_student():
    """Create a new student"""
    data = app.current_event.json_body
    logger.info("Creating student", extra={"data": data})
    
    try:
        payment_window = data.get('paymentWindow', 1)
        if payment_window not in (1, 2):
            return {"error": "paymentWindow must be 1 or 2"}, 400

        status = data.get('status', 'active')
        if status not in ('active', 'inactive'):
            return {"error": "status must be 'active' or 'inactive'"}, 400

        student = {
            'id': str(uuid.uuid4()),
            'name': data.get('name'),
            'email': data.get('email'),
            'phone': data.get('phone'),
            'teamIds': data.get('teamIds', []),
            'position': data.get('position'),
            'dateOfBirth': data.get('dateOfBirth'),
            'address': data.get('address'),
            'emergencyContact': data.get('emergencyContact'),
            'emergencyPhone': data.get('emergencyPhone'),
            'status': status,
            'paymentWindow': payment_window,
            'academy': data.get('academy'),
            'createdAt': datetime.utcnow().isoformat(),
            'updatedAt': datetime.utcnow().isoformat()
        }
        
        # Remove None values (but keep empty lists)
        student = {k: v for k, v in student.items() if v is not None}
        
        table.put_item(Item=student)
        logger.info(f"Student created successfully: {student['id']}")

        # Create inscription payment for active students
        if student.get('status') == 'active':
            try:
                default_fee = Decimal(os.environ.get('DEFAULT_INSCRIPTION_FEE', '50'))
                registration_date = student['createdAt'][:10]  # YYYY-MM-DD
                inscription = create_inscription_payment(student, registration_date, default_fee)
                if inscription:
                    payments_table.put_item(Item=inscription)
                    logger.info(f"Inscription payment created: {inscription['id']}")
            except Exception as e:
                logger.exception("Failed to create inscription payment, student was still created")

        return student, 201
    except Exception as e:
        logger.exception("Error creating student")
        raise


@app.put("/students/<student_id>")
@require_auth(allowed_roles=["admin"])
@tracer.capture_method
def update_student(student_id: str):
    """Update an existing student"""
    data = app.current_event.json_body
    logger.info(f"Updating student: {student_id}", extra={"data": data})
    
    try:
        # Validate paymentWindow if provided
        if 'paymentWindow' in data and data['paymentWindow'] not in (1, 2):
            return {"error": "paymentWindow must be 1 or 2"}, 400
        # Validate status if provided
        if 'status' in data and data['status'] not in ('active', 'inactive'):
            return {"error": "status must be 'active' or 'inactive'"}, 400

        update_expr = 'SET '
        expr_values = {}
        expr_names = {}
        
        fields = ['name', 'email', 'phone', 'teamIds', 'position', 'dateOfBirth', 
                  'address', 'emergencyContact', 'emergencyPhone', 'status', 'paymentWindow', 'academy']
        
        for field in fields:
            if field in data:
                update_expr += f'#{field} = :{field}, '
                expr_values[f':{field}'] = data[field]
                expr_names[f'#{field}'] = field
        
        update_expr += '#updatedAt = :updatedAt'
        expr_values[':updatedAt'] = datetime.utcnow().isoformat()
        expr_names['#updatedAt'] = 'updatedAt'
        
        table.update_item(
            Key={'id': student_id},
            UpdateExpression=update_expr,
            ExpressionAttributeValues=expr_values,
            ExpressionAttributeNames=expr_names
        )
        
        logger.info(f"Student updated successfully: {student_id}")
        
        # Return updated student
        result = table.get_item(Key={'id': student_id})
        return result.get('Item', {})
    except Exception as e:
        logger.exception(f"Error updating student {student_id}")
        raise


@app.delete("/students/<student_id>")
@require_auth(allowed_roles=["admin"])
@tracer.capture_method
def delete_student(student_id: str):
    """Delete a student"""
    logger.info(f"Deleting student: {student_id}")
    
    try:
        table.delete_item(Key={'id': student_id})
        logger.info(f"Student deleted successfully: {student_id}")
        
        return {"message": "Student deleted successfully"}
    except Exception as e:
        logger.exception(f"Error deleting student {student_id}")
        raise


@logger.inject_lambda_context(correlation_id_path=correlation_paths.API_GATEWAY_HTTP)
@tracer.capture_lambda_handler
def handler(event: dict, context: LambdaContext) -> dict:
    """Main Lambda handler with Powertools integration"""
    return app.resolve(event, context)
