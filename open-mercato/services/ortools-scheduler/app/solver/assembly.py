"""Cross-order assembly / peg precedence constraints."""

from __future__ import annotations

from uuid import UUID

from ortools.sat.python import cp_model

from app.schemas import AssemblyLink
from app.solver.ops import FlatOperation, SchedulerError


def apply_assembly_links(
    model: cp_model.CpModel,
    starts: dict[UUID, cp_model.IntVar],
    ends: dict[UUID, cp_model.IntVar],
    flat_ops: list[FlatOperation],
    links: list[AssemblyLink],
    *,
    slot_minutes: int,
) -> None:
    if not links:
        return

    known = {op.op_id for op in flat_ops}
    lag_slots = max(1, slot_minutes)

    for link in links:
        pred = link.predecessor_operation_id
        succ = link.successor_operation_id
        if pred == succ:
            raise SchedulerError("Assembly link cannot be self-referential")
        if pred not in known or succ not in known:
            raise SchedulerError(
                f"Assembly link references unknown operation(s): {pred} -> {succ}",
            )
        if pred not in starts or succ not in starts:
            continue
        lag = max(0, link.lag_minutes)
        lag_slot = (lag + slot_minutes - 1) // slot_minutes
        model.add(ends[pred] + lag_slot <= starts[succ])
