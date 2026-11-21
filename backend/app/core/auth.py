from dataclasses import dataclass
from uuid import UUID

import httpx
from fastapi import Depends, Header, HTTPException, status
from jose import JWTError, jwt
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db


@dataclass(frozen=True)
class Principal:
    user_id: UUID
    email: str | None


async def _jwks() -> dict:
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(settings.supabase_jwks_url)
        response.raise_for_status()
        return response.json()


async def require_user(authorization: str = Header(default="")) -> Principal:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        header = jwt.get_unverified_header(token)
        keys = (await _jwks()).get("keys", [])
        key = next((item for item in keys if item.get("kid") == header.get("kid")), None)
        if key is None:
            raise JWTError("Signing key not found")
        claims = jwt.decode(
            token,
            key,
            algorithms=["RS256", "ES256"],
            audience=settings.supabase_jwt_audience,
            options={"verify_at_hash": False},
        )
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc
    return Principal(user_id=UUID(claims["sub"]), email=claims.get("email"))


async def require_staff(
    principal: Principal = Depends(require_user), db: AsyncSession = Depends(get_db)
) -> Principal:
    result = await db.execute(
        text(
            """
            select 1
            from staff_members sm
            join stores s on s.id = sm.store_id
            where sm.user_id = :user_id
              and sm.status = 'active'
              and s.slug = :store_slug
            limit 1
            """
        ),
        {"user_id": str(principal.user_id), "store_slug": settings.default_store_slug},
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Staff access required")
    return principal
