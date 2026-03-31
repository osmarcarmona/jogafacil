#!/bin/bash
# Clear data from all DynamoDB tables EXCEPT users and academies
# Usage: bash scripts/clear-data.sh

PROFILE="debitech"
REGION="us-west-1"

# Tables to clear (excludes users and academies)
TABLES=(
  "jogafacil-coaches-dev"
  "jogafacil-teams-dev"
  "jogafacil-students-dev"
  "jogafacil-places-dev"
  "jogafacil-schedule-dev"
  "jogafacil-payments-dev"
  "jogafacil-payment-type-templates-dev"
)

drop_table_data() {
  local TABLE_NAME=$1
  echo "Dropping all data from $TABLE_NAME..."
  local ITEMS
  ITEMS=$(aws dynamodb scan --table-name "$TABLE_NAME" --profile "$PROFILE" --region "$REGION" --projection-expression "id" --output json 2>/dev/null)
  if [ $? -ne 0 ]; then
    echo "  Warning: Could not scan $TABLE_NAME (table may not exist yet)"
    return
  fi
  local IDS
  IDS=$(echo "$ITEMS" | python3 -c "import sys,json; data=json.load(sys.stdin); [print(item['id']['S']) for item in data.get('Items',[])]" 2>/dev/null)
  local COUNT=0
  for ID in $IDS; do
    aws dynamodb delete-item --table-name "$TABLE_NAME" --profile "$PROFILE" --region "$REGION" --key "{\"id\":{\"S\":\"$ID\"}}" 2>/dev/null
    COUNT=$((COUNT + 1))
  done
  echo "  Deleted $COUNT items from $TABLE_NAME"
}

echo "=========================================="
echo "  CLEARING DATA (keeping users & academies)"
echo "=========================================="

for TABLE in "${TABLES[@]}"; do
  drop_table_data "$TABLE"
done

echo ""
echo "Done. Users and academies tables were preserved."
