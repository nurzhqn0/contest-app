from typing import Any

import httpx

from app.config import settings


async def backend_request(method: str, path: str, json: dict[str, Any] | None = None) -> Any:
    async with httpx.AsyncClient(base_url=settings.backend_url, timeout=20.0) as client:
        response = await client.request(method, path, json=json)
        if not response.is_success:
            detail = "Request failed"
            try:
                detail = response.json().get("detail", detail)
            except Exception:
                pass
            raise RuntimeError(detail)
        if response.status_code == 204:
            return None
        return response.json()
