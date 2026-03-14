import re
from dataclasses import dataclass, asdict
from typing import Optional
from decimal import Decimal


VALID_PAYMENT_TYPES = ('mensualidad', 'inscripcion', 'custom')
VALID_PAYMENT_STATUSES = ('pending', 'paid', 'overdue', 'cancelled')
VALID_PAYMENT_METHODS = ('cash', 'card', 'transfer', 'pix')
MONTH_PATTERN = re.compile(r'^\d{4}-(0[1-9]|1[0-2])$')


@dataclass
class Payment:
    """Payment entity model"""
    id: str
    studentId: str
    studentName: str
    amount: Decimal
    month: str
    dueDate: str
    status: str = 'pending'
    paymentType: str = 'mensualidad'
    paymentTypeTemplateId: Optional[str] = None
    paidDate: Optional[str] = None
    method: Optional[str] = None
    reference: Optional[str] = None
    description: Optional[str] = None
    academy: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

    def to_dict(self):
        """Convert to dictionary for DynamoDB"""
        data = asdict(self)
        # Convert Decimal to float for JSON serialization
        if isinstance(data.get('amount'), Decimal):
            data['amount'] = float(data['amount'])
        return {k: v for k, v in data.items() if v is not None}

    @classmethod
    def from_dict(cls, data: dict):
        """Create Payment from dictionary"""
        if 'amount' in data and not isinstance(data['amount'], Decimal):
            data = dict(data)
            data['amount'] = Decimal(str(data['amount']))
        return cls(**{k: v for k, v in data.items() if k in cls.__annotations__})

    def validate(self):
        """Validate payment data"""
        if not self.studentId:
            raise ValueError("Student ID is required")
        if not self.studentName:
            raise ValueError("Student name is required")
        if not self.amount or self.amount <= 0:
            raise ValueError("Amount must be greater than zero")
        if not self.month or not MONTH_PATTERN.match(self.month):
            raise ValueError("Month is required and must be in YYYY-MM format")
        if not self.dueDate:
            raise ValueError("Due date is required")
        if self.status not in VALID_PAYMENT_STATUSES:
            raise ValueError("Invalid payment status")
        if self.paymentType not in VALID_PAYMENT_TYPES:
            raise ValueError("Invalid payment type")
        if self.method and self.method not in VALID_PAYMENT_METHODS:
            raise ValueError("Invalid payment method")
        return True

    def is_paid(self):
        """Check if payment is paid"""
        return self.status == 'paid'

    def is_overdue(self):
        """Check if payment is overdue"""
        return self.status == 'overdue'

    def mark_as_paid(self, paid_date: str, method: str):
        """Mark payment as paid"""
        self.status = 'paid'
        self.paidDate = paid_date
        self.method = method
