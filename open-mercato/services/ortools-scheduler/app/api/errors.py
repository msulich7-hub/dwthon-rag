from __future__ import annotations

from fastapi import HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.schemas import ScheduleResponse
from app.solver.scheduler import SchedulerError


async def scheduler_error_handler(_request: Request, exc: SchedulerError) -> JSONResponse:
    body = ScheduleResponse(
        job_id="scheduler-error",
        status="failed",
        message=str(exc),
    )
    return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content=body.model_dump(by_alias=True))


async def validation_error_handler(_request: Request, exc: RequestValidationError) -> JSONResponse:
    detail = exc.errors()
    message = "; ".join(
        f"{'.'.join(str(loc) for loc in err.get('loc', []))}: {err.get('msg')}" for err in detail[:5]
    )
    body = ScheduleResponse(job_id="validation-error", status="failed", message=message or "Invalid request")
    return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content=body.model_dump(by_alias=True))


async def pydantic_validation_handler(_request: Request, exc: ValidationError) -> JSONResponse:
    body = ScheduleResponse(job_id="validation-error", status="failed", message=str(exc))
    return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content=body.model_dump(by_alias=True))


async def unhandled_error_handler(_request: Request, exc: Exception) -> JSONResponse:
    body = ScheduleResponse(
        job_id="internal-error",
        status="failed",
        message="Internal scheduler error",
    )
    return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content=body.model_dump(by_alias=True))


def raise_unauthorized() -> None:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing bearer token")
