export type ServiceDeskWidgetSettings = {
  showSla: boolean
}

export const DEFAULT_SETTINGS: ServiceDeskWidgetSettings = {
  showSla: true,
}

export function hydrateServiceDeskSettings(raw: unknown): ServiceDeskWidgetSettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SETTINGS }
  const data = raw as Partial<ServiceDeskWidgetSettings>
  return {
    showSla: data.showSla ?? DEFAULT_SETTINGS.showSla,
  }
}
