"""
TIGERTRACK AI — Password hashing using Argon2id
OWASP-recommended algorithm with unique per-user salts.
"""
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError

# Argon2id with OWASP-recommended parameters:
#   time_cost=3  (iterations)
#   memory_cost=65536 (64 MB)
#   parallelism=2
_ph = PasswordHasher(
    time_cost=3,
    memory_cost=65536,
    parallelism=2,
    hash_len=32,
    salt_len=16,
)


def hash_password(password: str) -> str:
    """Hash a plaintext password using Argon2id with a unique random salt."""
    return _ph.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    """
    Verify a plaintext password against a stored Argon2id hash.
    Returns True on match, False on any mismatch or format error.
    Never raises — all exceptions are caught internally.
    """
    try:
        return _ph.verify(hashed, password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False
    except Exception:
        return False


def needs_rehash(hashed: str) -> bool:
    """Return True if the stored hash was generated with older parameters and should be upgraded."""
    return _ph.check_needs_rehash(hashed)
