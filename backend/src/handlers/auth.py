import os

import boto3
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler import APIGatewayHttpResolver
from aws_lambda_powertools.logging import correlation_paths
from aws_lambda_powertools.utilities.typing import LambdaContext
from boto3.dynamodb.conditions import Attr

from services.auth_service import (
    create_token,
    verify_password,
)
from middleware.auth_middleware import require_auth

# Initialize Powertools
logger = Logger()
tracer = Tracer()
app = APIGatewayHttpResolver()

# DynamoDB setup
dynamodb = boto3.resource("dynamodb")
users_table = dynamodb.Table(os.environ.get("USERS_TABLE_NAME", "Users"))


def _find_user_by_email(email: str):
    """Scan the Users table for a record matching the given email.

    Returns the user dict or None.
    """
    result = users_table.scan(FilterExpression=Attr("email").eq(email))
    items = result.get("Items", [])
    if items:
        return items[0]
    return None


@app.post("/auth/login")
@tracer.capture_method
def login():
    """Authenticate a user with email and password, return a JWT."""
    body = app.current_event.json_body or {}
    email = body.get("email")
    password = body.get("password")

    if not email or not password:
        return {"error": "email and password are required"}, 400

    logger.info("Login attempt", extra={"email": email})

    try:
        user = _find_user_by_email(email)
    except Exception:
        logger.exception("Error looking up user by email")
        return {"error": "Internal server error"}, 500

    # Use the same generic message for wrong email and wrong password
    if user is None:
        return {"error": "Invalid credentials"}, 401

    if not verify_password(password, user.get("passwordHash", "")):
        return {"error": "Invalid credentials"}, 401

    # Check that the user account is active
    if user.get("status") != "active":
        return {"error": "Invalid credentials"}, 401

    # Build JWT payload
    token_payload = {
        "sub": user["id"],
        "email": user["email"],
        "role": user["role"],
        "academies": user.get("academies", [user["academy"]] if user.get("academy") else []),
        "academy": user.get("academy", (user.get("academies") or [""])[0]),
        "coachId": user.get("coachId"),
    }

    token = create_token(token_payload)
    logger.info("Login successful", extra={"userId": user["id"]})

    return {"token": token}


@app.get("/auth/me")
@require_auth()
@tracer.capture_method
def me():
    """Return the current authenticated user's profile."""
    current_user = app.context.get("current_user", {})
    user_id = current_user.get("sub")

    if not user_id:
        return {"error": "Invalid token payload"}, 401

    try:
        result = users_table.get_item(Key={"id": user_id})
    except Exception:
        logger.exception("Error fetching user profile")
        return {"error": "Internal server error"}, 500

    item = result.get("Item")
    if not item:
        return {"error": "User not found"}, 404

    # Exclude passwordHash from the response
    safe_user = {k: v for k, v in item.items() if k != "passwordHash"}
    return safe_user


@logger.inject_lambda_context(correlation_id_path=correlation_paths.API_GATEWAY_HTTP)
@tracer.capture_lambda_handler
def handler(event: dict, context: LambdaContext) -> dict:
    """Main Lambda handler with Powertools integration."""
    return app.resolve(event, context)
