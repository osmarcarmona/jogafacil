from dataclasses import dataclass, asdict
from typing import Optional, List


@dataclass
class Place:
    """Place/Venue entity model"""
    id: str
    name: str
    address: str
    capacity: Optional[int] = None
    facilities: Optional[List[str]] = None
    coordinates: Optional[dict] = None
    availability: Optional[List[dict]] = None
    hourlyRate: Optional[float] = None
    status: str = 'active'
    academy: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

    def to_dict(self):
        """Convert to dictionary for DynamoDB"""
        return {k: v for k, v in asdict(self).items() if v is not None}

    @classmethod
    def from_dict(cls, data: dict):
        """Create Place from dictionary"""
        return cls(**{k: v for k, v in data.items() if k in cls.__annotations__})

    def validate(self):
        """Validate place data"""
        if not self.name or len(self.name.strip()) == 0:
            raise ValueError("Name is required")
        if not self.address or len(self.address.strip()) == 0:
            raise ValueError("Address is required")
        if self.capacity and self.capacity < 0:
            raise ValueError("Capacity must be positive")
        return True

    def has_facility(self, facility: str):
        """Check if place has specific facility"""
        if self.facilities:
            return facility in self.facilities
        return False
