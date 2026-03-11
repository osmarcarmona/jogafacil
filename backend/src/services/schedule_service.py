import os
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from .base_service import BaseService


class ScheduleService(BaseService):
    """Service for schedule operations"""
    
    def __init__(self):
        table_name = os.environ.get('TABLE_NAME', 'jogafacil-schedule-dev')
        super().__init__(table_name)
    
    def create_schedule(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new schedule entry"""
        schedule = {
            'id': str(uuid.uuid4()),
            'date': data.get('date'),
            'teamId': data.get('teamId'),
            'placeId': data.get('placeId'),
            'startTime': data.get('startTime'),
            'endTime': data.get('endTime'),
            'type': data.get('type', 'training'),
            'opponent': data.get('opponent'),
            'notes': data.get('notes'),
            'status': data.get('status', 'scheduled'),
            'createdAt': datetime.utcnow().isoformat(),
            'updatedAt': datetime.utcnow().isoformat()
        }
        
        # Remove None values
        schedule = {k: v for k, v in schedule.items() if v is not None}
        
        return self.create(schedule)
    
    def update_schedule(self, schedule_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update schedule"""
        updates = {}
        
        fields = ['date', 'teamId', 'placeId', 'startTime', 'endTime', 
                  'type', 'opponent', 'notes', 'status']
        
        for field in fields:
            if field in data:
                updates[field] = data[field]
        
        updates['updatedAt'] = datetime.utcnow().isoformat()
        
        return self.update(schedule_id, updates)
    
    def get_schedules_by_team(self, team_id: str) -> List[Dict[str, Any]]:
        """Get all schedules for a team"""
        return self.query_by_attribute('teamId', team_id)
    
    def get_schedules_by_place(self, place_id: str) -> List[Dict[str, Any]]:
        """Get all schedules for a place"""
        return self.query_by_attribute('placeId', place_id)
    
    def get_schedules_by_date(self, date: str) -> List[Dict[str, Any]]:
        """Get all schedules for a specific date"""
        return self.query_by_attribute('date', date)
    
    def get_schedules_by_type(self, schedule_type: str) -> List[Dict[str, Any]]:
        """Get schedules by type (training, match, etc.)"""
        return self.query_by_attribute('type', schedule_type)
