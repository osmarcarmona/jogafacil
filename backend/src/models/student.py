from dataclasses import dataclass, asdict, field
from typing import Optional, List
from datetime import datetime


VALID_PAYMENT_WINDOWS = (1, 2)
VALID_STUDENT_STATUSES = ('active', 'inactive')


@dataclass
class Student:
    """Student entity model"""
    id: str
    name: str
    email: str
    phone: str
    teamIds: List[str] = field(default_factory=list)
    position: Optional[str] = None
    dateOfBirth: Optional[str] = None
    address: Optional[str] = None
    emergencyContact: Optional[str] = None
    emergencyPhone: Optional[str] = None
    status: str = 'active'
    paymentWindow: int = 1
    academy: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

    def to_dict(self):
        """Convert to dictionary for DynamoDB"""
        return {k: v for k, v in asdict(self).items() if v is not None}

    @classmethod
    def from_dict(cls, data: dict):
        """Create Student from dictionary"""
        filtered = {}
        for k, v in data.items():
            if k not in cls.__annotations__:
                continue
            if k == 'paymentWindow':
                filtered[k] = int(v)
            else:
                filtered[k] = v
        return cls(**filtered)

    def validate(self):
        """Validate student data"""
        if not self.name or len(self.name.strip()) == 0:
            raise ValueError("Name is required")
        if not self.email or '@' not in self.email:
            raise ValueError("Valid email is required")
        if not self.phone:
            raise ValueError("Phone is required")
        if self.paymentWindow not in VALID_PAYMENT_WINDOWS:
            raise ValueError("paymentWindow must be 1 or 2")
        if self.status not in VALID_STUDENT_STATUSES:
            raise ValueError("status must be 'active' or 'inactive'")
        return True
