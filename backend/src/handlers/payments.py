import os
import uuid
from datetime import datetime
from decimal import Decimal
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


@app.get("/payments")
@tracer.capture_method
def list_payments():
    """List all payments, optionally filtered by academy"""
    academy = app.current_event.get_query_string_value("academy")
    logger.info("Listing payments", extra={"academy": academy})
    
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
        
        logger.info(f"Found {len(items)} payments")
        return {"payments": items}
    except Exception as e:
        logger.exception("Error listing payments")
        raise


@app.get("/payments/<payment_id>")
@tracer.capture_method
def get_payment(payment_id: str):
    """Get a single payment by ID"""
    logger.info(f"Getting payment: {payment_id}")
    
    try:
        result = table.get_item(Key={'id': payment_id})
        
        if 'Item' not in result:
            logger.warning(f"Payment not found: {payment_id}")
            return {"error": "Payment not found"}, 404
        
        logger.info(f"Payment found: {payment_id}")
        return result['Item']
    except Exception as e:
        logger.exception(f"Error getting payment {payment_id}")
        raise


@app.post("/payments")
@tracer.capture_method
def create_payment():
    """Create a new payment"""
    data = app.current_event.json_body
    logger.info("Creating payment", extra={"data": data})
    
    try:
        payment = {
            'id': str(uuid.uuid4()),
            'studentId': data.get('studentId'),
            'amount': Decimal(str(data.get('amount', 0))),
            'dueDate': data.get('dueDate'),
            'paidDate': data.get('paidDate'),
            'status': data.get('status', 'pending'),
            'method': data.get('method'),
            'reference': data.get('reference'),
            'description': data.get('description'),
            'academy': data.get('academy'),
            'createdAt': datetime.utcnow().isoformat(),
            'updatedAt': datetime.utcnow().isoformat()
        }
        
        payment = {k: v for k, v in payment.items() if v is not None}
        table.put_item(Item=payment)
        logger.info(f"Payment created successfully: {payment['id']}")
        
        return payment, 201
    except Exception as e:
        logger.exception("Error creating payment")
        raise


@app.put("/payments/<payment_id>")
@tracer.capture_method
def update_payment(payment_id: str):
    """Update an existing payment"""
    data = app.current_event.json_body
    logger.info(f"Updating payment: {payment_id}", extra={"data": data})
    
    try:
        update_expr = 'SET '
        expr_values = {}
        expr_names = {}
        
        fields = ['studentId', 'dueDate', 'paidDate', 'status', 'method', 'reference', 'description', 'academy']
        
        for field in fields:
            if field in data:
                update_expr += f'#{field} = :{field}, '
                expr_values[f':{field}'] = data[field]
                expr_names[f'#{field}'] = field
        
        if 'amount' in data:
            update_expr += '#amount = :amount, '
            expr_values[':amount'] = Decimal(str(data['amount']))
            expr_names['#amount'] = 'amount'
        
        update_expr += '#updatedAt = :updatedAt'
        expr_values[':updatedAt'] = datetime.utcnow().isoformat()
        expr_names['#updatedAt'] = 'updatedAt'
        
        table.update_item(
            Key={'id': payment_id},
            UpdateExpression=update_expr,
            ExpressionAttributeValues=expr_values,
            ExpressionAttributeNames=expr_names
        )
        
        logger.info(f"Payment updated successfully: {payment_id}")
        result = table.get_item(Key={'id': payment_id})
        return result.get('Item', {})
    except Exception as e:
        logger.exception(f"Error updating payment {payment_id}")
        raise


@app.delete("/payments/<payment_id>")
@tracer.capture_method
def delete_payment(payment_id: str):
    """Delete a payment"""
    logger.info(f"Deleting payment: {payment_id}")
    
    try:
        table.delete_item(Key={'id': payment_id})
        logger.info(f"Payment deleted successfully: {payment_id}")
        return {"message": "Payment deleted successfully"}
    except Exception as e:
        logger.exception(f"Error deleting payment {payment_id}")
        raise


@logger.inject_lambda_context(correlation_id_path=correlation_paths.API_GATEWAY_HTTP)
@tracer.capture_lambda_handler
def handler(event: dict, context: LambdaContext) -> dict:
    """Main Lambda handler with Powertools integration"""
    return app.resolve(event, context)
