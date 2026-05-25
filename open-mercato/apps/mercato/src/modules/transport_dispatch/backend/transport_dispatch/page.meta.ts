import React from 'react'

const icon = React.createElement(
  'svg',
  { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
  React.createElement('path', { d: 'M5 18H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2' }),
  React.createElement('path', { d: 'M19 6h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2' }),
  React.createElement('path', { d: 'M7 18V6h10v12H7z' }),
)

export const metadata = {
  requireAuth: true,
  requireFeatures: ['transport_dispatch.view'],
  pageTitle: 'Transport',
  pageTitleKey: 'transport_dispatch.nav.title',
  pageGroup: 'Logistics',
  pageGroupKey: 'transport_dispatch.nav.group',
  pageOrder: 15000,
  icon,
}
