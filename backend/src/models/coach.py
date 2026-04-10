from dataclasses import dataclass, asdict
from decimal import Decimal
from typing import Optional, List


@dataclass
class Coach:
    """Coach entity model"""
    id: str
    name: str
    email: str
    phone: str
    specialty: Optional[str] = None
    certifications: Optional[List[str]] = None
    experience: Optional[int] = None
    status: str = 'active'
    academy: Optional[str] = None
    salaryPerTraining: Decimal = Decimal('0')
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

    def to_dict(self):
        """Convert to dictionary for DynamoDB"""
        return {k: v for k, v in asdict(self).items() if v is not None}

    @classmethod
    def from_dict(cls, data: dict):
        """Create Coach from dictionary"""
        return cls(**{k: v for k, v in data.items() if k in cls.__annotations__})

    def validate(self):
        """Validate coach data"""
        if not self.name or len(self.name.strip()) == 0:
            raise ValueError("Name is required")
        if not self.email or '@' not in self.email:
            raise ValueError("Valid email is required")
        if not self.phone:
            raise ValueError("Phone is required")
        return True
