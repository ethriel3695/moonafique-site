export default function ShippingPolicyPage() {
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-16">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold tracking-tight">Shipping Policy</h1>
        <p className="text-muted-foreground">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">1. Introduction</h2>
          <p className="text-muted-foreground">
            At Moonafique, we strive to deliver your 3D printed products safely
            and efficiently. This Shipping Policy outlines our shipping methods,
            timelines, and costs.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">2. Shipping Methods</h2>
          <div className="space-y-4">
            <h3 className="text-xl font-medium">Standard Shipping</h3>
            <p className="text-muted-foreground">
              Our standard shipping option includes:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Delivery within 5-7 business days</li>
              <li>Package tracking</li>
              <li>Insurance coverage up to $100</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-medium">Express Shipping</h3>
            <p className="text-muted-foreground">
              For faster delivery, we offer express shipping:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Delivery within 2-3 business days</li>
              <li>Priority package tracking</li>
              <li>Insurance coverage up to $200</li>
              <li>Signature required for delivery</li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">3. Shipping Costs</h2>
          <p className="text-muted-foreground">
            Shipping costs are calculated based on:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Package weight and dimensions</li>
            <li>Shipping destination</li>
            <li>Selected shipping method</li>
            <li>Order value (free shipping for orders over $100)</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">4. Processing Time</h2>
          <p className="text-muted-foreground">
            Most orders are processed within (Delays may occur):
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>In-stock items: 1-2 business days</li>
            <li>Made-to-order items: 3-5 business days</li>
            <li>Custom items: 5-7 business days</li>
          </ul>
          <p className="text-muted-foreground">
            Processing time begins after payment confirmation and does not
            include shipping time.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">5. International Shipping</h2>
          <p className="text-muted-foreground">
            We ship to most countries worldwide. International orders:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>May be subject to customs fees and import taxes</li>
            <li>Typically take 7-14 business days for delivery</li>
            <li>Require additional documentation</li>
            <li>May have restricted items based on destination</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">6. Order Tracking</h2>
          <p className="text-muted-foreground">
            Once your order is shipped, you will receive:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>A confirmation email with tracking number</li>
            <li>Regular updates on your package status</li>
            <li>Estimated delivery date</li>
            <li>Instructions for tracking your package</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">7. Contact Us</h2>
          <p className="text-muted-foreground">
            If you have any questions about our shipping policy, please contact
            us at:
          </p>
          <p className="text-muted-foreground">
            Email: shipping@moonafique.com
          </p>
        </section>
      </div>
    </div>
  );
}
