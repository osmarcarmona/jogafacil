from dataclasses import dataclass, asdict, field
from typing import Optional, List
from datetime import datetime


@dataclass
class Schedule:
    """Schedule entity model"""
    id: str
    date: str
    teamId: str
    placeId: str
    startTime: str
    endTime: str
    type: str = 'training'
    opponent: Optional[str] = None
    notes: Optional[str] = None
    status: str = 'scheduled'
    academy: Optional[str] = None
    roster: Optional[List[str]] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

    def to_dict(self):
        """Convert to dictionary for DynamoDB"""
        return {k: v for k, v in asdict(self).items() if v is not None}

    @classmethod
    def from_dict(cls, data: dict):
        """Create Schedule from dictionary"""
        return cls(**{k: v for k, v in data.items() if k in cls.__annotations__})

    def validate(self):
        """Validate schedule data"""
        if not self.date:
            raise ValueError("Date is required")
        if not self.teamId:
            raise ValueError("Team ID is required")
        if not self.placeId:
            raise ValueError("Place ID is required")
        if not self.startTime or not self.endTime:
            raise ValueError("Start time and end time are required")
        if self.type not in ['training', 'match', 'friendly', 'tournament']:
            raise ValueError("Invalid schedule type")
        return True

    def is_match(self):
        """Check if schedule is a match"""
        return self.type in ['match', 'friendly', 'tournament']

    def duration_hours(self):
        """Calculate duration in hours"""
        try:
            start = datetime.strptime(self.startTime, '%H:%M')
            end = datetime.strptime(self.endTime, '%H:%M')
            duration = (end - start).seconds / 3600
            return duration
        except:
            return 0
