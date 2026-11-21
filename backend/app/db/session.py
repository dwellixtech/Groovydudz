import os
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings

if os.environ.get("VERCEL"):
    # Serverless: instances freeze between requests, so pooled connections go stale. Open one per
    # request and let Supabase's pooler (Supavisor) do the pooling.
    engine = create_async_engine(settings.database_url, poolclass=NullPool)
else:
    engine = create_async_engine(
        settings.database_url, pool_pre_ping=True, pool_size=5, max_overflow=10
    )
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session
