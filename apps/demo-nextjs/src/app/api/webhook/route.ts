import { getBillingProvider } from '@/lib/billing';
import { getErrorMessage, jsonError } from '@/lib/network';

export async function POST(request: Request): Promise<Response> {
  try {
    const billing = getBillingProvider();
    const payload = await request.text();
    const normalizedEvent = await billing.verifyWebhook({
      payload,
      headers: Object.fromEntries(request.headers.entries()),
    });

    console.log('Normalized billing webhook event:', normalizedEvent);

    return Response.json({
      received: true,
    });
  } catch (error) {
    console.error('Failed to verify demo webhook.', error);

    return jsonError(getErrorMessage(error, 'Failed to verify webhook.'), 500);
  }
}
