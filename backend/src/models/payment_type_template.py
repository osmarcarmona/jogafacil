from dataclasses import dataclass, asdict
from typing import Optional
from decimal import Decimal


@dataclass
class PaymentTypeTemplate:
    """Reusable payment type template for custom payments."""
    id: str
    name: str
    defaultAmount: Decimal
    academy: str
    description: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

    def to_dict(self):
        """Convert to dictionary for DynamoDB."""
        data = asdict(self)
        if isinstance(data.get('defaultAmount'), Decimal):
            data['defaultAmount'] = float(data['defaultAmount'])
        return {k: v for k, v in data.items() if v is not None}

    @classmethod
    def from_dict(cls, data: dict):
        """Create PaymentTypeTemplate from dictionary."""
        if 'defaultAmount' in data and not isinstance(data['defaultAmount'], Decimal):
            data = dict(data)
            data['defaultAmount'] = Decimal(str(data['defaultAmount']))
        return cls(**{k: v for k, v in data.items() if k in cls.__annotations__})

    def validate(self):
        """Validate template data."""
        if not self.name or not self.name.strip():
            raise ValueError("Name is required")
        if not self.defaultAmount or self.defaultAmount <= 0:
            raise ValueError("Default amount must be greater than zero")
        if not self.academy or not self.academy.strip():
            raise ValueError("Academy is required")
        return True
