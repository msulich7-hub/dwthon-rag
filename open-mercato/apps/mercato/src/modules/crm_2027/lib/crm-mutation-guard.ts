import {
  runCrudMutationGuardAfterSuccess,
  validateCrudMutationGuard,
} from '@open-mercato/shared/lib/crud/mutation-guard'

export function resolveGuardUserId(auth: {
  sub?: string | null
  userId?: string | null
}): string {
  if (typeof auth.sub === 'string' && auth.sub.trim()) return auth.sub
  if (typeof auth.userId === 'string' && auth.userId.trim()) return auth.userId
  return 'system'
}

export async function runCrm2027MutationGuard(
  request: Request,
  scope: { tenantId: string; organizationId: string; auth?: { sub?: string | null; userId?: string | null } },
): Promise<{ ok: true } | { ok: false; status: number; body: unknown }> {
  const guardResult = await validateCrudMutationGuard({
    request,
    userId: resolveGuardUserId(scope.auth ?? {}),
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
  if (guardResult && !guardResult.ok) {
    return { ok: false, status: guardResult.status, body: guardResult.body }
  }
  return { ok: true }
}

export async function completeCrm2027MutationGuard(
  request: Request,
  scope: { tenantId: string; organizationId: string; auth?: { sub?: string | null; userId?: string | null } },
): Promise<void> {
  await runCrudMutationGuardAfterSuccess({
    request,
    userId: resolveGuardUserId(scope.auth ?? {}),
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
}
