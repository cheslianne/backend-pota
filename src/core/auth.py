from datetime import datetime, timedelta, timezone
from jose import jwt

SECRET_KEY = "esaka-secret-key-change-this-later"
ALGORITHM = "HS256"

# Token expires after 8 hours
ACCESS_TOKEN_EXPIRE_MINUTES = 8 * 60


def create_access_token(data: dict):
    to_encode = data.copy()

    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    to_encode.update({
        "exp": expire
    })

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )