from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

ProductionOrderStatus = Literal["draft", "planned", "in_progress", "completed", "cancelled"]
ScheduleObjective = Literal["minimize_lateness", "minimize_changeover", "balance_load"]
ScheduleJobStatus = Literal["queued", "completed", "failed"]


class ProductionOperation(BaseModel):
    """Mirrors Mercato ProductionOperationDto."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, populate_by_name=True)

    id: UUID
    production_order_id: UUID = Field(alias="productionOrderId")
    sequence_no: int = Field(alias="sequenceNo", ge=1, le=999)
    name: str = Field(min_length=1, max_length=300)
    work_center_code: str = Field(alias="workCenterCode", min_length=1, max_length=80)
    duration_minutes: int = Field(alias="durationMinutes", ge=1, le=60 * 24 * 14)
    status: str = "pending"
    planned_start_at: datetime | None = Field(default=None, alias="plannedStartAt")
    planned_end_at: datetime | None = Field(default=None, alias="plannedEndAt")


class ProductionOrder(BaseModel):
    """Mirrors Mercato ProductionOrderDto plus embedded routing operations."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, populate_by_name=True)

    id: UUID
    code: str = Field(min_length=1, max_length=80)
    title: str = Field(min_length=1, max_length=500)
    sales_order_id: UUID | None = Field(default=None, alias="salesOrderId")
    product_sku: str | None = Field(default=None, alias="productSku", max_length=120)
    quantity: float = Field(default=1, gt=0, le=1_000_000)
    status: ProductionOrderStatus
    work_center_code: str | None = Field(default=None, alias="workCenterCode", max_length=80)
    planned_start_at: datetime | None = Field(default=None, alias="plannedStartAt")
    planned_end_at: datetime | None = Field(default=None, alias="plannedEndAt")
    due_at: datetime | None = Field(default=None, alias="dueAt")
    is_late: bool = Field(default=False, alias="isLate")
    created_at: datetime | None = Field(default=None, alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")
    operations: list[ProductionOperation] = Field(default_factory=list, min_length=1)

    @field_validator("operations")
    @classmethod
    def operations_belong_to_order(cls, ops: list[ProductionOperation], info) -> list[ProductionOperation]:
        order_id = info.data.get("id")
        if order_id is None:
            return ops
        for op in ops:
            if op.production_order_id != order_id:
                msg = f"operation {op.id} productionOrderId must match order id"
                raise ValueError(msg)
        return ops


class ScheduleRequest(BaseModel):
    """Payload sent by Mercato after loading orders + operations from the database."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    tenant_id: UUID = Field(alias="tenantId")
    organization_id: UUID = Field(alias="organizationId")
    production_order_ids: list[UUID] | None = Field(
        default=None,
        alias="productionOrderIds",
        min_length=1,
        max_length=500,
    )
    orders: list[ProductionOrder] = Field(min_length=1, max_length=500)
    horizon_hours: int = Field(default=168, alias="horizonHours", ge=24, le=24 * 30)
    objective: ScheduleObjective = "minimize_lateness"
    planning_start_at: datetime | None = Field(default=None, alias="planningStartAt")

    @field_validator("orders")
    @classmethod
    def validate_order_filter(cls, orders: list[ProductionOrder], info) -> list[ProductionOrder]:
        filter_ids = info.data.get("production_order_ids")
        if not filter_ids:
            return orders
        allowed = set(filter_ids)
        filtered = [o for o in orders if o.id in allowed]
        if not filtered:
            raise ValueError("productionOrderIds did not match any supplied orders")
        return filtered


class ScheduledOperation(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    operation_id: UUID = Field(alias="operationId", serialization_alias="operationId")
    work_center_code: str = Field(alias="workCenterCode", serialization_alias="workCenterCode")
    planned_start_at: datetime = Field(alias="plannedStartAt", serialization_alias="plannedStartAt")
    planned_end_at: datetime = Field(alias="plannedEndAt", serialization_alias="plannedEndAt")


class ScheduleResponse(BaseModel):
    """Compatible with Mercato HexalyOptimizeResult."""

    model_config = ConfigDict(populate_by_name=True)

    job_id: str = Field(alias="jobId", serialization_alias="jobId")
    status: ScheduleJobStatus
    schedule: list[ScheduledOperation] | None = None
    message: str | None = None
    solver_status: str | None = Field(default=None, alias="solverStatus", serialization_alias="solverStatus")
    objective_value: int | None = Field(
        default=None,
        alias="objectiveValue",
        serialization_alias="objectiveValue",
    )


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: str
    version: str
