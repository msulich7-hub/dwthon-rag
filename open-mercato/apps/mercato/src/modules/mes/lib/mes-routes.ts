export const MES_ROUTES = {
  hub: '/backend/mes',
  workOrders: '/backend/mes/work-orders',
  workOrder: (workOrderId: string) => `/backend/mes/work-orders/${encodeURIComponent(workOrderId)}`,
  operator: '/backend/mes/operator',
  operatorKiosk: (opts?: { nest?: string }) => {
    const params = new URLSearchParams({ kiosk: '1' })
    if (opts?.nest) params.set('nest', opts.nest)
    return `/backend/mes/operator?${params.toString()}`
  },
  operatorRawMaterials: '/backend/mes/operator/raw-materials',
  operatorRawMaterialsKiosk: (opts?: { workOrderId?: string; nest?: string }) => {
    const params = new URLSearchParams({ kiosk: '1' })
    if (opts?.workOrderId) params.set('workOrderId', opts.workOrderId)
    if (opts?.nest) params.set('nest', opts.nest)
    return `/backend/mes/operator/raw-materials?${params.toString()}`
  },
  routing: '/backend/mes/routing',
  pulse: '/backend/mes/pulse',
  trace: '/backend/mes/trace',
  quality: '/backend/mes/quality',
  salesOrders: '/backend/sales/orders',
} as const
