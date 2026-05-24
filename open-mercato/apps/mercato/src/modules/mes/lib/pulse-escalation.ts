import type { PulseSnapshot } from './pulse-snapshot'

export type AndonAlertLevel = 'info' | 'warning' | 'critical'

export type AndonAlert = {
  code: string
  level: AndonAlertLevel
  messageKey: string
  messageFallback: string
  params?: Record<string, string | number>
}

export type PulseEscalation = {
  andon: PulseSnapshot['andon']
  escalationLevel: 0 | 1 | 2 | 3
  alerts: AndonAlert[]
}

const THRESHOLDS = {
  queueReadyWarning: 5,
  queueReadyCritical: 15,
  queueInProgressWarning: 3,
  queueInProgressCritical: 8,
} as const

export function buildPulseEscalation(snapshot: PulseSnapshot): PulseEscalation {
  const alerts: AndonAlert[] = []
  let escalationLevel: PulseEscalation['escalationLevel'] = 0

  const { ready, inProgress, total } = snapshot.queue
  const { active, completed } = snapshot.dashboard

  if (ready >= THRESHOLDS.queueReadyCritical) {
    alerts.push({
      code: 'QUEUE_READY_CRITICAL',
      level: 'critical',
      messageKey: 'mes.pulse.alert.queueReadyCritical',
      messageFallback: 'Dispatch backlog critical: {count} operations waiting.',
      params: { count: ready },
    })
    escalationLevel = 3
  } else if (ready >= THRESHOLDS.queueReadyWarning) {
    alerts.push({
      code: 'QUEUE_READY_WARNING',
      level: 'warning',
      messageKey: 'mes.pulse.alert.queueReadyWarning',
      messageFallback: 'Dispatch backlog: {count} operations ready.',
      params: { count: ready },
    })
    escalationLevel = Math.max(escalationLevel, 2) as PulseEscalation['escalationLevel']
  }

  if (inProgress >= THRESHOLDS.queueInProgressCritical) {
    alerts.push({
      code: 'WIP_CRITICAL',
      level: 'critical',
      messageKey: 'mes.pulse.alert.wipCritical',
      messageFallback: 'Too many operations in progress ({count}).',
      params: { count: inProgress },
    })
    escalationLevel = 3
  } else if (inProgress >= THRESHOLDS.queueInProgressWarning) {
    alerts.push({
      code: 'WIP_WARNING',
      level: 'warning',
      messageKey: 'mes.pulse.alert.wipWarning',
      messageFallback: 'High WIP: {count} operations in progress.',
      params: { count: inProgress },
    })
    escalationLevel = Math.max(escalationLevel, 2) as PulseEscalation['escalationLevel']
  }

  if (active > completed && active >= 5) {
    alerts.push({
      code: 'ACTIVE_WO_BACKLOG',
      level: 'warning',
      messageKey: 'mes.pulse.alert.activeBacklog',
      messageFallback: 'More active work orders ({active}) than completed ({completed}).',
      params: { active, completed },
    })
    escalationLevel = Math.max(escalationLevel, 2) as PulseEscalation['escalationLevel']
  }

  for (const wc of snapshot.workCenters) {
    if (wc.workCenterCode !== '__unassigned__' && wc.ready >= 4) {
      alerts.push({
        code: 'WORK_CENTER_BACKLOG',
        level: 'warning',
        messageKey: 'mes.pulse.alert.workCenterBacklog',
        messageFallback: 'Work center {center} has {count} ready operations.',
        params: { center: wc.workCenterCode, count: wc.ready },
      })
      escalationLevel = Math.max(escalationLevel, 2) as PulseEscalation['escalationLevel']
    }
  }

  if (total === 0 && active > 0) {
    alerts.push({
      code: 'NO_DISPATCH',
      level: 'info',
      messageKey: 'mes.pulse.alert.noDispatch',
      messageFallback: 'Active work orders but empty dispatch queue — check routing release.',
      params: {},
    })
    escalationLevel = Math.max(escalationLevel, 1) as PulseEscalation['escalationLevel']
  }

  const andon =
    escalationLevel >= 3 ? 'red' : escalationLevel >= 2 ? 'amber' : escalationLevel >= 1 ? 'amber' : 'green'

  return { andon, escalationLevel, alerts }
}
