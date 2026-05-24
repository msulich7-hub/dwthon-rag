"""Rolling-horizon CP-SAT: solve time windows sequentially for large instances."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from ortools.sat.python import cp_model

from app.schemas import (
    FixedOperation,
    ProductionOrder,
    RollingHorizonConfig,
    ScheduleRequest,
    ScheduledOperation,
    ScheduleResponse,
    WindowSolveMeta,
    WorkCenterFloor,
)
from app.solver.ops import FlatOperation, flatten_operations, order_due_offsets_minutes
from app.solver.profiles import CPSAT_PROFILES, apply_cpsat_profile, tier_for_operation_count


def _offset_minutes(ts: datetime | None, planning_start: datetime) -> int | None:
    if ts is None:
        return None
    due = ts if ts.tzinfo else ts.replace(tzinfo=UTC)
    start = planning_start if planning_start.tzinfo else planning_start.replace(tzinfo=UTC)
    return max(0, int((due - start).total_seconds() // 60))


def _solve_window(
    flat_ops: list[FlatOperation],
    *,
    planning_start: datetime,
    domain_lo: int,
    domain_hi: int,
    due_offsets: dict[UUID, int | None],
    objective: str,
    fixed: list[FixedOperation],
    floors: list[WorkCenterFloor],
    timeout_seconds: float,
    slot_minutes: int,
) -> tuple[list[ScheduledOperation], str, int | None]:
    """Solve one window; returns schedule rows, solver status, objective."""
    if not flat_ops and not fixed:
        return [], "OPTIMAL", 0

    horizon = domain_hi
    model = cp_model.CpModel()
    starts: dict[UUID, cp_model.IntVar] = {}
    ends: dict[UUID, cp_model.IntVar] = {}
    intervals_by_wc: dict[str, list[cp_model.IntervalVar]] = {}

    fixed_ids = {f.operation_id for f in fixed}

    def dur_slots(minutes: int) -> int:
        return max(1, (minutes + slot_minutes - 1) // slot_minutes)

    for fix in fixed:
        s = _offset_minutes(fix.planned_start_at, planning_start)
        e = _offset_minutes(fix.planned_end_at, planning_start)
        if s is None or e is None:
            continue
        start = model.new_int_var(s, s, f"fix_s_{fix.operation_id}")
        end = model.new_int_var(e, e, f"fix_e_{fix.operation_id}")
        iv = model.new_interval_var(start, max(1, e - s), end, f"fix_iv_{fix.operation_id}")
        intervals_by_wc.setdefault(fix.work_center_code, []).append(iv)

    for op in flat_ops:
        if op.op_id in fixed_ids:
            continue
        d_slots = dur_slots(op.duration_minutes)
        release = domain_lo
        for fl in floors:
            if fl.work_center_code == op.work_center_code:
                floor_off = _offset_minutes(fl.earliest_start_at, planning_start)
                if floor_off is not None:
                    release = max(release, floor_off)
        start = model.new_int_var(release, horizon, f"start_{op.op_id}")
        end = model.new_int_var(release, horizon, f"end_{op.op_id}")
        model.add(end == start + d_slots)
        iv = model.new_interval_var(start, d_slots, end, f"iv_{op.op_id}")
        starts[op.op_id] = start
        ends[op.op_id] = end
        intervals_by_wc.setdefault(op.work_center_code, []).append(iv)

    for wc_ivs in intervals_by_wc.values():
        if wc_ivs:
            model.add_no_overlap(wc_ivs)

    ops_by_order: dict[UUID, list[FlatOperation]] = {}
    for op in flat_ops:
        ops_by_order.setdefault(op.order_id, []).append(op)
    for order_ops in ops_by_order.values():
        ordered = sorted(order_ops, key=lambda o: o.sequence_no)
        for prev, nxt in zip(ordered, ordered[1:]):
            if prev.op_id in starts and nxt.op_id in starts:
                model.add(ends[prev.op_id] <= starts[nxt.op_id])

    order_completion: dict[UUID, cp_model.IntVar] = {}
    for order_id, order_ops in ops_by_order.items():
        completion = model.new_int_var(0, horizon, f"oc_{order_id}")
        for op in order_ops:
            if op.op_id in ends:
                model.add(completion >= ends[op.op_id])
        order_completion[order_id] = completion

    objective_terms: list[cp_model.LinearExpr] = []
    if objective == "minimize_lateness":
        for order_id, completion in order_completion.items():
            due = due_offsets.get(order_id)
            if due is None:
                continue
            late = model.new_int_var(0, horizon, f"late_{order_id}")
            model.add(late >= completion - due)
            model.add(late >= 0)
            objective_terms.append(late)
    if not objective_terms:
        for completion in order_completion.values():
            objective_terms.append(completion)

    model.minimize(sum(objective_terms))

    tier = tier_for_operation_count(len(flat_ops) + len(fixed))
    profile = CPSAT_PROFILES[tier]
    solver = cp_model.CpSolver()
    apply_cpsat_profile(solver, profile, timeout_seconds=int(timeout_seconds), num_workers=0)

    status = solver.solve(model)
    status_name = solver.status_name(status)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return [], status_name, None

    schedule: list[ScheduledOperation] = []
    for op in flat_ops:
        if op.op_id not in starts:
            continue
        s_min = solver.value(starts[op.op_id]) * slot_minutes
        e_min = solver.value(ends[op.op_id]) * slot_minutes
        schedule.append(
            ScheduledOperation(
                operation_id=op.op_id,
                work_center_code=op.work_center_code,
                planned_start_at=planning_start + timedelta(minutes=s_min),
                planned_end_at=planning_start + timedelta(minutes=e_min),
            )
        )
    obj = int(solver.objective_value) if solver.objective_value is not None else None
    return schedule, status_name, obj


def solve_schedule_rolling(
    request: ScheduleRequest,
    rolling: RollingHorizonConfig,
    *,
    timeout_seconds: int | None = None,
) -> ScheduleResponse:
    job_id = str(uuid4())
    planning_start = request.planning_start_at or datetime.now(tz=UTC)
    if planning_start.tzinfo is None:
        planning_start = planning_start.replace(tzinfo=UTC)

    slot_minutes = getattr(request, "slot_size_minutes", None) or 5
    horizon_minutes = request.horizon_hours * 60
    window_minutes = rolling.window_hours * 60
    overlap_minutes = rolling.overlap_hours * 60
    freeze_before = rolling.freeze_before or (planning_start + timedelta(hours=4))

    all_ops = flatten_operations(request.orders)
    due_nonneg = order_due_offsets_minutes(request.orders, planning_start)

    fixed: list[FixedOperation] = list(getattr(request, "fixed_operations", None) or [])
    frozen_ids: set[UUID] = {f.operation_id for f in fixed}

    for order in request.orders:
        for op in order.operations:
            if op.status in ("in_progress", "running") and op.planned_start_at and op.planned_end_at:
                frozen_ids.add(op.id)
                fixed.append(
                    FixedOperation(
                        operation_id=op.id,
                        work_center_code=op.work_center_code.strip() or "default",
                        planned_start_at=op.planned_start_at,
                        planned_end_at=op.planned_end_at,
                    )
                )
            elif (
                op.planned_end_at
                and op.planned_end_at <= freeze_before
                and op.planned_start_at
            ):
                frozen_ids.add(op.id)
                fixed.append(
                    FixedOperation(
                        operation_id=op.id,
                        work_center_code=op.work_center_code.strip() or "default",
                        planned_start_at=op.planned_start_at,
                        planned_end_at=op.planned_end_at,
                    )
                )

    merged: dict[UUID, ScheduledOperation] = {}
    windows_meta: list[WindowSolveMeta] = []
    deferred: set[UUID] = set()

    total_timeout = float(timeout_seconds or 120)
    num_windows = max(1, (horizon_minutes + window_minutes - overlap_minutes - 1) // (window_minutes - overlap_minutes))
    per_window_timeout = max(15.0, total_timeout / num_windows)

    w_start = 0
    idx = 0
    while w_start < horizon_minutes:
        w_end = min(w_start + window_minutes, horizon_minutes)
        w_solve_lo = max(0, w_start - overlap_minutes)

        candidates: list[FlatOperation] = []
        for op in all_ops:
            if op.op_id in frozen_ids or op.op_id in merged:
                continue
            candidates.append(op)

        if len(candidates) > rolling.max_operations_per_window:
            candidates = candidates[: rolling.max_operations_per_window]

        if candidates:
            chunk_schedule, solver_status, _ = _solve_window(
                candidates,
                planning_start=planning_start,
                domain_lo=w_solve_lo // slot_minutes,
                domain_hi=w_end // slot_minutes,
                due_offsets=due_nonneg,
                objective=request.objective,
                fixed=fixed,
                floors=list(getattr(request, "work_center_floors", None) or []),
                timeout_seconds=per_window_timeout,
                slot_minutes=slot_minutes,
            )
            if solver_status not in ("OPTIMAL", "FEASIBLE"):
                return ScheduleResponse(
                    job_id=job_id,
                    status="failed",
                    message=f"Rolling window {idx} failed: {solver_status}",
                    solver_status=solver_status,
                    strategy="rolling",
                    windows=windows_meta,
                )
            for row in chunk_schedule:
                if row.planned_end_at <= planning_start + timedelta(minutes=w_end):
                    merged[row.operation_id] = row
                    fixed.append(
                        FixedOperation(
                            operation_id=row.operation_id,
                            work_center_code=row.work_center_code,
                            planned_start_at=row.planned_start_at,
                            planned_end_at=row.planned_end_at,
                        )
                    )
                    frozen_ids.add(row.operation_id)

            windows_meta.append(
                WindowSolveMeta(
                    windowIndex=idx,
                    windowStartAt=planning_start + timedelta(minutes=w_start),
                    windowEndAt=planning_start + timedelta(minutes=w_end),
                    operationCount=len(candidates),
                    solverStatus=solver_status,
                )
            )
        else:
            deferred.update(op.op_id for op in all_ops if op.op_id not in merged and op.op_id not in frozen_ids)

        w_start += window_minutes - overlap_minutes
        idx += 1

    schedule = sorted(merged.values(), key=lambda r: r.planned_start_at)
    still_free = {op.op_id for op in all_ops} - set(merged) - frozen_ids

    return ScheduleResponse(
        job_id=job_id,
        status="completed",
        schedule=schedule,
        message=f"Rolling: {idx} windows, {len(schedule)} scheduled, {len(still_free)} deferred",
        solver_status="FEASIBLE" if schedule else "OPTIMAL",
        strategy="rolling",
        windows=windows_meta,
        deferred_operation_ids=sorted(still_free | deferred),
    )
