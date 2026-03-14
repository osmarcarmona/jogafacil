import os
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any
from .base_service import BaseService


class PaymentTypeTemplateService(BaseService):
    """Service for payment type template operations."""

    def __init__(self):
        table_name = os.environ.get('TABLE_NAME', 'jogafacil-payment-type-templates-dev')
        super().__init__(table_name)

    def create_template(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new payment type template."""
        template = {
            'id': str(uuid.uuid4()),
            'name': data.get('name'),
            'defaultAmount': Decimal(str(data.get('defaultAmount', 0))),
            'academy': data.get('academy'),
            'description': data.get('description'),
            'createdAt': datetime.utcnow().isoformat(),
            'updatedAt': datetime.utcnow().isoformat()
        }

        # Validate required fields
        if not template['name'] or not str(template['name']).strip():
            raise ValueError("Name is required")
        if not template['defaultAmount'] or template['defaultAmount'] <= 0:
            raise ValueError("Default amount must be greater than zero")
        if not template['academy'] or not str(template['academy']).strip():
            raise ValueError("Academy is required")

        # Remove None values
        template = {k: v for k, v in template.items() if v is not None}

        return self.create(template)

    def update_template(self, template_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a payment type template."""
        updates = {}

        fields = ['name', 'description', 'academy']
        for field in fields:
            if field in data:
                updates[field] = data[field]

        if 'defaultAmount' in data:
            updates['defaultAmount'] = Decimal(str(data['defaultAmount']))

        updates['updatedAt'] = datetime.utcnow().isoformat()

        return self.update(template_id, updates)

    def get_templates_by_academy(self, academy: str) -> List[Dict[str, Any]]:
        """Get all payment type templates for an academy."""
        return self.query_by_attribute('academy', academy)
