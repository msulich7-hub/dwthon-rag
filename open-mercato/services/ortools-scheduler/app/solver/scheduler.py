"""CP-SAT job-shop scheduler for Mercato production operations."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from ortools.sat.python import cp_model

from app.schemas import (
    FixedOperation,
    ProductionOrder,
    RollingHorizonConfig,
    ScheduleObjective,
    ScheduleRequest,
    ScheduledOperation,
    ScheduleResponse,
    WorkCenterFloor,
)
from app.solver.ops import FlatOperation, SchedulerError
from app.solver.preprocess import preprocess_schedule_request, should_use_pairwise_changeover
from app.solver.profiles import CPSAT_PROFILES, apply_cpsat_profile, tier_for_operation_count
from app.solver.rolling import solve_schedule_rolling


def _apply_work_center_floors(
    model: cp_model.CpModel,
    starts: dict[UUID, cp_model.IntVar],
    flat_ops: list[FlatOperation],
    floors: list[WorkCenterFloor],
    planning_start: datetime,
) -> None:
    for fl in floors:
        floor_off = int((fl.earliest_start_at - planning_start).total_seconds() // 60)
        floor_off = max(0, floor_off)
        for op in flat_ops:
            if op.work_center_code == fl.work_center_code and op.op_id in starts:
                model.add(starts[op.op_id] >= floor_off)


def solve_schedule(
    request: ScheduleRequest,
    *,
    timeout_seconds: int | None = None,
    num_workers: int = 0,
) -> ScheduleResponse:
    job_id = str(uuid4())
    planning_start = request.planning_start_at or datetime.now(tz=UTC)
    if planning_start.tzinfo is None:
        planning_start = planning_start.replace(tzinfo=UTC)

    try:
        pre = preprocess_schedule_request(request, planning_start)
    except SchedulerError as exc:
        return ScheduleResponse(
            job_id=job_id,
            status="failed",
            message=str(exc),
            solver_status="PREPROCESS_FAILED",
        )

    if pre.use_rolling:
        rolling_cfg = request.rolling or RollingHorizonConfig(enabled=True)
        return solve_schedule_rolling(
            request,
            rolling_cfg,
            timeout_seconds=int(timeout_seconds) if timeout_seconds else None,
        )

    horizon_minutes = pre.horizon_minutes
    flat_ops = pre.flat_ops
    due_offsets = {k: max(0, v) if v is not None else None for k, v in pre.due_offsets.items()}
    slot_minutes = max(1, request.slot_size_minutes)
    horizon_slots = max(1, horizon_minutes // slot_minutes)

    model = cp_model.CpModel()
    starts: dict[UUID, cp_model.IntVar] = {}
    ends: dict[UUID, cp_model.IntVar] = {}
    intervals_by_wc: dict[str, list[cp_model.IntervalVar]] = {}

    fixed_ops: list[FixedOperation] = list(request.fixed_operations)
    fixed_ids = {f.operation_id for f in fixed_ops}

    def dur_slots(minutes: int) -> int:
        return max(1, (minutes + slot_minutes - 1) // slot_minutes)

    for fix in fixed_ops:
        s = int((fix.planned_start_at - planning_start).total_seconds() // 60)
        e = int((fix.planned_end_at - planning_start).total_seconds() // 60)
        s_slot = max(0, s // slot_minutes)
        e_slot = max(s_slot + 1, e // slot_minutes)
        start = model.new_int_var(s_slot, s_slot, f"fix_s_{fix.operation_id}")
        end = model.new_int_var(e_slot, e_slot, f"fix_e_{fix.operation_id}")
        iv = model.new_interval_var(start, max(1, e_slot - s_slot), end, f"fix_iv_{fix.operation_id}")
        intervals_by_wc.setdefault(fix.work_center_code, []).append(iv)

    for op in flat_ops:
        if op.op_id in fixed_ids:
            continue
        d = dur_slots(op.duration_minutes)
        start = model.new_int_var(0, horizon_slots, f"start_{op.op_id}")
        end = model.new_int_var(0, horizon_slots, f"end_{op.op_id}")
        model.add(end == start + d)
        interval = model.new_interval_var(start, d, end, f"interval_{op.op_id}")
        starts[op.op_id] = start
        ends[op.op_id] = end
        intervals_by_wc.setdefault(op.work_center_code, []).append(interval)

    _apply_work_center_floors(model, starts, flat_ops, list(request.work_center_floors), planning_start)

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
        completion = model.new_int_var(0, horizon_slots, f"order_end_{order_id}")
        end_vars = [ends[op.op_id] for op in order_ops if op.op_id in ends]
        if end_vars:
            model.add_max_equality(completion, end_vars)
        order_completion[order_id] = completion

    objective_terms: list[cp_model.LinearExpr] = []

    if request.objective == "minimize_lateness":
        for order_id, completion in order_completion.items():
            due = due_offsets.get(order_id)
            if due is None:
                continue
            lateness = model.new_int_var(0, horizon_slots, f"late_{order_id}")
            model.add(lateness >= completion - due)
            model.add(lateness >= 0)
            objective_terms.append(lateness)
        if not objective_terms:
            for completion in order_completion.values():
                objective_terms.append(completion)

    elif request.objective == "balance_load":
        wc_end_times: list[cp_model.IntVar] = []
        for wc in intervals_by_wc:
            wc_end = model.new_int_var(0, horizon_slots, f"wc_end_{wc}")
            for op in flat_ops:
                if op.work_center_code == wc:
                    model.add(wc_end >= ends[op.op_id])
            wc_end_times.append(wc_end)
        if len(wc_end_times) >= 2:
            max_wc_end = model.new_int_var(0, horizon_slots, "max_wc_end")
            min_wc_end = model.new_int_var(0, horizon_slots, "min_wc_end")
            model.add_max_equality(max_wc_end, wc_end_times)
            model.add_min_equality(min_wc_end, wc_end_times)
            spread = model.new_int_var(0, horizon_slots, "wc_end_spread")
            model.add(spread == max_wc_end - min_wc_end)
            objective_terms.append(spread)
        makespan = model.new_int_var(0, horizon_slots, "makespan")
        model.add_max_equality(makespan, list(order_completion.values()))
        objective_terms.append(makespan)

    elif request.objective == "minimize_changeover":
        changeover_penalty = 10_000
        use_pairwise = should_use_pairwise_changeover(len(flat_ops), max(len(v) for v in intervals_by_wc.values()) if intervals_by_wc else 0)
        if use_pairwise:
            for wc in intervals_by_wc:
                wc_ops = [op for op in flat_ops if op.work_center_code == wc]
                if len(wc_ops) < 2:
                    continue
                for i, op_a in enumerate(wc_ops):
                    for op_b in wc_ops[i + 1 :]:
                        if op_a.product_sku == op_b.product_sku:
                            continue
                        if op_a.op_id not in starts or op_b.op_id not in starts:
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

    tier = tier_for_operation_count(len(flat_ops))
    profile = CPSAT_PROFILES[tier]
    effective_timeout = float(timeout_seconds if timeout_seconds is not None else profile.max_time_in_seconds)

    solver = cp_model.CpSolver()
    apply_cpsat_profile(
        solver,
        profile,
        timeout_seconds=timeout_seconds,
        num_workers=num_workers,
    )

    status = solver.solve(model)
    status_name = solver.status_name(status)

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return ScheduleResponse(
            job_id=job_id,
            status="failed",
            message=f"Solver returned {status_name} within {effective_timeout:.0f}s",
            solver_status=status_name,
        )

    schedule: list[ScheduledOperation] = []
    for op in flat_ops:
        if op.op_id not in starts:
            continue
        start_min = solver.value(starts[op.op_id]) * slot_minutes
        end_min = solver.value(ends[op.op_id]) * slot_minutes
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
