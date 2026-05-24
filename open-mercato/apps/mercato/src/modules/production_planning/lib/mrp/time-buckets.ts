/** ISO week bucket key (Monday-based, UTC). */
export function weekBucketKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() - day + 1)
  return d.toISOString().slice(0, 10)
}

export function poolGroupKey(productSku: string, dueAt: Date | null | undefined): string {
  const bucket = dueAt ? weekBucketKey(dueAt) : 'no-due'
  return `${productSku}::${bucket}`
}
