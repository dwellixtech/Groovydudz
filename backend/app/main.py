from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import admin, checkout, health, jobs, public, webhooks
from app.core.config import settings


app = FastAPI(title="GroovyDudz API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(public.router, prefix="/public", tags=["public"])
app.include_router(checkout.router, prefix="/checkout", tags=["checkout"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])
app.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])
app.include_router(jobs.router, prefix="/jobs", tags=["jobs"], include_in_schema=False)
