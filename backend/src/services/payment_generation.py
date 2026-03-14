"""Pure payment generation logic — no DynamoDB dependency."""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Tuple


def generate_payments_for_academy(
    active_students: List[Dict[str, Any]],
    existing_payments: List[Dict[str, Any]],
    month: str,
    default_amount: Decimal,
) -> Tuple[List[Dict[str, Any]], int]:
    """Generate payment entries for active students who lack one for *month*.

    Args:
        active_students: list of student dicts (must have 'id', 'name', 'academy', 'paymentWindow').
        existing_payments: list of payment dicts already recorded for *month* (must have 'studentId').
        month: target month in ``YYYY-MM`` format.
        default_amount: fee amount for each new payment.

    Returns:
        A tuple ``(new_payments, skipped_count)`` where *new_payments* is a list
        of payment dicts ready to be persisted and *skipped_count* is the number
        of students that already had a payment.
    """
    paid_student_ids = {p['studentId'] for p in existing_payments}

    new_payments: List[Dict[str, Any]] = []
    skipped = 0

    now = datetime.utcnow().isoformat()

    for student in active_students:
        student_id = student['id']
        if student_id in paid_student_ids:
            skipped += 1
            continue

        window = int(student.get('paymentWindow', 1))
        day = '05' if window == 1 else '20'
        due_date = f"{month}-{day}"

        payment = {
            'id': str(uuid.uuid4()),
            'studentId': student_id,
            'studentName': student.get('name', ''),
            'amount': default_amount,
            'month': month,
            'dueDate': due_date,
            'status': 'pending',
            'academy': student.get('academy', ''),
            'createdAt': now,
            'updatedAt': now,
        }
        new_payments.append(payment)

    return new_payments, skipped
