"use client"

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { HELPDESK_ROUTES } from '../lib/helpdesk-routes'

type HelpdeskShellProps = {
  children: React.ReactNode
}

const NAV = [
  { href: HELPDESK_ROUTES.hub, labelKey: 'helpdesk.nav.home', icon: '◆' },
  { href: HELPDESK_ROUTES.workspace, labelKey: 'helpdesk.nav.workspace', icon: '▣' },
  { href: HELPDESK_ROUTES.report, labelKey: 'helpdesk.nav.report', icon: '＋' },
] as const

export function HelpdeskShell({ children }: HelpdeskShellProps) {
  const t = useT()
  const pathname = usePathname()

  return (
    <div className="space-y-6" data-helpdesk-shell="">
      <nav className="flex flex-wrap gap-2 border-b pb-3">
        {NAV.map((item) => {
          const active =
            pathname === item.href ||
            (item.href === HELPDESK_ROUTES.workspace && pathname?.includes('/helpdesk/workspace'))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <span aria-hidden className="text-xs opacity-70">
                {item.icon}
              </span>
              {t(item.labelKey, item.href)}
            </Link>
          )
        })}
      </nav>
      {children}
    </div>
  )
}
