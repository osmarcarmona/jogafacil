from dataclasses import dataclass, asdict
from typing import Optional


@dataclass
class Academy:
    """Academy entity model"""
    id: str
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    status: str = 'active'
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

    def to_dict(self):
        """Convert to dictionary for DynamoDB"""
        return {k: v for k, v in asdict(self).items() if v is not None}

    @classmethod
    def from_dict(cls, data: dict):
        """Create Academy from dictionary"""
        return cls(**{k: v for k, v in data.items() if k in cls.__annotations__})

    def validate(self):
        """Validate academy data"""
        if not self.name or len(self.name.strip()) == 0:
            raise ValueError("Name is required")
        return True
