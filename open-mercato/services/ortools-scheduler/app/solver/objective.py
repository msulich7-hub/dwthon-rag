"""Multi-objective CP-SAT terms (tardiness + changeover + WIP spread)."""

from __future__ import annotations

from uuid import UUID

from ortools.sat.python import cp_model

from app.schemas import ObjectiveWeights, ScheduleObjective, ScheduleRequest
from app.solver.ops import FlatOperation
from app.solver.preprocess import should_use_pairwise_changeover


def _weight_scale(weight: float) -> int:
    return max(0, int(round(weight * 1000)))


def append_lateness_terms(
    model: cp_model.CpModel,
    order_completion: dict[UUID, cp_model.IntVar],
    due_offsets: dict[UUID, int | None],
    horizon_slots: int,
    scale: int,
) -> list[cp_model.LinearExpr]:
    if scale <= 0:
        return []
    terms: list[cp_model.LinearExpr] = []
    for order_id, completion in order_completion.items():
        due = due_offsets.get(order_id)
        if due is None:
            continue
        lateness = model.new_int_var(0, horizon_slots, f"late_{order_id}")
        model.add(lateness >= completion - due)
        model.add(lateness >= 0)
        terms.append(lateness * scale)
    if not terms:
        for completion in order_completion.values():
            terms.append(completion * scale)
    return terms


def append_changeover_terms(
    model: cp_model.CpModel,
    starts: dict[UUID, cp_model.IntVar],
    ends: dict[UUID, cp_model.IntVar],
    flat_ops: list[FlatOperation],
    intervals_by_wc: dict[str, list[cp_model.IntervalVar]],
    scale: int,
) -> list[cp_model.LinearExpr]:
    if scale <= 0:
        return []
    terms: list[cp_model.LinearExpr] = []
    use_pairwise = should_use_pairwise_changeover(
        len(flat_ops),
        max(len(v) for v in intervals_by_wc.values()) if intervals_by_wc else 0,
    )
    if not use_pairwise:
        return terms
    penalty = 10
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
                terms.append(a_before_b * penalty * scale)
    return terms


def append_wip_terms(
    model: cp_model.CpModel,
    ends: dict[UUID, cp_model.IntVar],
    flat_ops: list[FlatOperation],
    intervals_by_wc: dict[str, list[cp_model.IntervalVar]],
    order_completion: dict[UUID, cp_model.IntVar],
    horizon_slots: int,
    scale: int,
) -> list[cp_model.LinearExpr]:
    if scale <= 0:
        return []
    terms: list[cp_model.LinearExpr] = []
    wc_end_times: list[cp_model.IntVar] = []
    for wc in intervals_by_wc:
        wc_end = model.new_int_var(0, horizon_slots, f"wc_end_{wc}")
        for op in flat_ops:
            if op.work_center_code == wc and op.op_id in ends:
                model.add(wc_end >= ends[op.op_id])
        wc_end_times.append(wc_end)
    if len(wc_end_times) >= 2:
        max_wc_end = model.new_int_var(0, horizon_slots, "max_wc_end")
        min_wc_end = model.new_int_var(0, horizon_slots, "min_wc_end")
        model.add_max_equality(max_wc_end, wc_end_times)
        model.add_min_equality(min_wc_end, wc_end_times)
        spread = model.new_int_var(0, horizon_slots, "wc_end_spread")
        model.add(spread == max_wc_end - min_wc_end)
        terms.append(spread * scale)
    makespan = model.new_int_var(0, horizon_slots, "makespan")
    model.add_max_equality(makespan, list(order_completion.values()))
    terms.append(makespan * scale)
    return terms


def apply_schedule_objective(
    request: ScheduleRequest,
    model: cp_model.CpModel,
    *,
    starts: dict[UUID, cp_model.IntVar],
    ends: dict[UUID, cp_model.IntVar],
    flat_ops: list[FlatOperation],
    intervals_by_wc: dict[str, list[cp_model.IntervalVar]],
    order_completion: dict[UUID, cp_model.IntVar],
    due_offsets: dict[UUID, int | None],
    horizon_slots: int,
) -> None:
    weights = request.objective_weights
    if weights is not None:
        tw = _weight_scale(weights.tardiness_weight)
        cw = _weight_scale(weights.changeover_weight)
        ww = _weight_scale(weights.wip_weight)
        if tw + cw + ww == 0:
            tw = 1000
        terms: list[cp_model.LinearExpr] = []
        terms.extend(
            append_lateness_terms(model, order_completion, due_offsets, horizon_slots, tw),
        )
        terms.extend(
            append_changeover_terms(model, starts, ends, flat_ops, intervals_by_wc, cw),
        )
        terms.extend(
            append_wip_terms(
                model,
                ends,
                flat_ops,
                intervals_by_wc,
                order_completion,
                horizon_slots,
                ww,
            ),
        )
        if terms:
            model.minimize(sum(terms))
        else:
            model.minimize(sum(order_completion.values()))
        return

    objective: ScheduleObjective = request.objective
    objective_terms: list[cp_model.LinearExpr] = []

    if objective == "minimize_lateness":
        objective_terms = append_lateness_terms(
            model,
            order_completion,
            due_offsets,
            horizon_slots,
            scale=1,
        )

    elif objective == "balance_load":
        objective_terms = append_wip_terms(
            model,
            ends,
            flat_ops,
            intervals_by_wc,
            order_completion,
            horizon_slots,
            scale=1,
        )

    elif objective == "minimize_changeover":
        objective_terms = append_changeover_terms(
            model,
            starts,
            ends,
            flat_ops,
            intervals_by_wc,
            scale=1000,
        )
        for completion in order_completion.values():
            objective_terms.append(completion)

    if objective_terms:
        model.minimize(sum(objective_terms))
    else:
        model.minimize(sum(order_completion.values()))
