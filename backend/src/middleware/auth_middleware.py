"""Authorization middleware for AWS Lambda Powertools handlers.

Provides a ``require_auth`` decorator that validates JWT tokens and enforces
role-based access control on API Gateway HTTP API routes.
"""

import os
import functools
import logging

import boto3
import jwt

from services.auth_service import verify_token

logger = logging.getLogger(__name__)

WRITE_METHODS = ("POST", "PUT", "DELETE")


def _get_teams_table():
    """Return the DynamoDB Teams table resource."""
    dynamodb = boto3.resource("dynamodb")
    table_name = os.environ.get("TEAMS_TABLE_NAME", "Teams")
    return dynamodb.Table(table_name)


def _extract_bearer_token(event):
    """Extract the Bearer token from the Authorization header.

    Returns the token string or ``None`` if the header is missing or
    malformed.
    """
    auth_header = event.get_header_value("Authorization") or ""
    if auth_header.startswith("Bearer "):
        return auth_header[7:]
    return None


def _is_schedule_route(path: str) -> bool:
    """Return True if the request path targets the schedule resource."""
    return path.startswith("/schedule")


def _extract_team_id_from_body(event) -> str | None:
    """Try to extract ``teamId`` from the JSON request body."""
    try:
        body = event.json_body or {}
        return body.get("teamId")
    except Exception:
        return None


def _coach_is_assigned_to_team(coach_id: str, team_id: str) -> bool:
    """Look up the team in DynamoDB and check if the coach is in ``coachIds``."""
    try:
        teams_table = _get_teams_table()
        result = teams_table.get_item(Key={"id": team_id})
        team = result.get("Item")
        if not team:
            return False
        coach_ids = team.get("coachIds", [])
        return coach_id in coach_ids
    except Exception:
        logger.exception("Error checking coach team assignment")
        return False


def require_auth(allowed_roles=None):
    """Decorator that enforces authentication and role-based authorization.

    Usage::

        @app.post("/schedule")
        @require_auth(allowed_roles=["admin", "coach"])
        def create_schedule():
            user = app.context.get("current_user")
            ...

    Args:
        allowed_roles: Optional list of role strings that are permitted to
            access the decorated endpoint.  When ``None``, any authenticated
            user is allowed.

    Returns:
        The decorator function.
    """

    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # The ``app`` instance is retrieved from the handler module's
            # global scope.  Powertools resolvers store the current event on
            # ``app.current_event`` before calling the route function.
            # We try multiple strategies to locate the app resolver.
            import inspect

            # Strategy 1: func.__globals__ (works when this decorator is
            # applied directly to the handler function)
            resolved_app = func.__globals__.get("app")

            # Strategy 2: walk the wrapper chain (__wrapped__) to find the
            # original function's globals
            if resolved_app is None:
                inner = func
                while hasattr(inner, "__wrapped__"):
                    inner = inner.__wrapped__
                    resolved_app = inner.__globals__.get("app")
                    if resolved_app is not None:
                        break

            # Strategy 3: walk the call stack
            if resolved_app is None:
                for frame_info in inspect.stack():
                    candidate = frame_info[0].f_globals.get("app")
                    if candidate is not None and hasattr(candidate, "current_event"):
                        resolved_app = candidate
                        break

            if resolved_app is None:
                raise RuntimeError("Could not find 'app' resolver in handler module")

            app = resolved_app

            event = app.current_event

            # --- 1. Extract and verify token ---
            token = _extract_bearer_token(event)
            if token is None:
                return {"error": "Authentication required"}, 401

            try:
                payload = verify_token(token)
            except jwt.ExpiredSignatureError:
                return {"error": "Invalid or expired token"}, 401
            except jwt.InvalidTokenError:
                return {"error": "Invalid or expired token"}, 401

            # --- 2. Inject current_user into app context ---
            if not hasattr(app, "context") or app.context is None:
                app.context = {}
            app.context["current_user"] = payload

            # --- 3. Role check ---
            user_role = payload.get("role")
            if allowed_roles is not None and user_role not in allowed_roles:
                return {"error": "Forbidden"}, 403

            # --- 4. Coach + schedule write: team assignment check ---
            http_method = event.http_method.upper()
            request_path = event.path

            if (
                user_role == "coach"
                and http_method in WRITE_METHODS
                and _is_schedule_route(request_path)
            ):
                team_id = _extract_team_id_from_body(event)
                coach_id = payload.get("coachId")

                if not team_id or not coach_id:
                    return {"error": "Forbidden"}, 403

                if not _coach_is_assigned_to_team(coach_id, team_id):
                    return {"error": "Forbidden"}, 403

            # --- 5. Proceed to handler ---
            return func(*args, **kwargs)

        return wrapper

    return decorator
