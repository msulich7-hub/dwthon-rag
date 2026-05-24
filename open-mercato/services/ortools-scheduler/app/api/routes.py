from __future__ import annotations

import asyncio
from functools import partial

from fastapi import APIRouter, Depends, Header, Request

from app import __version__
from app.api.errors import raise_unauthorized
from app.config import Settings, get_settings
from app.schemas import HealthResponse, ScheduleRequest, ScheduleResponse
from app.solver.scheduler import SchedulerError, solve_schedule

router = APIRouter()


def verify_api_key(
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
) -> None:
    if not settings.api_key:
        return
    expected = f"Bearer {settings.api_key}"
    if authorization != expected:
        raise_unauthorized()


@router.get("/health", response_model=HealthResponse, tags=["health"])
async def health(settings: Settings = Depends(get_settings)) -> HealthResponse:
    return HealthResponse(service=settings.app_name, version=__version__)


@router.post(
    "/schedule",
    response_model=ScheduleResponse,
    response_model_by_alias=True,
    tags=["schedule"],
    dependencies=[Depends(verify_api_key)],
)
async def schedule(
    request: Request,
    body: ScheduleRequest,
    settings: Settings = Depends(get_settings),
) -> ScheduleResponse:
    loop = asyncio.get_running_loop()
    solve = partial(
        solve_schedule,
        body,
        timeout_seconds=settings.solver_timeout_seconds,
        num_workers=settings.solver_num_workers,
    )
    executor_timeout = (settings.solver_timeout_seconds or 300) + 5

    try:
        return await asyncio.wait_for(
            loop.run_in_executor(None, solve),
            timeout=executor_timeout,
        )
    except asyncio.TimeoutError as exc:
        limit = settings.solver_timeout_seconds or 300
        raise SchedulerError(
            f"Scheduling exceeded wall-clock limit of {limit}s"
        ) from exc
