from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas import AssemblyLink, ObjectiveWeights, ProductionOperation, ProductionOrder, ScheduleRequest
from app.solver.profiles import (
    CPSAT_PROFILES,
    SolverSizeTier,
    apply_cpsat_profile,
    tier_for_operation_count,
)
from app.solver.scheduler import solve_schedule


def _sample_order(*, wc_a: str = "WC-CUT", wc_b: str = "WC-ASM") -> ProductionOrder:
    order_id = uuid4()
    return ProductionOrder(
        id=order_id,
        code="PO-00001",
        title="Widget batch",
        status="planned",
        quantity=10,
        due_at=datetime.now(tz=UTC) + timedelta(hours=48),
        operations=[
            ProductionOperation(
                id=uuid4(),
                productionOrderId=order_id,
                sequenceNo=1,
                name="Cut",
                workCenterCode=wc_a,
                durationMinutes=60,
            ),
            ProductionOperation(
                id=uuid4(),
                productionOrderId=order_id,
                sequenceNo=2,
                name="Assemble",
                workCenterCode=wc_b,
                durationMinutes=90,
            ),
        ],
    )


def test_tier_boundaries() -> None:
    assert tier_for_operation_count(1) == SolverSizeTier.SMALL
    assert tier_for_operation_count(100) == SolverSizeTier.SMALL
    assert tier_for_operation_count(101) == SolverSizeTier.MEDIUM
    assert tier_for_operation_count(1000) == SolverSizeTier.MEDIUM
    assert tier_for_operation_count(1001) == SolverSizeTier.LARGE
    assert tier_for_operation_count(5000) == SolverSizeTier.LARGE


def test_cpsat_profile_application() -> None:
    from ortools.sat.python import cp_model

    solver = cp_model.CpSolver()
    profile = CPSAT_PROFILES[SolverSizeTier.LARGE]
    apply_cpsat_profile(solver, profile, timeout_seconds=None, num_workers=0)

    params = solver.parameters
    assert params.max_time_in_seconds == profile.max_time_in_seconds
    assert params.search_branching == profile.search_branching
    assert params.linearization_level == 2
    assert params.use_lns is True
    assert params.relative_gap_limit == 0.02
    assert params.probing_deterministic_time_limit == 0.5


def test_health_endpoint() -> None:
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["service"] == "ortools-scheduler"


def test_schedule_with_objective_weights() -> None:
    order = _sample_order()
    request = ScheduleRequest(
        tenantId=uuid4(),
        organizationId=uuid4(),
        orders=[order],
        horizonHours=168,
        objective="minimize_lateness",
        objectiveWeights=ObjectiveWeights(
            tardinessWeight=0.6,
            changeoverWeight=0.3,
            wipWeight=0.1,
        ),
        planningStartAt=datetime(2026, 5, 23, 8, 0, tzinfo=UTC),
    )
    result = solve_schedule(request, timeout_seconds=30)
    assert result.status == "completed"
    assert result.schedule is not None
    assert len(result.schedule) == 2


def test_schedule_two_operation_routing() -> None:
    order = _sample_order()
    request = ScheduleRequest(
        tenantId=uuid4(),
        organizationId=uuid4(),
        orders=[order],
        horizonHours=168,
        objective="minimize_lateness",
        planningStartAt=datetime.now(tz=UTC),
    )
    result = solve_schedule(request, timeout_seconds=30)
    assert result.status == "completed"
    assert result.schedule is not None
    assert len(result.schedule) == 2
    assert result.schedule[0].planned_start_at <= result.schedule[1].planned_start_at


def test_schedule_respects_precedence() -> None:
    order = _sample_order()
    request = ScheduleRequest(
        tenantId=uuid4(),
        organizationId=uuid4(),
        orders=[order],
        planningStartAt=datetime(2026, 5, 23, 8, 0, tzinfo=UTC),
    )
    result = solve_schedule(request, timeout_seconds=30)
    assert result.schedule is not None
    cut = next(row for row in result.schedule if row.work_center_code == "WC-CUT")
    asm = next(row for row in result.schedule if row.work_center_code == "WC-ASM")
    assert cut.planned_end_at <= asm.planned_start_at


def test_cross_order_assembly_link() -> None:
    order_a = _sample_order(wc_a="WC-A", wc_b="WC-B")
    order_b = _sample_order(wc_a="WC-C", wc_b="WC-D")
    op_a_last = sorted(order_a.operations, key=lambda o: o.sequence_no)[-1]
    op_b_first = sorted(order_b.operations, key=lambda o: o.sequence_no)[0]
    request = ScheduleRequest(
        tenantId=uuid4(),
        organizationId=uuid4(),
        orders=[order_a, order_b],
        horizonHours=168,
        objective="minimize_lateness",
        planningStartAt=datetime(2026, 5, 23, 8, 0, tzinfo=UTC),
        assemblyLinks=[
            AssemblyLink(
                predecessorOperationId=op_a_last.id,
                successorOperationId=op_b_first.id,
                lagMinutes=0,
            )
        ],
    )
    result = solve_schedule(request, timeout_seconds=30)
    assert result.status == "completed"
    assert result.schedule is not None
    end_a = next(row for row in result.schedule if row.operation_id == op_a_last.id)
    start_b = next(row for row in result.schedule if row.operation_id == op_b_first.id)
    assert end_a.planned_end_at <= start_b.planned_start_at


def test_schedule_http_roundtrip() -> None:
    order = _sample_order()
    client = TestClient(app)
    response = client.post(
        "/schedule",
        json={
            "tenantId": str(uuid4()),
            "organizationId": str(uuid4()),
            "orders": [order.model_dump(mode="json", by_alias=True)],
            "horizonHours": 168,
            "objective": "minimize_lateness",
            "planningStartAt": datetime.now(tz=UTC).isoformat(),
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "completed"
    assert len(body["schedule"]) == 2


def test_api_key_rejection(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("API_KEY", "secret-token")
    get_settings = __import__("app.config", fromlist=["get_settings"]).get_settings
    get_settings.cache_clear()

    client = TestClient(app)
    order = _sample_order()
    payload = {
        "tenantId": str(uuid4()),
        "organizationId": str(uuid4()),
        "orders": [order.model_dump(mode="json", by_alias=True)],
    }

    unauthorized = client.post("/schedule", json=payload)
    assert unauthorized.status_code == 401

    authorized = client.post(
        "/schedule",
        json=payload,
        headers={"Authorization": "Bearer secret-token"},
    )
    assert authorized.status_code == 200

    get_settings.cache_clear()
