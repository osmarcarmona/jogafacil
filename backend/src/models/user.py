from dataclasses import dataclass, asdict
from typing import Optional

VALID_ROLES = ("admin", "coach")
VALID_STATUSES = ("active", "inactive")


@dataclass
class User:
    """User entity model for authentication and authorization"""
    id: str
    email: str
    passwordHash: str
    role: str
    name: str
    academy: str
    coachId: Optional[str] = None
    status: str = "active"
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

    def to_dict(self):
        """Convert to dictionary for DynamoDB storage"""
        return {k: v for k, v in asdict(self).items() if v is not None}

    @classmethod
    def from_dict(cls, data: dict):
        """Create User from dictionary"""
        return cls(**{k: v for k, v in data.items() if k in cls.__annotations__})

    def to_safe_dict(self):
        """Convert to dictionary excluding passwordHash for API responses"""
        return {k: v for k, v in asdict(self).items() if v is not None and k != "passwordHash"}

    def validate(self):
        """Validate user data"""
        if not self.name or len(self.name.strip()) == 0:
            raise ValueError("name is required")
        if not self.email or "@" not in self.email:
            raise ValueError("Valid email is required")
        if not self.passwordHash:
            raise ValueError("passwordHash is required")
        if self.role not in VALID_ROLES:
            raise ValueError("Role must be 'admin' or 'coach'")
        if not self.academy:
            raise ValueError("academy is required")
        if self.status not in VALID_STATUSES:
            raise ValueError("Status must be 'active' or 'inactive'")
        return True
