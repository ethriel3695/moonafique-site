import { Shippo } from 'shippo';

const shippo = new Shippo({ apiKeyHeader: process.env.SHIPPO_API_KEY! });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createShipment({ shippingAddress }: any) {
  // 2. Create shipment in Shippo
  const shipment = await shippo.shipments.create({
    addressFrom: {
      name: 'Moonafique',
      street1: '123 3D Print Street',
      city: 'Tech City',
      state: 'TC',
      country: 'US',
    },
    addressTo: {
      name: shippingAddress.name,
      street1: shippingAddress.address?.line1 ?? undefined,
      street2: shippingAddress.address?.line2 ?? undefined,
      city: shippingAddress.address?.city ?? undefined,
      state: shippingAddress.address?.state ?? undefined,
      country: shippingAddress.address?.country ?? 'US',
      zip: shippingAddress.address?.postal_code ?? undefined,
    },
    parcels: [
      {
        length: '10',
        width: '10',
        height: '10',
        distanceUnit: 'in',
        weight: '16',
        massUnit: 'oz',
      },
    ],
  });

  // 3. Buy the cheapest label
  const rates = shipment.rates;
  const cheapest = rates.sort((a, b) => Number(a.amount) - Number(b.amount))[0];
  const transaction = await shippo.transactions.create({
    rate: cheapest.objectId,
  });
  return {
    transactionId: transaction.objectId,
    labelUrl: transaction.labelUrl,
    trackingNumber: transaction.trackingNumber,
    invoicePdf: transaction.commercialInvoiceUrl,
  };
}
