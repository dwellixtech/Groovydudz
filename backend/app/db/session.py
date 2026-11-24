import os
from collections.abc import AsyncGenerator
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings

asyncpg_connect_args = {
    "prepared_statement_cache_size": 0,
    "prepared_statement_name_func": lambda: f"__asyncpg_{uuid4()}__",
}

if os.environ.get("VERCEL"):
    # Serverless: instances freeze between requests, so pooled connections go stale. Open one per
    # request and let Supabase's pooler (Supavisor) do the pooling.
    engine = create_async_engine(
        settings.database_url,
        poolclass=NullPool,
        connect_args=asyncpg_connect_args,
    )
else:
    engine = create_async_engine(
        settings.database_url,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        connect_args=asyncpg_connect_args,
    )
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session
