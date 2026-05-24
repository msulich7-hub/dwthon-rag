from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError

from app import __version__
from app.api.errors import (
    pydantic_validation_handler,
    scheduler_error_handler,
    unhandled_error_handler,
    validation_error_handler,
)
from app.api.routes import router
from app.config import get_settings
from app.solver.scheduler import SchedulerError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Open Mercato OR-Tools Scheduler",
        version=__version__,
        description="CP-SAT microservice for production_planning schedule optimization",
    )

    app.include_router(router)

    app.add_exception_handler(SchedulerError, scheduler_error_handler)  # type: ignore[arg-type]
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(ValidationError, pydantic_validation_handler)
    app.add_exception_handler(Exception, unhandled_error_handler)

    @app.on_event("startup")
    async def log_startup() -> None:
        logger.info(
            "%s v%s listening (solver_timeout=%ss)",
            settings.app_name,
            __version__,
            settings.solver_timeout_seconds,
        )

    return app


app = create_app()
