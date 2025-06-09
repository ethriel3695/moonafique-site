export default function TermsOfServicePage() {
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-16">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
        <p className="text-muted-foreground">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">1. Introduction</h2>
          <p className="text-muted-foreground">
            Welcome to Moonafique. By accessing our website and using our
            services, you agree to be bound by these Terms of Service. Please
            read them carefully before using our services.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">2. Definitions</h2>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>{`"Website" refers to moonafique.com and all its subdomains`}</li>
            <li>
              {`"Services" refers to all products and services offered by
              Moonafique`}
            </li>
            <li>
              {`"User", "you", and "your" refer to the individual accessing our
              website`}
            </li>
            <li>{`"We", "us", and "our" refer to Moonafique LLC`}</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">3. Account Registration</h2>
          <p className="text-muted-foreground">
            To access certain features of our website, you may be required to
            register for an account. You agree to:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Provide accurate and complete information</li>
            <li>Maintain the security of your account credentials</li>
            <li>Notify us immediately of any unauthorized access</li>
            <li>Accept responsibility for all activities under your account</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">4. Product Information</h2>
          <p className="text-muted-foreground">
            We strive to provide accurate product information, including:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Product descriptions</li>
            <li>Pricing information</li>
            <li>Availability status</li>
            <li>Shipping details</li>
          </ul>
          <p className="text-muted-foreground">
            However, we cannot guarantee that all information is completely
            accurate or up-to-date at all times.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">5. Orders and Payments</h2>
          <p className="text-muted-foreground">
            By placing an order, you agree to:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Provide accurate payment information</li>
            <li>Pay all charges incurred by your account</li>
            <li>Comply with all applicable laws and regulations</li>
            <li>Accept our shipping and return policies</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">6. Intellectual Property</h2>
          <p className="text-muted-foreground">
            All content on our website, including but not limited to:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Text</li>
            <li>Graphics</li>
            <li>Logos</li>
            <li>Images</li>
            <li>Product designs</li>
          </ul>
          <p className="text-muted-foreground">
            is the property of Moonafique LLC and is protected by intellectual
            property laws.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">7. Limitation of Liability</h2>
          <p className="text-muted-foreground">
            Moonafique LLC shall not be liable for any indirect, incidental,
            special, consequential, or punitive damages resulting from:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Your use or inability to use our services</li>
            <li>Any unauthorized access to your account</li>
            <li>Any interruption or cessation of our services</li>
            <li>Any errors or omissions in our content</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">8. Changes to Terms</h2>
          <p className="text-muted-foreground">
            We reserve the right to modify these terms at any time. We will
            notify users of any material changes by posting the new terms on our
            website. Your continued use of our services after such changes
            constitutes your acceptance of the new terms.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">9. Contact Information</h2>
          <p className="text-muted-foreground">
            If you have any questions about these Terms of Service, please
            contact us at:
          </p>
          <p className="text-muted-foreground">
            Email: security@moonafique.com
          </p>
        </section>
      </div>
    </div>
  );
}
