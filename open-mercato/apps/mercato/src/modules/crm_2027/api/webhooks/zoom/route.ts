import { handleProviderWebhookPost } from '../../../../call_transcripts/lib/handle-provider-webhook'
import { NextResponse } from 'next/server'

export const metadata = {
  POST: { requireAuth: false },
}

/**
 * @deprecated Use POST /api/call_transcripts/webhooks/zoom
 */
export async function POST(request: Request) {
  const response = await handleProviderWebhookPost(request, 'zoom')
  if (response instanceof Response) {
    const headers = new Headers(response.headers)
    headers.set('Deprecation', 'true')
    headers.set('Link', '</api/call_transcripts/webhooks/zoom>; rel="successor-version"')
    return new NextResponse(response.body, { status: response.status, headers })
  }
  return response
}
