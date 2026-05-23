"""CP-SAT job-shop scheduler for Mercato production operations."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from ortools.sat.python import cp_model

from app.schemas import (
    ProductionOrder,
    ScheduleObjective,
    ScheduleRequest,
    ScheduledOperation,
    ScheduleResponse,
)


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


def _flatten_operations(orders: list[ProductionOrder]) -> list[FlatOperation]:
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
        raise SchedulerError("No schedulable operations found (all completed/cancelled or empty routing)")
    return flat


def _order_due_offsets_minutes(orders: list[ProductionOrder], planning_start: datetime) -> dict[UUID, int | None]:
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


def solve_schedule(
    request: ScheduleRequest,
    *,
    timeout_seconds: int = 120,
    num_workers: int = 0,
) -> ScheduleResponse:
    job_id = str(uuid4())
    planning_start = request.planning_start_at or datetime.now(tz=UTC)
    if planning_start.tzinfo is None:
        planning_start = planning_start.replace(tzinfo=UTC)

    horizon_minutes = request.horizon_hours * 60
    flat_ops = _flatten_operations(request.orders)
    due_offsets = _order_due_offsets_minutes(request.orders, planning_start)

    model = cp_model.CpModel()
    starts: dict[UUID, cp_model.IntVar] = {}
    ends: dict[UUID, cp_model.IntVar] = {}
    intervals_by_wc: dict[str, list[cp_model.IntervalVar]] = {}

    for op in flat_ops:
        start = model.new_int_var(0, horizon_minutes, f"start_{op.op_id}")
        end = model.new_int_var(0, horizon_minutes, f"end_{op.op_id}")
        interval = model.new_interval_var(start, op.duration_minutes, end, f"interval_{op.op_id}")
        starts[op.op_id] = start
        ends[op.op_id] = end
        intervals_by_wc.setdefault(op.work_center_code, []).append(interval)

    for wc_intervals in intervals_by_wc.values():
        model.add_no_overlap(wc_intervals)

    ops_by_order: dict[UUID, list[FlatOperation]] = {}
    for op in flat_ops:
        ops_by_order.setdefault(op.order_id, []).append(op)
    for order_ops in ops_by_order.values():
        ordered = sorted(order_ops, key=lambda o: o.sequence_no)
        for prev, nxt in zip(ordered, ordered[1:]):
            model.add(ends[prev.op_id] <= starts[nxt.op_id])

    order_completion: dict[UUID, cp_model.IntVar] = {}
    for order_id, order_ops in ops_by_order.items():
        completion = model.new_int_var(0, horizon_minutes, f"order_end_{order_id}")
        for op in order_ops:
            model.add(completion >= ends[op.op_id])
        order_completion[order_id] = completion

    objective_terms: list[cp_model.LinearExpr] = []

    if request.objective == "minimize_lateness":
        for order_id, completion in order_completion.items():
            due = due_offsets.get(order_id)
            if due is None:
                continue
            lateness = model.new_int_var(0, horizon_minutes, f"late_{order_id}")
            model.add(lateness >= completion - due)
            model.add(lateness >= 0)
            objective_terms.append(lateness)
        if not objective_terms:
            for completion in order_completion.values():
                objective_terms.append(completion)

    elif request.objective == "balance_load":
        wc_end_times: list[cp_model.IntVar] = []
        for wc in intervals_by_wc:
            wc_end = model.new_int_var(0, horizon_minutes, f"wc_end_{wc}")
            for op in flat_ops:
                if op.work_center_code == wc:
                    model.add(wc_end >= ends[op.op_id])
            wc_end_times.append(wc_end)
        if len(wc_end_times) >= 2:
            max_wc_end = model.new_int_var(0, horizon_minutes, "max_wc_end")
            min_wc_end = model.new_int_var(0, horizon_minutes, "min_wc_end")
            model.add_max_equality(max_wc_end, wc_end_times)
            model.add_min_equality(min_wc_end, wc_end_times)
            spread = model.new_int_var(0, horizon_minutes, "wc_end_spread")
            model.add(spread == max_wc_end - min_wc_end)
            objective_terms.append(spread)
        makespan = model.new_int_var(0, horizon_minutes, "makespan")
        model.add_max_equality(makespan, list(order_completion.values()))
        objective_terms.append(makespan)

    elif request.objective == "minimize_changeover":
        # Penalize consecutive operations on the same work center when SKU differs.
        changeover_penalty = 10_000
        for wc, wc_intervals in intervals_by_wc.items():
            wc_ops = [op for op in flat_ops if op.work_center_code == wc]
            if len(wc_ops) < 2:
                continue
            for i, op_a in enumerate(wc_ops):
                for op_b in wc_ops[i + 1 :]:
                    if op_a.product_sku == op_b.product_sku:
                        continue
                    a_before_b = model.new_bool_var(f"before_{op_a.op_id}_{op_b.op_id}")
                    model.add(ends[op_a.op_id] <= starts[op_b.op_id]).only_enforce_if(a_before_b)
                    model.add(ends[op_b.op_id] <= starts[op_a.op_id]).only_enforce_if(a_before_b.Not())
                    objective_terms.append(a_before_b * changeover_penalty)
        for completion in order_completion.values():
            objective_terms.append(completion)

    if objective_terms:
        model.minimize(sum(objective_terms))
    else:
        model.minimize(sum(order_completion.values()))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = float(timeout_seconds)
    if num_workers > 0:
        solver.parameters.num_search_workers = num_workers

    status = solver.solve(model)
    status_name = solver.status_name(status)

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return ScheduleResponse(
            job_id=job_id,
            status="failed",
            message=f"Solver returned {status_name} within {timeout_seconds}s",
            solver_status=status_name,
        )

    schedule: list[ScheduledOperation] = []
    for op in flat_ops:
        start_min = solver.value(starts[op.op_id])
        end_min = solver.value(ends[op.op_id])
        schedule.append(
            ScheduledOperation(
                operation_id=op.op_id,
                work_center_code=op.work_center_code,
                planned_start_at=planning_start + timedelta(minutes=start_min),
                planned_end_at=planning_start + timedelta(minutes=end_min),
            )
        )

    schedule.sort(key=lambda row: row.planned_start_at)

    return ScheduleResponse(
        job_id=job_id,
        status="completed",
        schedule=schedule,
        message=f"Scheduled {len(schedule)} operations ({status_name})",
        solver_status=status_name,
        objective_value=int(solver.objective_value) if solver.objective_value is not None else None,
    )
