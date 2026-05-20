import { buildDemoCheckoutInput, getBillingProvider } from '@/lib/billing';
import {
  getErrorMessage,
  jsonError,
  readJsonObject,
  readRequiredString,
} from '@/lib/network';

export async function POST(request: Request): Promise<Response> {
  const body = await readJsonObject(request);
  const customerEmail = readRequiredString(body, 'customerEmail');

  if (!customerEmail) {
    return jsonError('customerEmail is required.', 400);
  }

  try {
    const billing = getBillingProvider();
    const checkout = await billing.createCheckout(
      buildDemoCheckoutInput({
        customerEmail,
        origin: new URL(request.url).origin,
      }),
    );

    return Response.json({
      id: checkout.id,
      url: checkout.url,
      provider: checkout.provider,
    });
  } catch (error) {
    console.error('Failed to create demo checkout.', error);

    return jsonError(getErrorMessage(error, 'Failed to create checkout.'), 500);
  }
}
