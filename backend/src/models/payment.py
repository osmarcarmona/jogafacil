from dataclasses import dataclass, asdict
from typing import Optional
from decimal import Decimal


@dataclass
class Payment:
    """Payment entity model"""
    id: str
    studentId: str
    amount: Decimal
    dueDate: str
    status: str = 'pending'
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
            data['amount'] = Decimal(str(data['amount']))
        return cls(**{k: v for k, v in data.items() if k in cls.__annotations__})

    def validate(self):
        """Validate payment data"""
        if not self.studentId:
            raise ValueError("Student ID is required")
        if not self.amount or self.amount <= 0:
            raise ValueError("Amount must be greater than zero")
        if not self.dueDate:
            raise ValueError("Due date is required")
        if self.status not in ['pending', 'paid', 'overdue', 'cancelled']:
            raise ValueError("Invalid payment status")
        if self.method and self.method not in ['cash', 'card', 'transfer', 'pix']:
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
