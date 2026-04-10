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
from services.salary_generation import generate_salaries_for_month

# Initialize Powertools
logger = Logger()
tracer = Tracer()
app = APIGatewayHttpResolver()

# DynamoDB setup
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['TABLE_NAME'])
schedule_table = dynamodb.Table(os.environ['SCHEDULE_TABLE_NAME'])
coaches_table = dynamodb.Table(os.environ['COACHES_TABLE_NAME'])


@app.get("/salaries")
@require_auth(allowed_roles=["admin"])
@tracer.capture_method
def list_salaries():
    """List all salary records, optionally filtered by academy"""
    academy = app.current_event.get_query_string_value("academy")
    logger.info("Listing salaries", extra={"academy": academy})

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

        logger.info(f"Found {len(items)} salaries")
        return {"salaries": items}
    except Exception as e:
        logger.exception("Error listing salaries")
        raise


@app.get("/salaries/<salary_id>")
@require_auth(allowed_roles=["admin"])
@tracer.capture_method
def get_salary(salary_id: str):
    """Get a single salary record by ID"""
    logger.info(f"Getting salary: {salary_id}")

    try:
        result = table.get_item(Key={'id': salary_id})

        if 'Item' not in result:
            logger.warning(f"Salary not found: {salary_id}")
            return {"error": "Salary not found"}, 404

        logger.info(f"Salary found: {salary_id}")
        return result['Item']
    except Exception as e:
        logger.exception(f"Error getting salary {salary_id}")
        raise


@app.post("/salaries/generate")
@require_auth(allowed_roles=["admin"])
@tracer.capture_method
def generate_salaries():
    """Generate salary records from training events for a given month"""
    data = app.current_event.json_body
    month = data.get('month')
    academy = data.get('academy')
    logger.info("Generating salaries", extra={"month": month, "academy": academy})

    if not month:
        return {"error": "month is required"}, 400
    if not academy:
        return {"error": "academy is required"}, 400

    try:
        # Read training events for the month from schedule table
        schedule_result = schedule_table.scan(
            FilterExpression=Attr('academy').eq(academy) & Attr('type').eq('training')
        )
        all_events = schedule_result.get('Items', [])
        while 'LastEvaluatedKey' in schedule_result:
            schedule_result = schedule_table.scan(
                FilterExpression=Attr('academy').eq(academy) & Attr('type').eq('training'),
                ExclusiveStartKey=schedule_result['LastEvaluatedKey']
            )
            all_events.extend(schedule_result.get('Items', []))

        # Filter to events in the target month
        training_events = [e for e in all_events if e.get('date', '').startswith(month)]

        # Read coaches
        coaches_result = coaches_table.scan(
            FilterExpression=Attr('academy').eq(academy)
        )
        coaches = coaches_result.get('Items', [])
        while 'LastEvaluatedKey' in coaches_result:
            coaches_result = coaches_table.scan(
                FilterExpression=Attr('academy').eq(academy),
                ExclusiveStartKey=coaches_result['LastEvaluatedKey']
            )
            coaches.extend(coaches_result.get('Items', []))

        # Read existing salaries for this month
        salary_result = table.scan(
            FilterExpression=Attr('academy').eq(academy) & Attr('month').eq(month)
        )
        existing_salaries = salary_result.get('Items', [])
        while 'LastEvaluatedKey' in salary_result:
            salary_result = table.scan(
                FilterExpression=Attr('academy').eq(academy) & Attr('month').eq(month),
                ExclusiveStartKey=salary_result['LastEvaluatedKey']
            )
            existing_salaries.extend(salary_result.get('Items', []))

        # Generate using pure function
        new_salaries, skipped = generate_salaries_for_month(
            training_events=training_events,
            coaches=coaches,
            existing_salaries=existing_salaries,
            month=month,
            academy=academy,
        )

        # Write new salary records
        with table.batch_writer() as batch:
            for salary in new_salaries:
                batch.put_item(Item=salary)

        logger.info(f"Salary generation complete: created={len(new_salaries)}, skipped={skipped}")
        return {"created": len(new_salaries), "skipped": skipped}
    except Exception as e:
        logger.exception("Error generating salaries")
        raise


@app.put("/salaries/<salary_id>")
@require_auth(allowed_roles=["admin"])
@tracer.capture_method
def update_salary(salary_id: str):
    """Update an existing salary record (supports amount override)"""
    data = app.current_event.json_body
    logger.info(f"Updating salary: {salary_id}", extra={"data": data})

    try:
        # If amount is being changed, preserve originalAmount
        if 'amount' in data:
            existing = table.get_item(Key={'id': salary_id})
            if 'Item' not in existing:
                return {"error": "Salary not found"}, 404

            item = existing['Item']
            # Only set originalAmount if it hasn't been set yet
            if 'originalAmount' not in item or item.get('originalAmount') is None:
                data['originalAmount'] = item.get('amount', Decimal('0'))

        update_expr = 'SET '
        expr_values = {}
        expr_names = {}

        fields = ['coachId', 'coachName', 'teamId', 'teamName', 'trainingDate',
                  'month', 'dueDate', 'paidDate', 'status', 'method', 'academy']

        for field in fields:
            if field in data:
                update_expr += f'#{field} = :{field}, '
                expr_values[f':{field}'] = data[field]
                expr_names[f'#{field}'] = field

        if 'amount' in data:
            update_expr += '#amount = :amount, '
            expr_values[':amount'] = Decimal(str(data['amount']))
            expr_names['#amount'] = 'amount'

        if 'originalAmount' in data:
            update_expr += '#originalAmount = :originalAmount, '
            expr_values[':originalAmount'] = Decimal(str(data['originalAmount']))
            expr_names['#originalAmount'] = 'originalAmount'

        update_expr += '#updatedAt = :updatedAt'
        expr_values[':updatedAt'] = datetime.utcnow().isoformat()
        expr_names['#updatedAt'] = 'updatedAt'

        table.update_item(
            Key={'id': salary_id},
            UpdateExpression=update_expr,
            ExpressionAttributeValues=expr_values,
            ExpressionAttributeNames=expr_names
        )

        logger.info(f"Salary updated successfully: {salary_id}")
        result = table.get_item(Key={'id': salary_id})
        return result.get('Item', {})
    except Exception as e:
        logger.exception(f"Error updating salary {salary_id}")
        raise


@app.put("/salaries/<salary_id>/pay")
@require_auth(allowed_roles=["admin"])
@tracer.capture_method
def mark_salary_paid(salary_id: str):
    """Record a full or partial payment on a salary"""
    data = app.current_event.json_body
    logger.info(f"Recording payment for salary: {salary_id}", extra={"data": data})

    try:
        result = table.get_item(Key={'id': salary_id})

        if 'Item' not in result:
            logger.warning(f"Salary not found: {salary_id}")
            return {"error": "Salary not found"}, 404

        salary = result['Item']
        current_status = salary.get('status', '')

        if current_status in ('paid', 'cancelled'):
            logger.warning(f"Cannot record payment on salary {salary_id} — current status is {current_status}")
            return {"error": f"Cannot record a payment on a {current_status} record"}, 409

        paid_date = data.get('paidDate')
        method = data.get('method')

        if not paid_date:
            return {"error": "paidDate is required"}, 400
        if not method:
            return {"error": "method is required"}, 400

        total_amount = Decimal(str(salary.get('amount', 0)))
        previous_paid = Decimal(str(salary.get('paidAmount', 0)))

        pay_now = Decimal(str(data['paidAmount'])) if 'paidAmount' in data else (total_amount - previous_paid)

        if pay_now <= 0:
            return {"error": "Payment amount must be greater than zero"}, 400

        new_paid_total = previous_paid + pay_now
        new_status = 'paid' if new_paid_total >= total_amount else current_status

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
            Key={'id': salary_id},
            UpdateExpression=update_expr,
            ExpressionAttributeValues=expr_values,
            ExpressionAttributeNames=expr_names
        )

        logger.info(f"Payment recorded for salary {salary_id}: {pay_now} of {total_amount} (total paid: {new_paid_total})")
        updated = table.get_item(Key={'id': salary_id})
        return updated.get('Item', {})
    except Exception as e:
        logger.exception(f"Error recording payment for salary {salary_id}")
        raise


@app.delete("/salaries/<salary_id>")
@require_auth(allowed_roles=["admin"])
@tracer.capture_method
def delete_salary(salary_id: str):
    """Delete a salary record"""
    logger.info(f"Deleting salary: {salary_id}")

    try:
        table.delete_item(Key={'id': salary_id})
        logger.info(f"Salary deleted successfully: {salary_id}")
        return {"message": "Salary deleted successfully"}
    except Exception as e:
        logger.exception(f"Error deleting salary {salary_id}")
        raise


@logger.inject_lambda_context(correlation_id_path=correlation_paths.API_GATEWAY_HTTP)
@tracer.capture_lambda_handler
def handler(event: dict, context: LambdaContext) -> dict:
    """Main Lambda handler with Powertools integration"""
    return app.resolve(event, context)
