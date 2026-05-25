"use client"

import * as React from 'react'

type MesKioskShellProps = {
  children: React.ReactNode
  footer?: React.ReactNode
}

/** Full-viewport shop-floor shell — minimal chrome, no admin nav. */
export function MesKioskShell({ children, footer }: MesKioskShellProps) {
  return (
    <div
      data-testid="mes-kiosk-shell"
      className="fixed inset-0 z-[100] flex flex-col bg-background text-foreground overflow-hidden"
    >
      <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
      {footer}
    </div>
  )
}
