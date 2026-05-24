"use client"

import * as React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import type { PerspectivesIndexResponse } from '@open-mercato/shared/modules/perspectives/types'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'
import { flash } from '@open-mercato/ui/backend/FlashMessages'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@open-mercato/ui/primitives/select'
import {
  getCrmPerspectiveTableId,
  type CrmPerspectiveEntity,
} from '../lib/perspective-bridge'

const PERSPECTIVE_COOKIE_PREFIX = 'om_table_perspective'
const PERSPECTIVE_STORAGE_PREFIX = 'om_table_perspective_snapshot'

function detectEntity(pathname: string | null): CrmPerspectiveEntity | null {
  if (!pathname) return null
  if (pathname.includes('/customers/deals') || pathname.includes('/crm_2027/deals')) return 'deals'
  if (pathname.includes('/customers/companies') || pathname.includes('/crm_2027/companies')) return 'companies'
  if (pathname.includes('/customers/people') || pathname.includes('/crm_2027/people')) return 'people'
  return null
}

function activateCustomersPerspective(targetTableId: string, targetPerspectiveId: string) {
  if (typeof document !== 'undefined') {
    const key = `${PERSPECTIVE_COOKIE_PREFIX}:${targetTableId}`
    document.cookie = `${key}=${encodeURIComponent(targetPerspectiveId)}; path=/; Max-Age=31536000`
  }
  if (typeof window !== 'undefined') {
    const key = `${PERSPECTIVE_STORAGE_PREFIX}:${targetTableId}`
    window.localStorage.setItem(
      key,
      JSON.stringify({
        perspectiveId: targetPerspectiveId,
        settings: null,
        updatedAt: new Date().toISOString(),
      }),
    )
  }
}

type ApplyResponse = {
  ok: boolean
  targetTableId: string
  targetPerspectiveId: string
  targetPerspectiveName: string
}

export function CrmViewsBar() {
  const pathname = usePathname()
  const router = useRouter()
  const entity = detectEntity(pathname)
  const [applying, setApplying] = React.useState(false)

  const tableId = entity ? getCrmPerspectiveTableId(entity) : null

  const { data, isLoading } = useQuery<PerspectivesIndexResponse>({
    queryKey: ['crm-2027-views', tableId],
    enabled: Boolean(tableId),
    queryFn: async () => {
      if (!tableId) throw new Error('missing table')
      const { ok, result } = await apiCall<PerspectivesIndexResponse>(
        `/api/perspectives/${encodeURIComponent(tableId)}`,
      )
      if (!ok || !result) throw new Error('Failed to load CRM views')
      return result
    },
  })

  const views = React.useMemo(() => {
    if (!data) return []
    return [...data.perspectives, ...data.rolePerspectives]
  }, [data])

  if (!entity || !tableId) return null

  const onApply = async (perspectiveId: string) => {
    setApplying(true)
    try {
      const result = await apiCall<ApplyResponse>('/api/crm_2027/views/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity, perspectiveId }),
      })
      if (!result?.ok) throw new Error('Apply failed')
      activateCustomersPerspective(result.targetTableId, result.targetPerspectiveId)
      flash(`Applied view “${result.targetPerspectiveName}”`)
      router.refresh()
    } catch {
      flash('Could not apply CRM view')
    } finally {
      setApplying(false)
    }
  }

  if (isLoading && views.length === 0) {
    return (
      <span className="text-xs text-muted-foreground mr-2 whitespace-nowrap">CRM views…</span>
    )
  }

  if (views.length === 0) {
    return (
      <span className="text-xs text-muted-foreground mr-2 whitespace-nowrap" title={tableId}>
        No CRM views
      </span>
    )
  }

  return (
    <Select disabled={applying} onValueChange={(id) => void onApply(id)}>
      <SelectTrigger className="h-7 w-[9.5rem] text-xs mr-2" aria-label="CRM 2027 saved views">
        <SelectValue placeholder="CRM views" />
      </SelectTrigger>
      <SelectContent>
        {views.map((view) => (
          <SelectItem key={view.id} value={view.id}>
            {view.name.trim() || 'Untitled'}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
