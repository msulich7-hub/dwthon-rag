"use client"

import * as React from 'react'
import { ScanLine } from 'lucide-react'
import { Input } from '@open-mercato/ui/primitives/input'
import { Label } from '@open-mercato/ui/primitives/label'
import { useT } from '@open-mercato/shared/lib/i18n/context'

type MesScanFieldProps = {
  kiosk?: boolean
  onScan: (value: string) => void
  autoFocus?: boolean
  inputTestId?: string
}

export function MesScanField({
  kiosk = false,
  onScan,
  autoFocus = false,
  inputTestId = 'mes-scan-input',
}: MesScanFieldProps) {
  const t = useT()
  const [value, setValue] = React.useState('')
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  const submit = () => {
    const normalized = value.trim().toUpperCase()
    if (!normalized) return
    onScan(normalized)
    setValue('')
    inputRef.current?.focus()
  }

  return (
    <div className="space-y-1">
      <Label htmlFor="mes-scan-input" className="flex items-center gap-2">
        <ScanLine className="size-4" aria-hidden />
        {t('mes.scan.label', 'Scan barcode')}
      </Label>
      <Input
        ref={inputRef}
        id={inputTestId}
        data-testid={inputTestId}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            submit()
          }
        }}
        placeholder={t('mes.scan.placeholder', 'Work order # or operation code')}
        className={kiosk ? 'h-14 text-lg font-mono' : 'font-mono'}
        autoComplete="off"
        inputMode="text"
      />
      <p className="text-xs text-muted-foreground">{t('mes.scan.hint', 'Press Enter after scan (USB scanner supported).')}</p>
    </div>
  )
}
