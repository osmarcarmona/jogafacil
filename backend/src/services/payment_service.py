import os
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any
from .base_service import BaseService


class PaymentService(BaseService):
    """Service for payment operations"""
    
    def __init__(self):
        table_name = os.environ.get('TABLE_NAME', 'jogafacil-payments-dev')
        super().__init__(table_name)
    
    def create_payment(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new payment"""
        payment = {
            'id': str(uuid.uuid4()),
            'studentId': data.get('studentId'),
            'studentName': data.get('studentName'),
            'amount': Decimal(str(data.get('amount', 0))),
            'month': data.get('month'),
            'dueDate': data.get('dueDate'),
            'paidDate': data.get('paidDate'),
            'status': data.get('status', 'pending'),
            'method': data.get('method'),
            'reference': data.get('reference'),
            'description': data.get('description'),
            'academy': data.get('academy'),
            'createdAt': datetime.utcnow().isoformat(),
            'updatedAt': datetime.utcnow().isoformat()
        }
        
        # Remove None values
        payment = {k: v for k, v in payment.items() if v is not None}
        
        return self.create(payment)
    
    def update_payment(self, payment_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update payment"""
        updates = {}
        
        fields = ['studentId', 'studentName', 'month', 'dueDate', 'paidDate',
                  'status', 'method', 'reference', 'description', 'academy']
        
        for field in fields:
            if field in data:
                updates[field] = data[field]
        
        if 'amount' in data:
            updates['amount'] = Decimal(str(data['amount']))
        
        updates['updatedAt'] = datetime.utcnow().isoformat()
        
        return self.update(payment_id, updates)
    
    def get_payments_by_student(self, student_id: str) -> List[Dict[str, Any]]:
        """Get all payments for a student"""
        return self.query_by_attribute('studentId', student_id)
    
    def get_payments_by_status(self, status: str) -> List[Dict[str, Any]]:
        """Get payments by status"""
        return self.query_by_attribute('status', status)
    
    def get_pending_payments(self) -> List[Dict[str, Any]]:
        """Get all pending payments"""
        return self.get_payments_by_status('pending')
    
    def get_overdue_payments(self) -> List[Dict[str, Any]]:
        """Get all overdue payments"""
        return self.get_payments_by_status('overdue')
    
    def mark_as_paid(self, payment_id: str, paid_date: str, method: str) -> Optional[Dict[str, Any]]:
        """Mark payment as paid"""
        updates = {
            'status': 'paid',
            'paidDate': paid_date,
            'method': method,
            'updatedAt': datetime.utcnow().isoformat()
        }
        return self.update(payment_id, updates)
