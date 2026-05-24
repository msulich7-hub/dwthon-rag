import { handleProviderWebhookPost } from '../../../lib/handle-provider-webhook'

export const metadata = {
  POST: { requireAuth: false },
}

export async function POST(request: Request) {
  return handleProviderWebhookPost(request, 'zoom')
}
