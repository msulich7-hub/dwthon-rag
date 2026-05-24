"""CP-SAT solve tests at factory-fixture scale (deterministic synthetic data)."""

from __future__ import annotations

import hashlib
import uuid
from datetime import UTC, datetime, timedelta

from app.schemas import AssemblyLink, ProductionOperation, ProductionOrder, ScheduleRequest
from app.solver.profiles import SolverSizeTier, tier_for_operation_count
from app.solver.scheduler import solve_schedule

DEPARTMENTS = ("CUT", "PAINT", "EXTRUDE", "WELD", "ASM", "QC", "PACK", "SHIP")


def _stable_uuid(seed: str) -> uuid.UUID:
    digest = hashlib.sha256(seed.encode()).digest()[:16]
    b = bytearray(digest)
    b[6] = (b[6] & 0x0F) | 0x50
    b[8] = (b[8] & 0x3F) | 0x80
    return uuid.UUID(bytes=bytes(b))


def _build_factory_orders(
    *,
    order_count: int,
    min_ops: int,
    max_ops: int,
    work_center_count: int,
    peg_fraction: float = 0.3,
) -> tuple[list[ProductionOrder], list[AssemblyLink]]:
    wcs: list[str] = []
    seq = 1
    dept_idx = 0
    while len(wcs) < work_center_count:
        dept = DEPARTMENTS[dept_idx % len(DEPARTMENTS)]
        wcs.append(f"WC-{dept}-{seq:02d}")
        dept_idx += 1
        if dept_idx % len(DEPARTMENTS) == 0:
            seq += 1

    pegged = round(order_count * peg_fraction)
    peg_group_size = 3
    sales_ids = [
        _stable_uuid(f"factory:sales:{g}")
        for g in range(max(1, (pegged + peg_group_size - 1) // peg_group_size))
    ]

    orders: list[ProductionOrder] = []
    links: list[AssemblyLink] = []
    peg_assigned = 0
    planning_start = datetime(2026, 5, 24, 8, 0, tzinfo=UTC)

    for i in range(order_count):
        order_id = _stable_uuid(f"factory:mo:{i + 1}")
        sales_id = None
        if peg_assigned < pegged:
            sales_id = sales_ids[peg_assigned // peg_group_size]
            peg_assigned += 1

        op_count = min_ops + (i % (max_ops - min_ops + 1))
        operations: list[ProductionOperation] = []
        for seq_no in range(1, op_count + 1):
            dept = DEPARTMENTS[(i + seq_no) % len(DEPARTMENTS)]
            wc_candidates = [wc for wc in wcs if f"-{dept}-" in wc]
            wc = wc_candidates[i % len(wc_candidates)] if wc_candidates else wcs[i % len(wcs)]
            operations.append(
                ProductionOperation(
                    id=_stable_uuid(f"factory:op:{order_id}:{seq_no}"),
                    productionOrderId=order_id,
                    sequenceNo=seq_no,
                    name=f"{dept} step",
                    workCenterCode=wc,
                    durationMinutes=30 + (seq_no % 6) * 10,
                )
            )

        orders.append(
            ProductionOrder(
                id=order_id,
                code=f"FACTORY-MO-{i + 1:05d}",
                title=f"Factory MO {i + 1}",
                salesOrderId=sales_id,
                status="planned",
                quantity=1,
                due_at=planning_start + timedelta(days=7 + (i % 14)),
                operations=operations,
            )
        )

    by_sales: dict[uuid.UUID, list[ProductionOrder]] = {}
    for order in orders:
        if order.sales_order_id is None:
            continue
        by_sales.setdefault(order.sales_order_id, []).append(order)

    for group in by_sales.values():
        if len(group) < 2:
            continue
        sorted_group = sorted(group, key=lambda o: (o.due_at or planning_start, o.code))
        for j in range(len(sorted_group) - 1):
            prev_ops = sorted(sorted_group[j].operations, key=lambda o: o.sequence_no)
            next_ops = sorted(sorted_group[j + 1].operations, key=lambda o: o.sequence_no)
            links.append(
                AssemblyLink(
                    predecessorOperationId=prev_ops[-1].id,
                    successorOperationId=next_ops[0].id,
                    lagMinutes=0,
                )
            )

    return orders, links


def test_factory_small_preset_solves() -> None:
    orders, links = _build_factory_orders(
        order_count=20,
        min_ops=3,
        max_ops=5,
        work_center_count=12,
    )
    op_count = sum(len(o.operations) for o in orders)
    assert 60 <= op_count <= 100
    assert tier_for_operation_count(op_count) == SolverSizeTier.SMALL

    request = ScheduleRequest(
        tenantId=_stable_uuid("tenant"),
        organizationId=_stable_uuid("org"),
        orders=orders,
        horizonHours=168,
        objective="minimize_lateness",
        planningStartAt=datetime(2026, 5, 24, 8, 0, tzinfo=UTC),
        assemblyLinks=links,
    )
    result = solve_schedule(request, timeout_seconds=60)
    assert result.status == "completed"
    assert result.schedule is not None
    assert len(result.schedule) == op_count


def test_factory_medium_first_chunk_solves_with_assembly_links() -> None:
    orders, links = _build_factory_orders(
        order_count=100,
        min_ops=3,
        max_ops=5,
        work_center_count=40,
    )
    op_count = sum(len(o.operations) for o in orders)
    assert 300 <= op_count <= 500
    assert tier_for_operation_count(op_count) == SolverSizeTier.MEDIUM

    chunk_ops = 0
    chunk_orders: list[ProductionOrder] = []
    for order in sorted(orders, key=lambda o: (o.due_at or datetime.min.replace(tzinfo=UTC), o.code)):
        if chunk_ops + len(order.operations) > 500 and chunk_orders:
            break
        chunk_orders.append(order)
        chunk_ops += len(order.operations)

    chunk_op_ids = {op.id for o in chunk_orders for op in o.operations}
    chunk_links = [
        link
        for link in links
        if link.predecessor_operation_id in chunk_op_ids
        and link.successor_operation_id in chunk_op_ids
    ]

    request = ScheduleRequest(
        tenantId=_stable_uuid("tenant"),
        organizationId=_stable_uuid("org"),
        orders=chunk_orders,
        horizonHours=168,
        objective="minimize_lateness",
        planningStartAt=datetime(2026, 5, 24, 8, 0, tzinfo=UTC),
        assemblyLinks=chunk_links,
    )
    result = solve_schedule(request, timeout_seconds=90)
    assert result.status == "completed"
    assert result.schedule is not None
    assert len(result.schedule) == chunk_ops

    for link in chunk_links:
        end_row = next(r for r in result.schedule if r.operation_id == link.predecessor_operation_id)
        start_row = next(r for r in result.schedule if r.operation_id == link.successor_operation_id)
        assert end_row.planned_end_at <= start_row.planned_start_at


def test_factory_benchmark_tier_classification() -> None:
    orders, _ = _build_factory_orders(
        order_count=100,
        min_ops=22,
        max_ops=28,
        work_center_count=150,
    )
    op_count = sum(len(o.operations) for o in orders)
    assert 2200 <= op_count <= 2800
    assert tier_for_operation_count(op_count) == SolverSizeTier.LARGE
