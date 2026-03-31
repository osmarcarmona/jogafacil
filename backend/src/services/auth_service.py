import os
import time

import bcrypt
import jwt


JWT_SECRET = os.environ.get("JWT_SECRET", "default-secret-for-dev")
JWT_ALGORITHM = "HS256"
TOKEN_EXPIRY_SECONDS = 86400  # 24 hours


def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt with cost factor 10.

    Args:
        password: The plaintext password to hash.

    Returns:
        The bcrypt hash string.
    """
    salt = bcrypt.gensalt(rounds=10)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a plaintext password against a bcrypt hash.

    Args:
        password: The plaintext password to check.
        password_hash: The bcrypt hash to compare against.

    Returns:
        True if the password matches the hash, False otherwise.
    """
    return bcrypt.checkpw(
        password.encode("utf-8"),
        password_hash.encode("utf-8"),
    )


def create_token(payload: dict) -> str:
    """Create a signed JWT from the given payload.

    Sets ``iat`` to the current time and ``exp`` to ``iat + 86400`` (24 hours).

    Args:
        payload: Dictionary of claims (e.g. sub, email, role, academy, coachId).

    Returns:
        The encoded JWT string.
    """
    now = int(time.time())
    token_payload = {**payload, "iat": now, "exp": now + TOKEN_EXPIRY_SECONDS}
    return jwt.encode(token_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_token(token: str) -> dict:
    """Verify a JWT and return its payload.

    Validates the signature and expiration.

    Args:
        token: The JWT string to verify.

    Returns:
        The decoded payload dictionary.

    Raises:
        jwt.ExpiredSignatureError: If the token has expired.
        jwt.InvalidTokenError: If the token is invalid.
    """
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])


def decode_token_payload(token: str) -> dict:
    """Decode a JWT payload without verifying the signature.

    Useful for inspecting token contents during testing.

    Args:
        token: The JWT string to decode.

    Returns:
        The decoded payload dictionary.
    """
    return jwt.decode(
        token, options={"verify_signature": False, "verify_exp": False}
    )
