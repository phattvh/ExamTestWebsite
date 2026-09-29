import httpx
import asyncio
from fastapi import HTTPException
from config import settings

async def fetch_questions(filters: dict, token: str, retries: int = 3):
    async with httpx.AsyncClient(timeout=10.0) as client:
        for attempt in range(retries):
            try:
                response = await client.get(
                    f"{settings.QUESTION_SERVICE_URL}/api/v1/questions/",
                    params=filters,
                    headers={"Authorization": f"Bearer {token}"}
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                raise HTTPException(status_code=e.response.status_code, detail=f"Question service error: {e.response.text}")
            except httpx.RequestError:
                if attempt == retries - 1:
                    raise HTTPException(status_code=503, detail="Question Service unavailable")
                await asyncio.sleep(0.5 * (2 ** attempt))
