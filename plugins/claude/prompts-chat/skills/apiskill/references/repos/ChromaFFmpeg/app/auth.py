import os
import secrets

from fastapi import Header, HTTPException


async def verify_api_key(x_api_key: str = Header(...)) -> None:
    api_key = os.getenv("API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail={"error": "API_KEY not configured on server"})
    if not secrets.compare_digest(x_api_key, api_key):
        raise HTTPException(status_code=401, detail={"error": "Invalid API key"})
