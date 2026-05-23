"use client"

import * as React from 'react'
import Link from 'next/link'
import { CrmShell } from '../../../components/CrmShell'
import { Page, PageBody, PageHeader } from '@open-mercato/ui/backend/Page'
import { Button } from '@open-mercato/ui/primitives/button'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'
import { flash } from '@open-mercato/ui/backend/FlashMessages'
import { RecordPeekDrawer, type RecordPeekData } from '../../../components/RecordPeekDrawer'

type AtRiskItem = {
  dealId: string
  title: string
  riskLevel: 'medium' | 'high'
  reasons: string[]
  daysSinceLastActivity: number | null
  sentimentLabel: string | null
  source?: string
}

export default function Crm2027AtRiskPage() {
  const [items, setItems] = React.useState<AtRiskItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [scanning, setScanning] = React.useState(false)
  const [peek, setPeek] = React.useState<RecordPeekData | null>(null)
  const [peekOpen, setPeekOpen] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiCall<{ items: AtRiskItem[] }>(
        '/api/crm_2027/at-risk-deals?source=both&limit=50',
      )
      setItems(response.items ?? [])
    } catch {
      flash.error('Failed to load at-risk deals')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  const runScan = React.useCallback(async () => {
    setScanning(true)
    try {
      await apiCall('/api/crm_2027/risk-scan', {
        method: 'POST',
        body: JSON.stringify({ mode: 'sync' }),
      })
      flash.success('Risk scan completed')
      await load()
    } catch {
      flash.error('Risk scan failed')
    } finally {
      setScanning(false)
    }
  }, [load])

  const openPeek = (item: AtRiskItem) => {
    setPeek({
      dealId: item.dealId,
      title: item.title,
      riskLevel: item.riskLevel,
      reasons: item.reasons,
      sentimentLabel: item.sentimentLabel,
      daysSinceLastActivity: item.daysSinceLastActivity,
    })
    setPeekOpen(true)
  }

  return (
    <Page>
      <CrmShell>
        <PageHeader
          title="CRM 2027 — At-risk deals"
          description="Twenty-style triage: peek records in the side panel or open the full deal."
          actions={
            <Button type="button" onClick={() => void runScan()} disabled={scanning}>
              {scanning ? 'Scanning…' : 'Run risk scan'}
            </Button>
          }
        />
        <PageBody>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No at-risk deals detected.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-3 py-2">Deal</th>
                    <th className="px-3 py-2">Risk</th>
                    <th className="px-3 py-2">Signals</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={`${item.dealId}-${item.source ?? 'live'}`} className="border-t">
                      <td className="px-3 py-2 font-medium">{item.title}</td>
                      <td className="px-3 py-2">{item.riskLevel}</td>
                      <td className="px-3 py-2 text-muted-foreground">{item.reasons.join(', ')}</td>
                      <td className="px-3 py-2 space-x-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => openPeek(item)}>
                          Peek
                        </Button>
                        <Link
                          className="text-sm underline"
                          href={`/backend/customers/deals/${item.dealId}`}
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PageBody>
        <RecordPeekDrawer record={peek} open={peekOpen} onOpenChange={setPeekOpen} />
      </CrmShell>
    </Page>
  )
}
