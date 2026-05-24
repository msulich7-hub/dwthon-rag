/** Shared status badge classes — verified for light and dark themes. */
export function workOrderStatusClass(status: string): string {
  if (status === 'in_progress') return 'border-sky-500/40 bg-sky-500/10 text-sky-900 dark:text-sky-100'
  if (status === 'completed') return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100'
  if (status === 'cancelled') return 'border-muted bg-muted/40 text-muted-foreground'
  if (status === 'draft') return 'border-violet-500/40 bg-violet-500/10 text-violet-900 dark:text-violet-100'
  return 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100'
}

export function operationStatusClass(status: string): string {
  if (status === 'in_progress') return 'border-sky-500/40 bg-sky-500/10 text-sky-900 dark:text-sky-100'
  if (status === 'completed') return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100'
  if (status === 'ready') return 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100'
  if (status === 'skipped' || status === 'cancelled') {
    return 'border-muted bg-muted/40 text-muted-foreground'
  }
  return 'border-border bg-muted/30 text-muted-foreground'
}

export function andonLevelClass(level: 'green' | 'amber' | 'red'): string {
  if (level === 'green') return 'border-emerald-500/50 bg-emerald-500/15 text-emerald-900 dark:text-emerald-100'
  if (level === 'amber') return 'border-amber-500/50 bg-amber-500/15 text-amber-900 dark:text-amber-100'
  return 'border-red-500/50 bg-red-500/15 text-red-900 dark:text-red-100'
}
