"use client"

import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Page, PageBody, PageHeader } from '@open-mercato/ui/backend/Page'
import { DataTable } from '@open-mercato/ui/backend/DataTable'
import { readApiResultOrThrow } from '@open-mercato/ui/backend/utils/apiCall'
import { flash } from '@open-mercato/ui/backend/FlashMessages'
import { Button } from '@open-mercato/ui/primitives/button'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { MesShell } from '../../../components/MesShell'
import { MesEmptyState } from '../../../components/MesEmptyState'
import { MesListSkeleton } from '../../../components/MesListSkeleton'
import {
  RoutingTemplateEditor,
  type RoutingStepDraft,
} from '../../../components/RoutingTemplateEditor'

type RoutingStep = {
  sequence: number
  operationCode: string
  operationName: string
  workCenterCode: string | null
}

type RoutingTemplateRow = {
  id: string
  code: string
  name: string
  productCode: string
  version: number
  isActive: boolean
  steps: RoutingStep[]
}

type TemplatesResponse = {
  templates: RoutingTemplateRow[]
}

export default function MesRoutingPage() {
  const t = useT()
  const [rows, setRows] = React.useState<RoutingTemplateRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [expandedId, setExpandedId] = React.useState<string | null>(null)
  const [editorMode, setEditorMode] = React.useState<'none' | 'create' | 'edit'>('none')

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const payload = await readApiResultOrThrow<TemplatesResponse>('/api/mes/routing-templates?isActive=true')
      setRows(payload.templates ?? [])
    } catch {
      flash(t('mes.routing.loadError', 'Failed to load routing templates'), 'error')
    } finally {
      setLoading(false)
    }
  }, [t])

  React.useEffect(() => {
    void load()
  }, [load])

  const columns = React.useMemo<ColumnDef<RoutingTemplateRow>[]>(
    () => [
      {
        accessorKey: 'code',
        header: t('mes.routing.columns.code', 'Code'),
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.code}</span>,
      },
      { accessorKey: 'name', header: t('mes.routing.columns.name', 'Name') },
      { accessorKey: 'productCode', header: t('mes.routing.columns.product', 'Product') },
      {
        id: 'steps',
        header: t('mes.routing.columns.steps', 'Steps'),
        cell: ({ row }) => row.original.steps.length,
      },
      {
        accessorKey: 'version',
        header: t('mes.routing.columns.version', 'Ver.'),
      },
    ],
    [t],
  )

  const expanded = rows.find((row) => row.id === expandedId)

  const expandedSteps: RoutingStepDraft[] | undefined = expanded?.steps.map((step) => ({
    sequence: step.sequence,
    operationCode: step.operationCode,
    operationName: step.operationName,
    workCenterCode: step.workCenterCode ?? '',
  }))

  return (
    <Page>
      <MesShell>
        <PageHeader
          title={t('mes.routing.title', 'Routing templates')}
          description={t(
            'mes.routing.description',
            'Product routings used when releasing work orders to the shop floor.',
          )}
          actions={
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setEditorMode('create')
                setExpandedId(null)
              }}
            >
              {t('mes.routing.newTemplate', 'New template')}
            </Button>
          }
        />
        <PageBody className="space-y-6">
          {editorMode === 'create' ? (
            <RoutingTemplateEditor
              onSaved={() => {
                setEditorMode('none')
                void load()
              }}
              onCancel={() => setEditorMode('none')}
            />
          ) : null}

          {loading ? (
            <MesListSkeleton rows={4} />
          ) : rows.length === 0 && editorMode !== 'create' ? (
            <MesEmptyState
              title={t('mes.routing.empty', 'No routing templates')}
              description={t('mes.routing.emptyHint', 'Create a template to release operations to the shop floor.')}
              action={
                <Button type="button" size="sm" onClick={() => setEditorMode('create')}>
                  {t('mes.routing.newTemplate', 'New template')}
                </Button>
              }
            />
          ) : (
            <>
              <DataTable
                title={t('mes.routing.tableTitle', 'Active templates')}
                columns={columns}
                data={rows}
                isLoading={false}
                onRowClick={(row) => {
                  setExpandedId((id) => (id === row.id ? null : row.id))
                  setEditorMode('none')
                }}
                emptyState={
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    {t('mes.routing.empty', 'No routing templates')}
                  </p>
                }
              />
              {expanded ? (
                <section className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-medium">
                      {t('mes.routing.stepsFor', 'Steps for {code}', { code: expanded.code })}
                    </h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditorMode(editorMode === 'edit' ? 'none' : 'edit')}
                    >
                      {editorMode === 'edit'
                        ? t('mes.routing.closeEditor', 'Close editor')
                        : t('mes.routing.editSteps', 'Edit steps')}
                    </Button>
                  </div>
                  {editorMode === 'edit' ? (
                    <RoutingTemplateEditor
                      templateId={expanded.id}
                      initialSteps={expandedSteps}
                      onSaved={() => {
                        setEditorMode('none')
                        void load()
                      }}
                      onCancel={() => setEditorMode('none')}
                    />
                  ) : (
                    <ol className="space-y-2">
                      {expanded.steps.map((step) => (
                        <li
                          key={`${expanded.id}-${step.sequence}`}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/30 px-3 py-2 text-sm"
                        >
                          <span>
                            <span className="font-mono text-muted-foreground mr-2">{step.sequence}</span>
                            {step.operationName}
                            <span className="text-xs text-muted-foreground ml-2">({step.operationCode})</span>
                          </span>
                          {step.workCenterCode ? (
                            <span className="text-xs rounded-full border px-2 py-0.5 bg-background">
                              {step.workCenterCode}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
              ) : null}
            </>
          )}
        </PageBody>
      </MesShell>
    </Page>
  )
}
