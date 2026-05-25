'use client'

import * as React from 'react'
import Link from 'next/link'
import { kiosk } from './kiosk-styles'

type Props = {
  title: string
  subtitle?: string
  progress?: string
  backHref?: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export function KioskShell({ title, subtitle, progress, backHref, children, footer }: Props) {
  return (
    <div className={kiosk.shell}>
      <header className={kiosk.header}>
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div className="min-w-0">
            {backHref ? (
              <Link href={backHref} className="text-sm text-emerald-600 font-medium mb-1 inline-block">
                ← Wróć
              </Link>
            ) : null}
            <h1 className={kiosk.title}>{title}</h1>
            {subtitle ? <p className={kiosk.subtitle}>{subtitle}</p> : null}
          </div>
          {progress ? <div className={kiosk.progress}>{progress}</div> : null}
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6 pb-32">{children}</main>
      {footer ? <div className={kiosk.footer}>{footer}</div> : null}
    </div>
  )
}
