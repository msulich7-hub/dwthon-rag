export const MES_ROUTES = {
  hub: '/backend/mes',
  workOrders: '/backend/mes/work-orders',
  workOrder: (workOrderId: string) => `/backend/mes/work-orders/${encodeURIComponent(workOrderId)}`,
  operator: '/backend/mes/operator',
  operatorKiosk: '/backend/mes/operator?kiosk=1',
  operatorRawMaterials: '/backend/mes/operator/raw-materials',
  operatorRawMaterialsKiosk: (workOrderId?: string) => {
    const params = new URLSearchParams({ kiosk: '1' })
    if (workOrderId) params.set('workOrderId', workOrderId)
    return `/backend/mes/operator/raw-materials?${params.toString()}`
  },
  routing: '/backend/mes/routing',
  pulse: '/backend/mes/pulse',
  trace: '/backend/mes/trace',
  quality: '/backend/mes/quality',
  salesOrders: '/backend/sales/orders',
} as const
