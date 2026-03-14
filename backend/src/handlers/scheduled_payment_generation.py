"""Scheduled Lambda handler — generates monthly payments for all academies."""

import os
import logging
from datetime import datetime
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Attr

logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

dynamodb = boto3.resource('dynamodb')

academies_table = dynamodb.Table(os.environ.get('ACADEMIES_TABLE_NAME', 'jogafacil-academies-dev'))
students_table = dynamodb.Table(os.environ.get('STUDENTS_TABLE_NAME', 'jogafacil-students-dev'))
payments_table = dynamodb.Table(os.environ.get('PAYMENTS_TABLE_NAME', 'jogafacil-payments-dev'))

DEFAULT_MONTHLY_FEE = Decimal(os.environ.get('DEFAULT_MONTHLY_FEE', '100'))


def _scan_all(table, **kwargs):
    """Paginated scan helper."""
    result = table.scan(**kwargs)
    items = result.get('Items', [])
    while 'LastEvaluatedKey' in result:
        result = table.scan(ExclusiveStartKey=result['LastEvaluatedKey'], **kwargs)
        items.extend(result.get('Items', []))
    return items


def handler(event, context):
    """Entry point invoked by EventBridge on a daily schedule."""
    from services.payment_generation import generate_payments_for_academy

    month = datetime.utcnow().strftime('%Y-%m')
    logger.info(f"Starting scheduled payment generation for month={month}")

    total_created = 0
    total_skipped = 0
    errors = []

    try:
        academies = _scan_all(academies_table)
    except Exception as exc:
        logger.exception("Failed to scan academies table")
        return {
            'totalCreated': 0,
            'totalSkipped': 0,
            'errors': [str(exc)],
        }

    for academy in academies:
        academy_id = academy.get('id', 'unknown')
        try:
            active_students = _scan_all(
                students_table,
                FilterExpression=Attr('academy').eq(academy_id) & Attr('status').eq('active'),
            )

            existing_payments = _scan_all(
                payments_table,
                FilterExpression=Attr('academy').eq(academy_id) & Attr('month').eq(month),
            )

            new_payments, skipped = generate_payments_for_academy(
                active_students, existing_payments, month, DEFAULT_MONTHLY_FEE,
            )

            for payment in new_payments:
                payments_table.put_item(Item=payment)

            total_created += len(new_payments)
            total_skipped += skipped

            logger.info(
                f"Academy {academy_id}: created={len(new_payments)}, skipped={skipped}"
            )
        except Exception as exc:
            logger.exception(f"Error processing academy {academy_id}")
            errors.append(f"academy={academy_id}: {exc}")

    summary = {
        'totalCreated': total_created,
        'totalSkipped': total_skipped,
        'errors': errors,
    }
    logger.info(f"Payment generation complete: {summary}")
    return summary
