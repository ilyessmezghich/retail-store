import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, cart, catalog
from app.config import get_settings
from app.logging_conf import configure_logging

logger = logging.getLogger("retail.app")


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(structured=True)

    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_url],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth.router, prefix="/api/v1")
    app.include_router(cart.router, prefix="/api/v1")
    app.include_router(catalog.public_router, prefix="/api/v1")
    app.include_router(catalog.admin_router, prefix="/api/v1")

    @app.get("/")
    def root() -> dict:
        return {"service": settings.app_name, "docs": "/api/docs", "health": "/api/v1/health"}

    @app.get("/health")
    @app.get("/api/v1/health")
    def health() -> dict:
        return {"status": "ok"}

    @app.middleware("http")
    async def request_logging(request: Request, call_next):
        logger.info("request_start", extra={"method": request.method, "path": request.url.path})
        response = await call_next(request)
        logger.info(
            "request_end",
            extra={
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
            },
        )
        return response

    return app


app = create_app()