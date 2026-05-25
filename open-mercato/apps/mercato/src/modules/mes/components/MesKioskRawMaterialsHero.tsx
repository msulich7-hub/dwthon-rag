"use client"

import Link from 'next/link'
import { Package } from 'lucide-react'
import { Button } from '@open-mercato/ui/primitives/button'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { MES_ROUTES } from '../lib/mes-routes'

type MesKioskRawMaterialsHeroProps = {
  workOrderId?: string | null
  nestCode?: string | null
}

export function MesKioskRawMaterialsHero({ workOrderId, nestCode }: MesKioskRawMaterialsHeroProps) {
  const t = useT()
  const href = MES_ROUTES.operatorRawMaterialsKiosk({
    workOrderId: workOrderId ?? undefined,
    nest: nestCode ?? undefined,
  })

  return (
    <section
      className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-background to-background p-6 shadow-md"
      aria-label={t('mes.rawMaterials.hero.aria', 'Raw material replenishment')}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-4 items-start">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Package className="h-8 w-8" aria-hidden />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              {t('mes.rawMaterials.hero.title', 'Order raw materials')}
            </h2>
            <p className="text-base text-muted-foreground mt-1 max-w-md">
              {t(
                'mes.rawMaterials.hero.description',
                'One tap — pick the work order and how many replenishment orders to place.',
              )}
            </p>
          </div>
        </div>
        <Button size="lg" className="min-h-16 text-lg px-8 w-full sm:w-auto shrink-0" asChild>
          <Link href={href}>{t('mes.rawMaterials.hero.cta', 'Open order form')}</Link>
        </Button>
      </div>
    </section>
  )
}
