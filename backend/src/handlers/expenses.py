import os
import uuid
from datetime import datetime
from decimal import Decimal
import boto3
from boto3.dynamodb.conditions import Attr
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


@app.get("/expenses")
@require_auth(allowed_roles=["admin"])
@tracer.capture_method
def list_expenses():
    """List all expenses, optionally filtered by academy"""
    academy = app.current_event.get_query_string_value("academy")
    logger.info("Listing expenses", extra={"academy": academy})

    try:
        if academy:
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

        logger.info(f"Found {len(items)} expenses")
        return {"expenses": items}
    except Exception as e:
        logger.exception("Error listing expenses")
        raise


@app.get("/expenses/<expense_id>")
@require_auth(allowed_roles=["admin"])
@tracer.capture_method
def get_expense(expense_id: str):
    """Get a single expense by ID"""
    logger.info(f"Getting expense: {expense_id}")

    try:
        result = table.get_item(Key={'id': expense_id})

        if 'Item' not in result:
            logger.warning(f"Expense not found: {expense_id}")
            return {"error": "Expense not found"}, 404

        logger.info(f"Expense found: {expense_id}")
        return result['Item']
    except Exception as e:
        logger.exception(f"Error getting expense {expense_id}")
        raise


@app.post("/expenses")
@require_auth(allowed_roles=["admin"])
@tracer.capture_method
def create_expense():
    """Create a new expense"""
    data = app.current_event.json_body
    logger.info("Creating expense", extra={"data": data})

    description = data.get('description', '')
    amount_raw = data.get('amount', 0)

    # Validate: reject empty/whitespace description or zero/negative amount
    if not description or len(description.strip()) == 0:
        return {"error": "Description is required"}, 400

    try:
        amount = Decimal(str(amount_raw))
    except Exception:
        return {"error": "Invalid amount"}, 400

    if amount <= 0:
        return {"error": "Amount must be greater than zero"}, 400

    try:
        expense = {
            'id': str(uuid.uuid4()),
            'description': description,
            'amount': amount,
            'category': data.get('category', 'Otro'),
            'dueDate': data.get('dueDate'),
            'month': data.get('month'),
            'status': data.get('status', 'pending'),
            'paidDate': data.get('paidDate'),
            'method': data.get('method'),
            'paidAmount': Decimal(str(data.get('paidAmount', 0))),
            'academy': data.get('academy'),
            'createdAt': datetime.utcnow().isoformat(),
            'updatedAt': datetime.utcnow().isoformat()
        }

        expense = {k: v for k, v in expense.items() if v is not None}
        table.put_item(Item=expense)
        logger.info(f"Expense created successfully: {expense['id']}")

        return expense, 201
    except Exception as e:
        logger.exception("Error creating expense")
        raise


@app.put("/expenses/<expense_id>")
@require_auth(allowed_roles=["admin"])
@tracer.capture_method
def update_expense(expense_id: str):
    """Update an existing expense"""
    data = app.current_event.json_body
    logger.info(f"Updating expense: {expense_id}", extra={"data": data})

    try:
        update_expr = 'SET '
        expr_values = {}
        expr_names = {}

        fields = ['description', 'category', 'dueDate', 'month', 'paidDate',
                  'status', 'method', 'academy']

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
            Key={'id': expense_id},
            UpdateExpression=update_expr,
            ExpressionAttributeValues=expr_values,
            ExpressionAttributeNames=expr_names
        )

        logger.info(f"Expense updated successfully: {expense_id}")
        result = table.get_item(Key={'id': expense_id})
        return result.get('Item', {})
    except Exception as e:
        logger.exception(f"Error updating expense {expense_id}")
        raise


@app.put("/expenses/<expense_id>/pay")
@require_auth(allowed_roles=["admin"])
@tracer.capture_method
def mark_expense_paid(expense_id: str):
    """Record a full or partial payment on an expense"""
    data = app.current_event.json_body
    logger.info(f"Recording payment for expense: {expense_id}", extra={"data": data})

    try:
        result = table.get_item(Key={'id': expense_id})

        if 'Item' not in result:
            logger.warning(f"Expense not found: {expense_id}")
            return {"error": "Expense not found"}, 404

        expense = result['Item']
        current_status = expense.get('status', '')

        if current_status in ('paid', 'cancelled'):
            logger.warning(f"Cannot record payment on expense {expense_id} — current status is {current_status}")
            return {"error": f"Cannot record a payment on a {current_status} record"}, 409

        paid_date = data.get('paidDate')
        method = data.get('method')

        if not paid_date:
            return {"error": "paidDate is required"}, 400
        if not method:
            return {"error": "method is required"}, 400

        total_amount = Decimal(str(expense.get('amount', 0)))
        previous_paid = Decimal(str(expense.get('paidAmount', 0)))

        pay_now = Decimal(str(data['paidAmount'])) if 'paidAmount' in data else (total_amount - previous_paid)

        if pay_now <= 0:
            return {"error": "Payment amount must be greater than zero"}, 400

        new_paid_total = previous_paid + pay_now
        new_status = 'paid' if new_paid_total >= total_amount else current_status

        # Build history entry
        history_entry = {
            'amount': pay_now,
            'date': paid_date,
            'method': method,
            'recordedAt': datetime.utcnow().isoformat()
        }

        update_expr = 'SET #paidAmount = :paidAmount, #method = :method, #updatedAt = :updatedAt, #paymentHistory = list_append(if_not_exists(#paymentHistory, :emptyList), :newEntry)'
        expr_values = {
            ':paidAmount': new_paid_total,
            ':method': method,
            ':updatedAt': datetime.utcnow().isoformat(),
            ':newEntry': [history_entry],
            ':emptyList': []
        }
        expr_names = {
            '#paidAmount': 'paidAmount',
            '#method': 'method',
            '#updatedAt': 'updatedAt',
            '#paymentHistory': 'paymentHistory'
        }

        if new_status == 'paid':
            update_expr += ', #status = :status, #paidDate = :paidDate'
            expr_values[':status'] = 'paid'
            expr_values[':paidDate'] = paid_date
            expr_names['#status'] = 'status'
            expr_names['#paidDate'] = 'paidDate'

        table.update_item(
            Key={'id': expense_id},
            UpdateExpression=update_expr,
            ExpressionAttributeValues=expr_values,
            ExpressionAttributeNames=expr_names
        )

        logger.info(f"Payment recorded for expense {expense_id}: {pay_now} of {total_amount} (total paid: {new_paid_total})")
        updated = table.get_item(Key={'id': expense_id})
        return updated.get('Item', {})
    except Exception as e:
        logger.exception(f"Error recording payment for expense {expense_id}")
        raise


@app.delete("/expenses/<expense_id>")
@require_auth(allowed_roles=["admin"])
@tracer.capture_method
def delete_expense(expense_id: str):
    """Delete an expense"""
    logger.info(f"Deleting expense: {expense_id}")

    try:
        table.delete_item(Key={'id': expense_id})
        logger.info(f"Expense deleted successfully: {expense_id}")
        return {"message": "Expense deleted successfully"}
    except Exception as e:
        logger.exception(f"Error deleting expense {expense_id}")
        raise


@logger.inject_lambda_context(correlation_id_path=correlation_paths.API_GATEWAY_HTTP)
@tracer.capture_lambda_handler
def handler(event: dict, context: LambdaContext) -> dict:
    """Main Lambda handler with Powertools integration"""
    return app.resolve(event, context)
