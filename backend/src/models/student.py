from dataclasses import dataclass, asdict, field
from typing import Optional, List
from datetime import datetime


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
    academy: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

    def to_dict(self):
        """Convert to dictionary for DynamoDB"""
        return {k: v for k, v in asdict(self).items() if v is not None}

    @classmethod
    def from_dict(cls, data: dict):
        """Create Student from dictionary"""
        return cls(**{k: v for k, v in data.items() if k in cls.__annotations__})

    def validate(self):
        """Validate student data"""
        if not self.name or len(self.name.strip()) == 0:
            raise ValueError("Name is required")
        if not self.email or '@' not in self.email:
            raise ValueError("Valid email is required")
        if not self.phone:
            raise ValueError("Phone is required")
        return True
