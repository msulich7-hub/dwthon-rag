# SPEC: CRM 2027 Phase B+ (views, risk chips, notifications)

**Status:** implemented  
**Constraint:** no edits to `packages/core`, `packages/ui`, `packages/ai-assistant`

## Delivered

1. **CRM saved views bar** — `CrmViewsBar` on list injection; uses `/api/perspectives/crm_2027.*` and `POST /api/crm_2027/views/apply` to mirror onto `customers.*.list`
2. **Deal risk chips** — `deal-risk-chips` on `detail:customers.deal:status-badges`; `GET /api/crm_2027/deals/[dealId]/risk`
3. **High-risk notifications** — `crm_2027.deal.high_risk` event + subscriber + `notifications.ts`
4. **Scheduled risk scan** — org-scoped 6h interval via `scheduler` in `setup.seedDefaults`

## Perspective tableIds

| Entity | CRM tableId | Customers list tableId |
|--------|-------------|--------------------------|
| people | `crm_2027.people` | `customers.people.list` |
| companies | `crm_2027.companies` | `customers.companies.list` |
| deals | `crm_2027.deals` | `customers.deals.list` |

Save views in the DataTable “Views” panel using the CRM tableId (or mirror from customers via apply).

## Next

- Meeting transcription ingest (product foundation phase 3)
- Official `@open-mercato/crm-2027` package publish path
