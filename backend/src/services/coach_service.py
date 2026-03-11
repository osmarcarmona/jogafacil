import os
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from .base_service import BaseService


class CoachService(BaseService):
    """Service for coach operations"""
    
    def __init__(self):
        table_name = os.environ.get('TABLE_NAME', 'jogafacil-coaches-dev')
        super().__init__(table_name)
    
    def create_coach(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new coach"""
        coach = {
            'id': str(uuid.uuid4()),
            'name': data.get('name'),
            'email': data.get('email'),
            'phone': data.get('phone'),
            'specialty': data.get('specialty'),
            'certifications': data.get('certifications', []),
            'experience': data.get('experience'),
            'status': data.get('status', 'active'),
            'createdAt': datetime.utcnow().isoformat(),
            'updatedAt': datetime.utcnow().isoformat()
        }
        
        # Remove None values
        coach = {k: v for k, v in coach.items() if v is not None}
        
        return self.create(coach)
    
    def update_coach(self, coach_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update coach"""
        updates = {}
        
        fields = ['name', 'email', 'phone', 'specialty', 'certifications', 'experience', 'status']
        
        for field in fields:
            if field in data:
                updates[field] = data[field]
        
        updates['updatedAt'] = datetime.utcnow().isoformat()
        
        return self.update(coach_id, updates)
    
    def get_active_coaches(self) -> List[Dict[str, Any]]:
        """Get all active coaches"""
        return self.query_by_attribute('status', 'active')
    
    def get_coaches_by_specialty(self, specialty: str) -> List[Dict[str, Any]]:
        """Get coaches by specialty"""
        return self.query_by_attribute('specialty', specialty)
