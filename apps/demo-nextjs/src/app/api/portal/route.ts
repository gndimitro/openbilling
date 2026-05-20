import { getBillingProvider } from '@/lib/billing';
import {
  getErrorMessage,
  jsonError,
  readJsonObject,
  readRequiredString,
} from '@/lib/network';

export async function POST(request: Request): Promise<Response> {
  const body = await readJsonObject(request);
  const customerId = readRequiredString(body, 'customerId');

  if (!customerId) {
    return jsonError('customerId is required.', 400);
  }

  try {
    const billing = getBillingProvider();
    const portal = await billing.createPortalLink({
      customerId,
      returnUrl: `${new URL(request.url).origin}/pricing/demo`,
    });

    return Response.json({
      url: portal.url,
      provider: portal.provider,
    });
  } catch (error) {
    console.error('Failed to create demo portal link.', error);

    return jsonError(
      getErrorMessage(error, 'Failed to create portal link.'),
      500,
    );
  }
}
