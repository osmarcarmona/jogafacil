#!/bin/bash

# JogaFacil - Create User directly in DynamoDB
# Usage: ./scripts/create-user.sh
# This script inserts a user record directly into the Users table,
# bypassing the API auth requirement. Useful for bootstrapping the first admin.

set -e

STAGE=${STAGE:-dev}
TABLE_NAME="jogafacil-users-${STAGE}"
REGION=${AWS_REGION:-us-west-1}
PROFILE="debitech"

echo "=== JogaFacil User Creation ==="
echo "Table: ${TABLE_NAME}"
echo "Region: ${REGION}"
echo ""

# Prompt for user details
read -p "Email: " EMAIL
read -s -p "Password: " PASSWORD
echo ""
read -p "Name: " NAME
read -p "Role (admin/coach): " ROLE
read -p "Academy IDs (comma-separated): " ACADEMY_INPUT
COACH_ID=""
if [ "$ROLE" = "coach" ]; then
  read -p "Coach ID (from coaches table): " COACH_ID
fi

# Validate inputs
if [ -z "$EMAIL" ] || [ -z "$PASSWORD" ] || [ -z "$NAME" ] || [ -z "$ROLE" ] || [ -z "$ACADEMY_INPUT" ]; then
  echo "Error: All fields are required."
  exit 1
fi

if [ "$ROLE" != "admin" ] && [ "$ROLE" != "coach" ]; then
  echo "Error: Role must be 'admin' or 'coach'."
  exit 1
fi

# Generate bcrypt hash
echo "Hashing password..."
PASSWORD_HASH=$(python3 -c "import bcrypt; print(bcrypt.hashpw(b'''${PASSWORD}''', bcrypt.gensalt(rounds=10)).decode())")

# Generate UUID and timestamp
USER_ID=$(python3 -c "import uuid; print(str(uuid.uuid4()))")
NOW=$(python3 -c "from datetime import datetime; print(datetime.utcnow().isoformat())")

# Build academies list for DynamoDB
IFS=',' read -ra ACADEMY_ARRAY <<< "$ACADEMY_INPUT"
ACADEMIES_JSON=""
for a in "${ACADEMY_ARRAY[@]}"; do
  trimmed=$(echo "$a" | xargs)
  if [ -n "$ACADEMIES_JSON" ]; then
    ACADEMIES_JSON="${ACADEMIES_JSON}, "
  fi
  ACADEMIES_JSON="${ACADEMIES_JSON}{\"S\": \"${trimmed}\"}"
done
FIRST_ACADEMY=$(echo "${ACADEMY_ARRAY[0]}" | xargs)

# Build the DynamoDB item
ITEM='{
  "id": {"S": "'"${USER_ID}"'"},
  "email": {"S": "'"${EMAIL}"'"},
  "passwordHash": {"S": "'"${PASSWORD_HASH}"'"},
  "role": {"S": "'"${ROLE}"'"},
  "name": {"S": "'"${NAME}"'"},
  "academy": {"S": "'"${FIRST_ACADEMY}"'"},
  "academies": {"L": ['"${ACADEMIES_JSON}"']},
  "status": {"S": "active"},
  "createdAt": {"S": "'"${NOW}"'"},
  "updatedAt": {"S": "'"${NOW}"'"}'

if [ -n "$COACH_ID" ]; then
  ITEM="${ITEM}"', "coachId": {"S": "'"${COACH_ID}"'"}'
fi

ITEM="${ITEM}}"

# Insert into DynamoDB
echo "Creating user in ${TABLE_NAME}..."
aws dynamodb put-item \
  --table-name "${TABLE_NAME}" \
  --item "${ITEM}" \
  --region "${REGION}" \
  --profile "${PROFILE}"

echo ""
echo "User created successfully!"
echo "  ID:      ${USER_ID}"
echo "  Email:   ${EMAIL}"
echo "  Role:    ${ROLE}"
echo "  Academy: ${ACADEMY_INPUT}"
echo ""
echo "You can now log in at the frontend with these credentials."
