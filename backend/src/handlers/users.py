import os
import uuid
from datetime import datetime

import boto3
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler import APIGatewayHttpResolver
from aws_lambda_powertools.logging import correlation_paths
from aws_lambda_powertools.utilities.typing import LambdaContext
from boto3.dynamodb.conditions import Attr

from services.auth_service import hash_password
from middleware.auth_middleware import require_auth

# Initialize Powertools
logger = Logger()
tracer = Tracer()
app = APIGatewayHttpResolver()

# DynamoDB setup
dynamodb = boto3.resource("dynamodb")
users_table = dynamodb.Table(os.environ.get("USERS_TABLE_NAME", "Users"))

VALID_ROLES = ("admin", "coach")


def _find_user_by_email(email: str):
    """Scan the Users table for a record matching the given email.

    Returns the user dict or None.
    """
    result = users_table.scan(FilterExpression=Attr("email").eq(email))
    items = result.get("Items", [])
    if items:
        return items[0]
    return None


def _safe_user(item: dict) -> dict:
    """Return a user dict with passwordHash excluded."""
    return {k: v for k, v in item.items() if k != "passwordHash"}


@app.get("/users")
@require_auth(allowed_roles=["admin"])
@tracer.capture_method
def list_users():
    """List all users, optionally filtered by academy. Excludes passwordHash."""
    academy = app.current_event.get_query_string_value("academy")
    logger.info("Listing users", extra={"academy": academy})

    try:
        # Scan all users first, then filter in-memory for academies list support
        result = users_table.scan()
        items = result.get("Items", [])

        while "LastEvaluatedKey" in result:
            result = users_table.scan(ExclusiveStartKey=result["LastEvaluatedKey"])
            items.extend(result.get("Items", []))

        # Filter by academy: check both legacy "academy" field and new "academies" list
        if academy:
            filtered = []
            for item in items:
                user_academies = item.get("academies", [])
                legacy_academy = item.get("academy", "")
                if academy in user_academies or academy == legacy_academy:
                    filtered.append(item)
            items = filtered

        safe_items = [_safe_user(item) for item in items]
        logger.info(f"Found {len(safe_items)} users")
        return {"users": safe_items}
    except Exception:
        logger.exception("Error listing users")
        return {"error": "Internal server error"}, 500


@app.post("/users")
@require_auth(allowed_roles=["admin"])
@tracer.capture_method
def create_user():
    """Create a new user with hashed password. Checks for duplicate email."""
    body = app.current_event.json_body or {}
    logger.info("Creating user", extra={"email": body.get("email")})

    email = body.get("email")
    password = body.get("password")
    role = body.get("role")
    name = body.get("name")
    # Support both "academies" (list) and legacy "academy" (string)
    academies = body.get("academies")
    if not academies:
        legacy = body.get("academy")
        academies = [legacy] if legacy else []

    # Validate required fields
    if not email or "@" not in email:
        return {"error": "Valid email is required"}, 400
    if not password:
        return {"error": "password is required"}, 400
    if not name or not name.strip():
        return {"error": "name is required"}, 400
    if role not in VALID_ROLES:
        return {"error": "Role must be 'admin' or 'coach'"}, 400
    if not academies:
        return {"error": "At least one academy is required"}, 400

    # Check duplicate email
    try:
        existing = _find_user_by_email(email)
        if existing:
            return {"error": "Email already registered"}, 409
    except Exception:
        logger.exception("Error checking duplicate email")
        return {"error": "Internal server error"}, 500

    now = datetime.utcnow().isoformat()
    user_item = {
        "id": str(uuid.uuid4()),
        "email": email,
        "passwordHash": hash_password(password),
        "role": role,
        "name": name,
        "academies": academies,
        "academy": academies[0],  # backward compat
        "status": body.get("status", "active"),
        "createdAt": now,
        "updatedAt": now,
    }

    coach_id = body.get("coachId")
    if coach_id:
        user_item["coachId"] = coach_id

    try:
        users_table.put_item(Item=user_item)
        logger.info(f"User created successfully: {user_item['id']}")
        return _safe_user(user_item), 201
    except Exception:
        logger.exception("Error creating user")
        return {"error": "Internal server error"}, 500


@app.put("/users/<user_id>")
@require_auth(allowed_roles=["admin"])
@tracer.capture_method
def update_user(user_id: str):
    """Update a user's role, name, status. Re-hash password if changed."""
    body = app.current_event.json_body or {}
    logger.info(f"Updating user: {user_id}")

    # Validate role if provided
    if "role" in body and body["role"] not in VALID_ROLES:
        return {"error": "Role must be 'admin' or 'coach'"}, 400

    # Validate status if provided
    if "status" in body and body["status"] not in ("active", "inactive"):
        return {"error": "Status must be 'active' or 'inactive'"}, 400

    update_expr = "SET "
    expr_values = {}
    expr_names = {}

    updatable_fields = ["role", "name", "status", "academy", "academies", "coachId"]
    for field in updatable_fields:
        if field in body:
            update_expr += f"#{field} = :{field}, "
            expr_values[f":{field}"] = body[field]
            expr_names[f"#{field}"] = field

    # Re-hash password if provided
    if "password" in body and body["password"]:
        update_expr += "#passwordHash = :passwordHash, "
        expr_values[":passwordHash"] = hash_password(body["password"])
        expr_names["#passwordHash"] = "passwordHash"

    update_expr += "#updatedAt = :updatedAt"
    expr_values[":updatedAt"] = datetime.utcnow().isoformat()
    expr_names["#updatedAt"] = "updatedAt"

    try:
        users_table.update_item(
            Key={"id": user_id},
            UpdateExpression=update_expr,
            ExpressionAttributeValues=expr_values,
            ExpressionAttributeNames=expr_names,
        )
        logger.info(f"User updated successfully: {user_id}")

        result = users_table.get_item(Key={"id": user_id})
        item = result.get("Item")
        if not item:
            return {"error": "User not found"}, 404
        return _safe_user(item)
    except Exception:
        logger.exception(f"Error updating user {user_id}")
        return {"error": "Internal server error"}, 500


@app.delete("/users/<user_id>")
@require_auth(allowed_roles=["admin"])
@tracer.capture_method
def delete_user(user_id: str):
    """Delete a user."""
    logger.info(f"Deleting user: {user_id}")

    try:
        users_table.delete_item(Key={"id": user_id})
        logger.info(f"User deleted successfully: {user_id}")
        return {"message": "User deleted successfully"}
    except Exception:
        logger.exception(f"Error deleting user {user_id}")
        return {"error": "Internal server error"}, 500


@logger.inject_lambda_context(correlation_id_path=correlation_paths.API_GATEWAY_HTTP)
@tracer.capture_lambda_handler
def handler(event: dict, context: LambdaContext) -> dict:
    """Main Lambda handler with Powertools integration."""
    return app.resolve(event, context)
