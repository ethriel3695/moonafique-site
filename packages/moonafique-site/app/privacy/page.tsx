export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-16">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="text-muted-foreground">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Introduction</h2>
          <p className="text-muted-foreground">
            At Moonafique, we take your privacy seriously. This Privacy Policy
            explains how we collect, use, disclose, and safeguard your
            information when you visit our website or make a purchase. Please
            read this privacy policy carefully. If you do not agree with the
            terms of this privacy policy, please do not access the site.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Information We Collect</h2>
          <div className="space-y-4">
            <h3 className="text-xl font-medium">Personal Information</h3>
            <p className="text-muted-foreground">
              We collect personal information that you voluntarily provide to us
              when you:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Register for an account</li>
              <li>Make a purchase</li>
              <li>Subscribe to our newsletter</li>
              <li>Contact us through our website</li>
            </ul>
            <p className="text-muted-foreground">
              The personal information we collect may include your name, email
              address, shipping address, and payment information.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-medium">
              Automatically Collected Information
            </h3>
            <p className="text-muted-foreground">
              When you visit our website, we automatically collect certain
              information about your device, including:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>IP address</li>
              <li>Browser type</li>
              <li>Operating system</li>
              <li>Access times</li>
              <li>Pages viewed</li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">
            How We Use Your Information
          </h2>
          <p className="text-muted-foreground">
            We use the information we collect to:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Process your transactions</li>
            <li>Send you order confirmations and updates</li>
            <li>Respond to your customer service requests</li>
            <li>Send you marketing communications (with your consent)</li>
            <li>Improve our website and services</li>
            <li>Prevent fraudulent transactions</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Information Sharing</h2>
          <p className="text-muted-foreground">
            We do not sell or rent your personal information to third parties.
            We may share your information with:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Service providers who assist in our operations</li>
            <li>Payment processors to complete your transactions</li>
            <li>Shipping carriers to deliver your orders</li>
            <li>Law enforcement when required by law</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Data Security</h2>
          <p className="text-muted-foreground">
            We implement appropriate security measures to protect your personal
            information. However, no method of transmission over the Internet is
            100% secure, and we cannot guarantee absolute security.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Your Rights</h2>
          <p className="text-muted-foreground">You have the right to:</p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Access your personal information</li>
            <li>Correct inaccurate information</li>
            <li>Request deletion of your information</li>
            <li>Opt-out of marketing communications</li>
            <li>Object to processing of your information</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Contact Us</h2>
          <p className="text-muted-foreground">
            If you have any questions about this Privacy Policy, please contact
            us at:
          </p>
          <p className="text-muted-foreground">
            Email: security@moonafique.com
          </p>
        </section>
      </div>
    </div>
  );
}
