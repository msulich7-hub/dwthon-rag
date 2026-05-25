'use client'

import * as React from 'react'
import { kiosk } from './kiosk-styles'

type Props = {
  icon: string
  label: string
  count: number
  onChange: (n: number) => void
}

export function StepperTile({ icon, label, count, onChange }: Props) {
  const active = count > 0
  return (
    <div className={`${kiosk.tile} ${active ? kiosk.tileActive : kiosk.tileIdle}`}>
      <span className="text-3xl" aria-hidden>
        {icon}
      </span>
      <span className="text-center text-sm font-semibold leading-tight">{label}</span>
      <div className="flex items-center gap-3 mt-1">
        <button
          type="button"
          className="w-12 h-12 rounded-xl border-2 text-2xl font-bold bg-slate-50 dark:bg-slate-800 active:scale-95"
          aria-label={`Mniej ${label}`}
          onClick={() => onChange(Math.max(0, count - 1))}
        >
          −
        </button>
        <span className="text-3xl font-black tabular-nums w-10 text-center">{count}</span>
        <button
          type="button"
          className="w-12 h-12 rounded-xl border-2 text-2xl font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 active:scale-95"
          aria-label={`Więcej ${label}`}
          onClick={() => onChange(count + 1)}
        >
          +
        </button>
      </div>
    </div>
  )
}
