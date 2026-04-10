"""Pure salary generation logic — no DynamoDB dependency."""

import uuid
import calendar
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Tuple


def generate_salaries_for_month(
    training_events: List[Dict[str, Any]],
    coaches: List[Dict[str, Any]],
    existing_salaries: List[Dict[str, Any]],
    month: str,
    academy: str,
) -> Tuple[List[Dict[str, Any]], int]:
    """Generate salary records from training events for a given month.

    Args:
        training_events: schedule entries of type 'training' for the target month.
            Each must have 'id', 'coachId', 'teamId', 'date'.
        coaches: list of coach dicts. Each must have 'id', 'name', 'salaryPerTraining'.
        existing_salaries: salary records already created for this month.
            Each must have 'scheduleEventId' and 'coachId'.
        month: target month in ``YYYY-MM`` format.
        academy: academy identifier to stamp on new records.

    Returns:
        A tuple ``(new_salaries, skipped_count)``.
    """
    # Build a lookup of coaches by id
    coaches_by_id: Dict[str, Dict[str, Any]] = {c['id']: c for c in coaches}

    # Build a set of (scheduleEventId, coachId) already covered
    existing_keys = {
        (s['scheduleEventId'], s['coachId'])
        for s in existing_salaries
    }

    # Compute last day of month for default dueDate
    year, mon = int(month[:4]), int(month[5:7])
    last_day = calendar.monthrange(year, mon)[1]
    default_due_date = f"{month}-{last_day:02d}"

    new_salaries: List[Dict[str, Any]] = []
    skipped = 0
    now = datetime.utcnow().isoformat()

    for event in training_events:
        event_id = event['id']
        coach_id = event.get('coachId', '')

        if (event_id, coach_id) in existing_keys:
            skipped += 1
            continue

        coach = coaches_by_id.get(coach_id, {})
        salary_rate = Decimal(str(coach.get('salaryPerTraining', 0)))

        # Resolve team name from the event or fall back
        team_name = event.get('teamName', '')

        salary = {
            'id': str(uuid.uuid4()),
            'coachId': coach_id,
            'coachName': coach.get('name', ''),
            'teamId': event.get('teamId', ''),
            'teamName': team_name,
            'scheduleEventId': event_id,
            'trainingDate': event.get('date', ''),
            'month': month,
            'amount': salary_rate,
            'originalAmount': salary_rate,
            'status': 'pending',
            'dueDate': default_due_date,
            'paidAmount': Decimal('0'),
            'academy': academy,
            'createdAt': now,
            'updatedAt': now,
        }
        new_salaries.append(salary)

    return new_salaries, skipped
