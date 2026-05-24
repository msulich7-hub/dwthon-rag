/** Deep-link to deal activities tab on the customers detail page. */
export function dealActivitiesTabUrl(dealId: string, interactionId?: string | null): string {
  const base = `/backend/customers/deals/${encodeURIComponent(dealId)}?tab=activities`
  if (!interactionId) return base
  return `${base}#interaction-${encodeURIComponent(interactionId)}`
}
