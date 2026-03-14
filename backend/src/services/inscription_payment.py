"""Pure inscription payment creation logic — no DynamoDB dependency."""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, Optional


def create_inscription_payment(
    student_data: Dict[str, Any],
    registration_date: str,
    default_amount: Decimal,
) -> Optional[Dict[str, Any]]:
    """Create an inscription payment dict for a newly registered student.

    Args:
        student_data: student dict (must have 'id', 'name', 'academy', 'status').
        registration_date: ISO date string (YYYY-MM-DD) of the student's registration.
        default_amount: the inscription fee amount.

    Returns:
        A payment dict ready to be persisted, or ``None`` if the student is not active.
    """
    if student_data.get('status') != 'active':
        return None

    now = datetime.utcnow().isoformat()
    month = registration_date[:7]  # 'YYYY-MM'

    return {
        'id': str(uuid.uuid4()),
        'studentId': student_data['id'],
        'studentName': student_data.get('name', ''),
        'amount': default_amount,
        'month': month,
        'dueDate': registration_date,
        'status': 'pending',
        'paymentType': 'inscripcion',
        'academy': student_data.get('academy', ''),
        'createdAt': now,
        'updatedAt': now,
    }
