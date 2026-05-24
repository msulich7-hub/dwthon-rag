"use client"

import * as React from 'react'
import { usePathname } from 'next/navigation'
import { CrmCommandPalette } from '../../../components/CrmCommandPalette'

const CRM_PATH_PREFIXES = ['/backend/crm_2027', '/backend/customers/deals', '/backend/customers/people', '/backend/customers/companies']

function isCrmContextPath(pathname: string): boolean {
  return CRM_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export default function CrmCmdkHotkeyWidget() {
  const pathname = usePathname() ?? ''
  const [open, setOpen] = React.useState(false)
  const enabled = isCrmContextPath(pathname)

  React.useEffect(() => {
    if (!enabled) return

    const onKeyDown = (event: KeyboardEvent) => {
      const isK = event.key.toLowerCase() === 'k'
      const mod = event.metaKey || event.ctrlKey
      if (!mod || !isK) return
      event.preventDefault()
      setOpen((value) => !value)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])

  if (!enabled) return null

  return (
    <>
      <span className="sr-only" data-crm-2027-cmdk-hint="">
        Press Cmd+K or Ctrl+K for CRM 2027 commands
      </span>
      <CrmCommandPalette open={open} onOpenChange={setOpen} />
    </>
  )
}
