import os
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from .base_service import BaseService


class StudentService(BaseService):
    """Service for student operations"""
    
    def __init__(self):
        table_name = os.environ.get('TABLE_NAME', 'jogafacil-students-dev')
        super().__init__(table_name)
    
    def create_student(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new student"""
        student = {
            'id': str(uuid.uuid4()),
            'name': data.get('name'),
            'email': data.get('email'),
            'phone': data.get('phone'),
            'teamId': data.get('teamId'),
            'dateOfBirth': data.get('dateOfBirth'),
            'address': data.get('address'),
            'emergencyContact': data.get('emergencyContact'),
            'emergencyPhone': data.get('emergencyPhone'),
            'status': data.get('status', 'active'),
            'createdAt': datetime.utcnow().isoformat(),
            'updatedAt': datetime.utcnow().isoformat()
        }
        
        # Remove None values
        student = {k: v for k, v in student.items() if v is not None}
        
        return self.create(student)
    
    def update_student(self, student_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update student"""
        updates = {}
        
        fields = ['name', 'email', 'phone', 'teamId', 'dateOfBirth', 
                  'address', 'emergencyContact', 'emergencyPhone', 'status']
        
        for field in fields:
            if field in data:
                updates[field] = data[field]
        
        updates['updatedAt'] = datetime.utcnow().isoformat()
        
        return self.update(student_id, updates)
    
    def get_students_by_team(self, team_id: str) -> List[Dict[str, Any]]:
        """Get all students in a team"""
        return self.query_by_attribute('teamId', team_id)
    
    def get_active_students(self) -> List[Dict[str, Any]]:
        """Get all active students"""
        return self.query_by_attribute('status', 'active')
