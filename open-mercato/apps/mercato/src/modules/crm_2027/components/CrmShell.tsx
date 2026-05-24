"use client"

import * as React from 'react'
import Link from 'next/link'
import { registerHotkey } from '@open-mercato/shared/lib/hotkeys'
import { Button } from '@open-mercato/ui/primitives/button'
import { CrmCommandPalette } from './CrmCommandPalette'
import { CRM_ROUTES } from '../lib/crm-routes'

type CrmShellProps = {
  children: React.ReactNode
}

/**
 * CRM 2027 layout wrapper — local ⌘K / Ctrl+K command palette scoped to this module only.
 */
export function CrmShell({ children }: CrmShellProps) {
  const [paletteOpen, setPaletteOpen] = React.useState(false)

  React.useEffect(() => {
    const mac = registerHotkey('meta+k', 'crm_2027_palette', () => {
      setPaletteOpen((v) => !v)
    })
    const win = registerHotkey('ctrl+k', 'crm_2027_palette_win', () => {
      setPaletteOpen((v) => !v)
    })
    return () => {
      mac.unbind()
      win.unbind()
    }
  }, [])

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2 border-b pb-3">
        <Button type="button" variant="outline" size="sm" asChild>
          <Link href={CRM_ROUTES.hub}>CRM 2027</Link>
        </Button>
        <Button type="button" variant="outline" size="sm" asChild>
          <Link href={CRM_ROUTES.search}>Search</Link>
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setPaletteOpen(true)}>
          Commands ⌘K
        </Button>
      </div>
      {children}
      <CrmCommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  )
}
