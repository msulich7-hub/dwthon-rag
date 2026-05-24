"""Shared scheduler types and helpers (no CP-SAT model imports)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID

from app.schemas import ProductionOrder


class SchedulerError(Exception):
    """Raised when input cannot be modeled or the solver fails unexpectedly."""


@dataclass(frozen=True)
class FlatOperation:
    op_id: UUID
    order_id: UUID
    sequence_no: int
    work_center_code: str
    duration_minutes: int
    product_sku: str | None
    order_code: str


def flatten_operations(orders: list[ProductionOrder]) -> list[FlatOperation]:
    flat: list[FlatOperation] = []
    for order in orders:
        if order.status in ("completed", "cancelled"):
            continue
        for op in sorted(order.operations, key=lambda o: o.sequence_no):
            if op.status in ("completed", "cancelled"):
                continue
            flat.append(
                FlatOperation(
                    op_id=op.id,
                    order_id=order.id,
                    sequence_no=op.sequence_no,
                    work_center_code=op.work_center_code.strip() or "default",
                    duration_minutes=op.duration_minutes,
                    product_sku=order.product_sku,
                    order_code=order.code,
                )
            )
    if not flat:
        raise SchedulerError(
            "No schedulable operations found (all completed/cancelled or empty routing)"
        )
    return flat


def order_due_offsets_minutes(
    orders: list[ProductionOrder], planning_start: datetime
) -> dict[UUID, int | None]:
    offsets: dict[UUID, int | None] = {}
    for order in orders:
        if order.due_at is None:
            offsets[order.id] = None
            continue
        due = order.due_at if order.due_at.tzinfo else order.due_at.replace(tzinfo=UTC)
        start = planning_start if planning_start.tzinfo else planning_start.replace(tzinfo=UTC)
        delta = int((due - start).total_seconds() // 60)
        offsets[order.id] = max(0, delta)
    return offsets
