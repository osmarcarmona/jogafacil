import os
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from .base_service import BaseService


class PlaceService(BaseService):
    """Service for place operations"""
    
    def __init__(self):
        table_name = os.environ.get('TABLE_NAME', 'jogafacil-places-dev')
        super().__init__(table_name)
    
    def create_place(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new place"""
        place = {
            'id': str(uuid.uuid4()),
            'name': data.get('name'),
            'address': data.get('address'),
            'capacity': data.get('capacity'),
            'facilities': data.get('facilities', []),
            'coordinates': data.get('coordinates'),
            'availability': data.get('availability', []),
            'hourlyRate': data.get('hourlyRate'),
            'status': data.get('status', 'active'),
            'createdAt': datetime.utcnow().isoformat(),
            'updatedAt': datetime.utcnow().isoformat()
        }
        
        # Remove None values
        place = {k: v for k, v in place.items() if v is not None}
        
        return self.create(place)
    
    def update_place(self, place_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update place"""
        updates = {}
        
        fields = ['name', 'address', 'capacity', 'facilities', 'coordinates', 
                  'availability', 'hourlyRate', 'status']
        
        for field in fields:
            if field in data:
                updates[field] = data[field]
        
        updates['updatedAt'] = datetime.utcnow().isoformat()
        
        return self.update(place_id, updates)
    
    def get_active_places(self) -> List[Dict[str, Any]]:
        """Get all active places"""
        return self.query_by_attribute('status', 'active')
    
    def get_available_places(self) -> List[Dict[str, Any]]:
        """Get places with availability"""
        all_places = self.get_active_places()
        return [p for p in all_places if p.get('availability')]
