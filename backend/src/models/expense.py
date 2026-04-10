import re
from dataclasses import dataclass, asdict
from typing import Optional, List
from decimal import Decimal


VALID_EXPENSE_STATUSES = ('pending', 'paid', 'overdue', 'cancelled')
VALID_EXPENSE_CATEGORIES = ('Alquiler', 'Equipamiento', 'Transporte', 'Servicios', 'Mantenimiento', 'Otro')
VALID_PAYMENT_METHODS = ('cash', 'card', 'transfer', 'pix')
MONTH_PATTERN = re.compile(r'^\d{4}-(0[1-9]|1[0-2])$')


@dataclass
class Expense:
    """Expense entity model"""
    id: str
    description: str
    amount: Decimal
    category: str
    dueDate: str
    month: str
    status: str = 'pending'
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
        # Convert Decimal to float for JSON serialization
        if isinstance(data.get('amount'), Decimal):
            data['amount'] = float(data['amount'])
        if isinstance(data.get('paidAmount'), Decimal):
            data['paidAmount'] = float(data['paidAmount'])
        return {k: v for k, v in data.items() if v is not None}

    @classmethod
    def from_dict(cls, data: dict):
        """Create Expense from dictionary"""
        data = dict(data)
        if 'amount' in data and not isinstance(data['amount'], Decimal):
            data['amount'] = Decimal(str(data['amount']))
        if 'paidAmount' in data and not isinstance(data['paidAmount'], Decimal):
            data['paidAmount'] = Decimal(str(data['paidAmount']))
        return cls(**{k: v for k, v in data.items() if k in cls.__annotations__})

    def validate(self):
        """Validate expense data"""
        if not self.description or len(self.description.strip()) == 0:
            raise ValueError("Description is required")
        if not self.amount or self.amount <= 0:
            raise ValueError("Amount must be greater than zero")
        if not self.category:
            raise ValueError("Category is required")
        if not self.dueDate:
            raise ValueError("Due date is required")
        if not self.month or not MONTH_PATTERN.match(self.month):
            raise ValueError("Month is required and must be in YYYY-MM format")
        if self.status not in VALID_EXPENSE_STATUSES:
            raise ValueError("Invalid expense status")
        if self.method and self.method not in VALID_PAYMENT_METHODS:
            raise ValueError("Invalid payment method")
        return True
