export default function RefundPolicyPage() {
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-16">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold tracking-tight">Refund Policy</h1>
        <p className="text-muted-foreground">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">1. Introduction</h2>
          <p className="text-muted-foreground">
            At Moonafique, we want you to be completely satisfied with your
            purchase. This Refund Policy outlines the terms and conditions for
            refunds and returns of our 3D printed products.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">2. Eligibility for Refunds</h2>
          <p className="text-muted-foreground">
            You may be eligible for a refund if:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>The product arrives damaged or defective</li>
            <li>The product is significantly different from its description</li>
            <li>You received the wrong product</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">3. Refund Process</h2>
          <div className="space-y-4">
            <h3 className="text-xl font-medium">Step 1: Contact Us</h3>
            <p className="text-muted-foreground">
              If you believe you are eligible for a refund, please contact our
              customer service team within 14 days of receiving your order.
              Include:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Your order number</li>
              <li>Reason for the refund request</li>
              <li>Photos of any damaged or defective items</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-medium">
              Step 2: Return Authorization
            </h3>
            <p className="text-muted-foreground">
              If your refund request is approved, we will provide you with a
              Return Authorization Number and instructions for returning the
              product.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-medium">Step 3: Return Shipping</h3>
            <p className="text-muted-foreground">
              For eligible refunds, we will provide a prepaid shipping label.
              Please ensure the product is securely packaged to prevent damage
              during return shipping.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">4. Refund Timeline</h2>
          <p className="text-muted-foreground">
            Once we receive your returned item:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Inspection: 2-3 business days</li>
            <li>Processing: 3-5 business days</li>
            <li>
              Refund issuance: 5-10 business days (depending on your payment
              method)
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">5. Non-Refundable Items</h2>
          <p className="text-muted-foreground">
            The following items are not eligible for refunds:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Custom or personalized orders</li>
            <li>Made-to-order items</li>
            <li>Items damaged due to improper handling</li>
            <li>Items returned without original packaging</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">6. Partial Refunds</h2>
          <p className="text-muted-foreground">
            In some cases, we may offer a partial refund if:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Only part of your order is eligible for a refund</li>
            <li>
              {`The item has minor defects that don't affect its functionality`}
            </li>
            <li>You wish to keep the item despite minor issues</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">7. Contact Us</h2>
          <p className="text-muted-foreground">
            If you have any questions about our refund policy, please contact us
            at:
          </p>
          <p className="text-muted-foreground">Email: support@moonafique.com</p>
        </section>
      </div>
    </div>
  );
}
