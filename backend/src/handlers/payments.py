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
students_table = dynamodb.Table(os.environ.get('STUDENTS_TABLE_NAME', 'jogafacil-students-dev'))


@app.get("/payments")
@require_auth(allowed_roles=["admin"])
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
@require_auth(allowed_roles=["admin"])
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


@app.post("/payments/generate")
@require_auth(allowed_roles=["admin"])
@tracer.capture_method
def generate_payments():
    """Generate monthly payments for all active students in an academy."""
    from services.payment_generation import generate_payments_for_academy

    data = app.current_event.json_body
    academy = data.get('academy')
    month = data.get('month')
    logger.info("Generating payments", extra={"academy": academy, "month": month})

    if not academy or not month:
        return {"error": "academy and month are required"}, 400

    try:
        active_students = []
        result = students_table.scan(
            FilterExpression=Attr('academy').eq(academy) & Attr('status').eq('active')
        )
        active_students.extend(result.get('Items', []))
        while 'LastEvaluatedKey' in result:
            result = students_table.scan(
                FilterExpression=Attr('academy').eq(academy) & Attr('status').eq('active'),
                ExclusiveStartKey=result['LastEvaluatedKey'],
            )
            active_students.extend(result.get('Items', []))

        existing_payments = []
        result = table.scan(
            FilterExpression=Attr('academy').eq(academy) & Attr('month').eq(month)
        )
        existing_payments.extend(result.get('Items', []))
        while 'LastEvaluatedKey' in result:
            result = table.scan(
                FilterExpression=Attr('academy').eq(academy) & Attr('month').eq(month),
                ExclusiveStartKey=result['LastEvaluatedKey'],
            )
            existing_payments.extend(result.get('Items', []))

        default_amount = Decimal(os.environ.get('DEFAULT_MONTHLY_FEE', '100'))
        new_payments, skipped = generate_payments_for_academy(
            active_students, existing_payments, month, default_amount,
        )

        for payment in new_payments:
            table.put_item(Item=payment)

        logger.info(f"Generated {len(new_payments)} payments, skipped {skipped}")
        return {"created": len(new_payments), "skipped": skipped}
    except Exception as e:
        logger.exception("Error generating payments")
        raise


@app.post("/payments")
@require_auth(allowed_roles=["admin"])
@tracer.capture_method
def create_payment():
    """Create a new payment"""
    data = app.current_event.json_body
    logger.info("Creating payment", extra={"data": data})

    try:
        payment = {
            'id': str(uuid.uuid4()),
            'studentId': data.get('studentId'),
            'studentName': data.get('studentName'),
            'amount': Decimal(str(data.get('amount', 0))),
            'month': data.get('month'),
            'dueDate': data.get('dueDate'),
            'paidDate': data.get('paidDate'),
            'status': data.get('status', 'pending'),
            'paymentType': data.get('paymentType', 'custom'),
            'paymentTypeTemplateId': data.get('paymentTypeTemplateId'),
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
@require_auth(allowed_roles=["admin"])
@tracer.capture_method
def update_payment(payment_id: str):
    """Update an existing payment"""
    data = app.current_event.json_body
    logger.info(f"Updating payment: {payment_id}", extra={"data": data})

    try:
        update_expr = 'SET '
        expr_values = {}
        expr_names = {}

        fields = ['studentId', 'studentName', 'month', 'dueDate', 'paidDate',
                  'status', 'method', 'reference', 'description', 'academy',
                  'paymentType', 'paymentTypeTemplateId']

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


@app.put("/payments/<payment_id>/pay")
@require_auth(allowed_roles=["admin"])
@tracer.capture_method
def mark_payment_paid(payment_id: str):
    """Record a full or partial payment"""
    data = app.current_event.json_body
    logger.info(f"Recording payment for: {payment_id}", extra={"data": data})

    try:
        result = table.get_item(Key={'id': payment_id})

        if 'Item' not in result:
            logger.warning(f"Payment not found: {payment_id}")
            return {"error": "Payment not found"}, 404

        payment = result['Item']
        current_status = payment.get('status', '')

        if current_status in ('paid', 'cancelled'):
            logger.warning(f"Cannot record payment {payment_id} — current status is {current_status}")
            return {"error": f"Cannot record a payment on a {current_status} record"}, 409

        paid_date = data.get('paidDate')
        method = data.get('method')

        if not paid_date:
            return {"error": "paidDate is required"}, 400
        if not method:
            return {"error": "method is required"}, 400

        total_amount = Decimal(str(payment.get('amount', 0)))
        previous_paid = Decimal(str(payment.get('paidAmount', 0)))

        # If paidAmount is provided, use it; otherwise pay the full remaining balance
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
            Key={'id': payment_id},
            UpdateExpression=update_expr,
            ExpressionAttributeValues=expr_values,
            ExpressionAttributeNames=expr_names
        )

        logger.info(f"Payment recorded for {payment_id}: {pay_now} of {total_amount} (total paid: {new_paid_total})")
        updated = table.get_item(Key={'id': payment_id})
        return updated.get('Item', {})
    except Exception as e:
        logger.exception(f"Error recording payment {payment_id}")
        raise


@app.put("/payments/<payment_id>/history")
@require_auth(allowed_roles=["admin"])
@tracer.capture_method
def update_payment_history(payment_id: str):
    """Edit or delete an abono entry from paymentHistory"""
    data = app.current_event.json_body
    logger.info(f"Updating payment history for: {payment_id}", extra={"data": data})

    try:
        result = table.get_item(Key={'id': payment_id})
        if 'Item' not in result:
            return {"error": "Payment not found"}, 404

        payment = result['Item']
        history = payment.get('paymentHistory', [])
        index = data.get('index')
        action = data.get('action')  # 'edit' or 'delete'

        if index is None or index < 0 or index >= len(history):
            return {"error": "Invalid history index"}, 400

        if action == 'delete':
            history.pop(index)
        elif action == 'edit':
            entry = history[index]
            if 'amount' in data:
                entry['amount'] = Decimal(str(data['amount']))
            if 'date' in data:
                entry['date'] = data['date']
            if 'method' in data:
                entry['method'] = data['method']
            history[index] = entry
        else:
            return {"error": "action must be 'edit' or 'delete'"}, 400

        # Recalculate paidAmount from history
        new_paid_total = sum(Decimal(str(e.get('amount', 0))) for e in history)
        total_amount = Decimal(str(payment.get('amount', 0)))
        new_status = 'paid' if new_paid_total >= total_amount else ('pending' if payment.get('status') != 'overdue' else 'overdue')

        update_data = {
            ':history': history,
            ':paidAmount': new_paid_total,
            ':status': new_status,
            ':updatedAt': datetime.utcnow().isoformat()
        }

        # If no longer fully paid, clear paidDate
        if new_paid_total < total_amount:
            table.update_item(
                Key={'id': payment_id},
                UpdateExpression='SET #paymentHistory = :history, #paidAmount = :paidAmount, #status = :status, #updatedAt = :updatedAt REMOVE #paidDate',
                ExpressionAttributeValues=update_data,
                ExpressionAttributeNames={
                    '#paymentHistory': 'paymentHistory',
                    '#paidAmount': 'paidAmount',
                    '#status': 'status',
                    '#updatedAt': 'updatedAt',
                    '#paidDate': 'paidDate'
                }
            )
        else:
            table.update_item(
                Key={'id': payment_id},
                UpdateExpression='SET #paymentHistory = :history, #paidAmount = :paidAmount, #status = :status, #updatedAt = :updatedAt',
                ExpressionAttributeValues=update_data,
                ExpressionAttributeNames={
                    '#paymentHistory': 'paymentHistory',
                    '#paidAmount': 'paidAmount',
                    '#status': 'status',
                    '#updatedAt': 'updatedAt'
                }
            )

        logger.info(f"Payment history updated for {payment_id}, new paidAmount: {new_paid_total}")
        updated = table.get_item(Key={'id': payment_id})
        return updated.get('Item', {})
    except Exception as e:
        logger.exception(f"Error updating payment history {payment_id}")
        raise


@app.delete("/payments/<payment_id>")
@require_auth(allowed_roles=["admin"])
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
