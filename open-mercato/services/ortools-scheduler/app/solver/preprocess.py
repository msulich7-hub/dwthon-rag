"""Pre-solve validation and horizon tightening before CP-SAT."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID

from app.schemas import ProductionOrder, ScheduleRequest
from app.solver.ops import FlatOperation, SchedulerError, flatten_operations

DEFAULT_MAX_OPERATIONS_PER_SOLVE = 500
AUTO_ROLLING_OPERATION_THRESHOLD = 600
CHANGEOVER_PAIRWISE_MAX_OPS = 200
CHANGEOVER_PAIRWISE_MAX_PER_WC = 50


@dataclass(frozen=True)
class PreprocessResult:
    flat_ops: list[FlatOperation]
    horizon_minutes: int
    due_offsets: dict[UUID, int | None]
    use_rolling: bool
    operation_count: int


def _order_due_offsets_raw(orders: list[ProductionOrder], planning_start: datetime) -> dict[UUID, int | None]:
    offsets: dict[UUID, int | None] = {}
    for order in orders:
        if order.due_at is None:
            offsets[order.id] = None
            continue
        due = order.due_at if order.due_at.tzinfo else order.due_at.replace(tzinfo=UTC)
        start = planning_start if planning_start.tzinfo else planning_start.replace(tzinfo=UTC)
        offsets[order.id] = int((due - start).total_seconds() // 60)
    return offsets


def tighten_horizon_minutes(
    request: ScheduleRequest,
    flat_ops: list[FlatOperation],
    due_offsets: dict[UUID, int | None],
    *,
    slack_hours: int = 24,
    min_hours: int = 24,
) -> int:
    requested = request.horizon_hours * 60
    slack = slack_hours * 60
    min_minutes = min_hours * 60

    max_due = 0
    max_lb = 0
    for order in request.orders:
        if order.status in ("completed", "cancelled"):
            continue
        order_ops = [op for op in flat_ops if op.order_id == order.id]
        if not order_ops:
            continue
        lb = sum(op.duration_minutes for op in order_ops)
        max_lb = max(max_lb, lb)
        due = due_offsets.get(order.id)
        if due is not None and due > 0:
            max_due = max(max_due, due + slack)

    effective = min(requested, max(max_lb + slack, max_due, min_minutes))
    return max(min_minutes, effective)


def should_use_rolling(request: ScheduleRequest, operation_count: int) -> bool:
    rolling = getattr(request, "rolling", None)
    if rolling is not None and rolling.enabled:
        return True
    if rolling is not None and rolling.enabled is False:
        return False
    if operation_count > AUTO_ROLLING_OPERATION_THRESHOLD:
        return True
    if request.objective == "minimize_changeover" and operation_count > CHANGEOVER_PAIRWISE_MAX_OPS:
        return True
    return False


def should_use_pairwise_changeover(operation_count: int, wc_op_count: int) -> bool:
    if operation_count > CHANGEOVER_PAIRWISE_MAX_OPS:
        return False
    if wc_op_count > CHANGEOVER_PAIRWISE_MAX_PER_WC:
        return False
    return True


def preprocess_schedule_request(request: ScheduleRequest, planning_start: datetime) -> PreprocessResult:
    max_ops = getattr(request, "max_operations_per_solve", None) or DEFAULT_MAX_OPERATIONS_PER_SOLVE
    flat_ops = flatten_operations(request.orders)
    if len(flat_ops) > max_ops and not getattr(request, "chunk", None):
        raise SchedulerError(
            f"BATCH_TOO_LARGE: {len(flat_ops)} operations exceed maxOperationsPerSolve={max_ops}. "
            "Use Mercato batch chunking.",
        )

    due_offsets = _order_due_offsets_raw(request.orders, planning_start)
    horizon_minutes = tighten_horizon_minutes(request, flat_ops, due_offsets)
    use_rolling = should_use_rolling(request, len(flat_ops))

    return PreprocessResult(
        flat_ops=flat_ops,
        horizon_minutes=horizon_minutes,
        due_offsets=due_offsets,
        use_rolling=use_rolling,
        operation_count=len(flat_ops),
    )
