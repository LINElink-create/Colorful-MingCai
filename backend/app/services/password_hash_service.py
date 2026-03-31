from __future__ import annotations

import hashlib
import hmac
import secrets
from typing import Optional


class PasswordHashService:
    algorithm = "pbkdf2_sha256"
    iterations = 390000

    def hash_password(self, password: str) -> str:
        salt = secrets.token_hex(16)
        digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            self.iterations,
        ).hex()
        return f"{self.algorithm}${self.iterations}${salt}${digest}"

    def verify_password(self, password: str, hashed_password: Optional[str]) -> bool:
        if not hashed_password:
            return False

        try:
            algorithm, iterations_raw, salt, expected_digest = hashed_password.split("$", 3)
        except ValueError:
            return False

        if algorithm != self.algorithm:
            return False

        digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            int(iterations_raw),
        ).hex()
        return hmac.compare_digest(digest, expected_digest)