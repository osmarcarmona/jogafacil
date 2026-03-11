from dataclasses import dataclass, asdict
from typing import Optional, List


@dataclass
class Team:
    """Team entity model"""
    id: str
    name: str
    category: str
    coachId: Optional[str] = None
    schedule: Optional[List[dict]] = None
    ageGroup: Optional[str] = None
    maxCapacity: Optional[int] = None
    currentSize: int = 0
    status: str = 'active'
    academy: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

    def to_dict(self):
        """Convert to dictionary for DynamoDB"""
        return {k: v for k, v in asdict(self).items() if v is not None}

    @classmethod
    def from_dict(cls, data: dict):
        """Create Team from dictionary"""
        return cls(**{k: v for k, v in data.items() if k in cls.__annotations__})

    def validate(self):
        """Validate team data"""
        if not self.name or len(self.name.strip()) == 0:
            raise ValueError("Name is required")
        if not self.category:
            raise ValueError("Category is required")
        if self.maxCapacity and self.currentSize > self.maxCapacity:
            raise ValueError("Current size cannot exceed max capacity")
        return True

    def is_full(self):
        """Check if team is at capacity"""
        if self.maxCapacity:
            return self.currentSize >= self.maxCapacity
        return False
