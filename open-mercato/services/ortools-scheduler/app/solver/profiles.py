"""CP-SAT size-tier profiles shared by monolithic and rolling solvers."""

from __future__ import annotations

import os
from dataclasses import dataclass
from enum import Enum

from ortools.sat.python import cp_model


class SolverSizeTier(str, Enum):
    SMALL = "small"
    MEDIUM = "medium"
    LARGE = "large"


@dataclass(frozen=True)
class CpSatParameterProfile:
    max_time_in_seconds: float
    worker_cap: int
    search_branching: int
    linearization_level: int
    use_lns: bool
    use_lb_relax_lns: bool
    use_rins_lns: bool
    interleave_search: bool
    symmetry_level: int
    relative_gap_limit: float
    optimize_with_max_hs: bool
    cp_model_presolve: bool
    use_precedences_in_disjunctive_constraint: bool
    probing_deterministic_time_limit: float | None = None


def cpu_count() -> int:
    return os.cpu_count() or 4


def tier_for_operation_count(num_operations: int) -> SolverSizeTier:
    if num_operations <= 100:
        return SolverSizeTier.SMALL
    if num_operations <= 1000:
        return SolverSizeTier.MEDIUM
    return SolverSizeTier.LARGE


CPSAT_PROFILES: dict[SolverSizeTier, CpSatParameterProfile] = {
    SolverSizeTier.SMALL: CpSatParameterProfile(
        max_time_in_seconds=30.0,
        worker_cap=4,
        search_branching=cp_model.PORTFOLIO_SEARCH,
        linearization_level=2,
        use_lns=False,
        use_lb_relax_lns=False,
        use_rins_lns=False,
        interleave_search=False,
        symmetry_level=2,
        relative_gap_limit=0.0,
        optimize_with_max_hs=False,
        cp_model_presolve=True,
        use_precedences_in_disjunctive_constraint=True,
    ),
    SolverSizeTier.MEDIUM: CpSatParameterProfile(
        max_time_in_seconds=120.0,
        worker_cap=8,
        search_branching=cp_model.PORTFOLIO_SEARCH,
        linearization_level=2,
        use_lns=True,
        use_lb_relax_lns=True,
        use_rins_lns=True,
        interleave_search=True,
        symmetry_level=2,
        relative_gap_limit=0.01,
        optimize_with_max_hs=True,
        cp_model_presolve=True,
        use_precedences_in_disjunctive_constraint=True,
    ),
    SolverSizeTier.LARGE: CpSatParameterProfile(
        max_time_in_seconds=300.0,
        worker_cap=16,
        search_branching=cp_model.PORTFOLIO_SEARCH,
        linearization_level=2,
        use_lns=True,
        use_lb_relax_lns=True,
        use_rins_lns=True,
        interleave_search=True,
        symmetry_level=1,
        relative_gap_limit=0.02,
        optimize_with_max_hs=True,
        cp_model_presolve=True,
        use_precedences_in_disjunctive_constraint=True,
        probing_deterministic_time_limit=0.5,
    ),
}


def apply_cpsat_profile(
    solver: cp_model.CpSolver,
    profile: CpSatParameterProfile,
    *,
    timeout_seconds: int | None,
    num_workers: int,
) -> None:
    params = solver.parameters
    params.max_time_in_seconds = float(
        timeout_seconds if timeout_seconds is not None else profile.max_time_in_seconds
    )
    params.num_search_workers = num_workers if num_workers > 0 else min(profile.worker_cap, cpu_count())
    params.search_branching = profile.search_branching
    params.linearization_level = profile.linearization_level
    params.use_lns = profile.use_lns
    params.use_lb_relax_lns = profile.use_lb_relax_lns
    params.use_rins_lns = profile.use_rins_lns
    params.interleave_search = profile.interleave_search
    params.symmetry_level = profile.symmetry_level
    params.relative_gap_limit = profile.relative_gap_limit
    params.optimize_with_max_hs = profile.optimize_with_max_hs
    params.cp_model_presolve = profile.cp_model_presolve
    params.use_precedences_in_disjunctive_constraint = profile.use_precedences_in_disjunctive_constraint
    if profile.probing_deterministic_time_limit is not None:
        params.probing_deterministic_time_limit = profile.probing_deterministic_time_limit
