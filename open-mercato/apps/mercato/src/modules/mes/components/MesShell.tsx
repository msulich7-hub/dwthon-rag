"use client"

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@open-mercato/ui/primitives/button'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { MES_ROUTES } from '../lib/mes-routes'

type MesShellProps = {
  children: React.ReactNode
}

const NAV_ITEMS = [
  { href: MES_ROUTES.hub, labelKey: 'mes.shell.nav.hub', fallback: 'Hub' },
  { href: MES_ROUTES.workOrders, labelKey: 'mes.shell.nav.workOrders', fallback: 'Work orders' },
  { href: MES_ROUTES.operator, labelKey: 'mes.shell.nav.operator', fallback: 'Operator' },
  { href: MES_ROUTES.routing, labelKey: 'mes.shell.nav.routing', fallback: 'Routing' },
  { href: MES_ROUTES.pulse, labelKey: 'mes.shell.nav.pulse', fallback: 'Pulse' },
  { href: MES_ROUTES.trace, labelKey: 'mes.shell.nav.trace', fallback: 'Trace' },
] as const

export function MesShell({ children }: MesShellProps) {
  const t = useT()
  const pathname = usePathname()

  return (
    <>
      <nav
        className="mb-4 flex flex-wrap items-center gap-2 border-b pb-3"
        aria-label={t('mes.shell.navLabel', 'MES navigation')}
      >
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(`${item.href}/`)
          return (
            <Button key={item.href} type="button" variant={active ? 'secondary' : 'outline'} size="sm" asChild>
              <Link href={item.href}>{t(item.labelKey, item.fallback)}</Link>
            </Button>
          )
        })}
        <Button type="button" variant="ghost" size="sm" asChild className="ml-auto">
          <Link href={MES_ROUTES.operatorKiosk}>{t('mes.shell.kiosk', 'Kiosk mode')}</Link>
        </Button>
      </nav>
      {children}
    </>
  )
}
