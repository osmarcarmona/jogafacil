import os
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from .base_service import BaseService


class TeamService(BaseService):
    """Service for team operations"""
    
    def __init__(self):
        table_name = os.environ.get('TABLE_NAME', 'jogafacil-teams-dev')
        super().__init__(table_name)
    
    def create_team(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new team"""
        team = {
            'id': str(uuid.uuid4()),
            'name': data.get('name'),
            'category': data.get('category'),
            'coachId': data.get('coachId'),
            'schedule': data.get('schedule', []),
            'ageGroup': data.get('ageGroup'),
            'maxCapacity': data.get('maxCapacity'),
            'currentSize': data.get('currentSize', 0),
            'status': data.get('status', 'active'),
            'createdAt': datetime.utcnow().isoformat(),
            'updatedAt': datetime.utcnow().isoformat()
        }
        
        # Remove None values
        team = {k: v for k, v in team.items() if v is not None}
        
        return self.create(team)
    
    def update_team(self, team_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update team"""
        updates = {}
        
        fields = ['name', 'category', 'coachId', 'schedule', 'ageGroup', 
                  'maxCapacity', 'currentSize', 'status']
        
        for field in fields:
            if field in data:
                updates[field] = data[field]
        
        updates['updatedAt'] = datetime.utcnow().isoformat()
        
        return self.update(team_id, updates)
    
    def get_teams_by_coach(self, coach_id: str) -> List[Dict[str, Any]]:
        """Get all teams for a coach"""
        return self.query_by_attribute('coachId', coach_id)
    
    def get_teams_by_category(self, category: str) -> List[Dict[str, Any]]:
        """Get teams by category"""
        return self.query_by_attribute('category', category)
    
    def get_active_teams(self) -> List[Dict[str, Any]]:
        """Get all active teams"""
        return self.query_by_attribute('status', 'active')
