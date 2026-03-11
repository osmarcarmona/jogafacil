import boto3
from typing import Optional, List, Dict, Any
from boto3.dynamodb.conditions import Key, Attr


class BaseService:
    """Base service class for DynamoDB operations"""
    
    def __init__(self, table_name: str):
        """Initialize service with DynamoDB table"""
        self.dynamodb = boto3.resource('dynamodb')
        self.table = self.dynamodb.Table(table_name)
    
    def get_by_id(self, item_id: str) -> Optional[Dict[str, Any]]:
        """Get item by ID"""
        try:
            response = self.table.get_item(Key={'id': item_id})
            return response.get('Item')
        except Exception as e:
            print(f"Error getting item {item_id}: {str(e)}")
            raise
    
    def list_all(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """List all items"""
        try:
            if limit:
                response = self.table.scan(Limit=limit)
            else:
                response = self.table.scan()
            
            items = response.get('Items', [])
            
            # Handle pagination
            while 'LastEvaluatedKey' in response:
                response = self.table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
                items.extend(response.get('Items', []))
            
            return items
        except Exception as e:
            print(f"Error listing items: {str(e)}")
            raise
    
    def create(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Create new item"""
        try:
            self.table.put_item(Item=item)
            return item
        except Exception as e:
            print(f"Error creating item: {str(e)}")
            raise
    
    def update(self, item_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update item"""
        try:
            # Build update expression
            update_expr = 'SET '
            expr_values = {}
            expr_names = {}
            
            for key, value in updates.items():
                update_expr += f'#{key} = :{key}, '
                expr_values[f':{key}'] = value
                expr_names[f'#{key}'] = key
            
            # Remove trailing comma and space
            update_expr = update_expr.rstrip(', ')
            
            response = self.table.update_item(
                Key={'id': item_id},
                UpdateExpression=update_expr,
                ExpressionAttributeValues=expr_values,
                ExpressionAttributeNames=expr_names,
                ReturnValues='ALL_NEW'
            )
            
            return response.get('Attributes')
        except Exception as e:
            print(f"Error updating item {item_id}: {str(e)}")
            raise
    
    def delete(self, item_id: str) -> bool:
        """Delete item"""
        try:
            self.table.delete_item(Key={'id': item_id})
            return True
        except Exception as e:
            print(f"Error deleting item {item_id}: {str(e)}")
            raise
    
    def query_by_attribute(self, attribute: str, value: Any) -> List[Dict[str, Any]]:
        """Query items by attribute using scan with filter"""
        try:
            response = self.table.scan(
                FilterExpression=Attr(attribute).eq(value)
            )
            return response.get('Items', [])
        except Exception as e:
            print(f"Error querying by {attribute}: {str(e)}")
            raise
    
    def batch_get(self, item_ids: List[str]) -> List[Dict[str, Any]]:
        """Get multiple items by IDs"""
        try:
            keys = [{'id': item_id} for item_id in item_ids]
            response = self.dynamodb.batch_get_item(
                RequestItems={
                    self.table.table_name: {
                        'Keys': keys
                    }
                }
            )
            return response.get('Responses', {}).get(self.table.table_name, [])
        except Exception as e:
            print(f"Error batch getting items: {str(e)}")
            raise
