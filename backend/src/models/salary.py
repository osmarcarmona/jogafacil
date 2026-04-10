import re
from dataclasses import dataclass, asdict
from typing import Optional, List
from decimal import Decimal


VALID_SALARY_STATUSES = ('pending', 'paid', 'overdue', 'cancelled')
VALID_PAYMENT_METHODS = ('cash', 'card', 'transfer', 'pix')
MONTH_PATTERN = re.compile(r'^\d{4}-(0[1-9]|1[0-2])$')


@dataclass
class Salary:
    """Salary entity model"""
    id: str
    coachId: str
    coachName: str
    teamId: str
    teamName: str
    scheduleEventId: str
    trainingDate: str
    month: str
    amount: Decimal
    status: str = 'pending'
    originalAmount: Optional[Decimal] = None
    dueDate: Optional[str] = None
    paidDate: Optional[str] = None
    method: Optional[str] = None
    paidAmount: Decimal = Decimal('0')
    paymentHistory: Optional[List[dict]] = None
    academy: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

    def to_dict(self):
        """Convert to dictionary for DynamoDB"""
        data = asdict(self)
        if isinstance(data.get('amount'), Decimal):
            data['amount'] = float(data['amount'])
        if isinstance(data.get('originalAmount'), Decimal):
            data['originalAmount'] = float(data['originalAmount'])
        if isinstance(data.get('paidAmount'), Decimal):
            data['paidAmount'] = float(data['paidAmount'])
        return {k: v for k, v in data.items() if v is not None}

    @classmethod
    def from_dict(cls, data: dict):
        """Create Salary from dictionary"""
        data = dict(data)
        for field in ('amount', 'originalAmount', 'paidAmount'):
            if field in data and data[field] is not None and not isinstance(data[field], Decimal):
                data[field] = Decimal(str(data[field]))
        return cls(**{k: v for k, v in data.items() if k in cls.__annotations__})

    def validate(self):
        """Validate salary data"""
        if not self.coachId:
            raise ValueError("Coach ID is required")
        if not self.coachName or len(self.coachName.strip()) == 0:
            raise ValueError("Coach name is required")
        if not self.teamId:
            raise ValueError("Team ID is required")
        if not self.teamName or len(self.teamName.strip()) == 0:
            raise ValueError("Team name is required")
        if not self.scheduleEventId:
            raise ValueError("Schedule event ID is required")
        if not self.trainingDate:
            raise ValueError("Training date is required")
        if not self.month or not MONTH_PATTERN.match(self.month):
            raise ValueError("Month is required and must be in YYYY-MM format")
        if self.amount is None or self.amount < 0:
            raise ValueError("Amount must be zero or greater")
        if self.status not in VALID_SALARY_STATUSES:
            raise ValueError("Invalid salary status")
        if self.method and self.method not in VALID_PAYMENT_METHODS:
            raise ValueError("Invalid payment method")
        return True
