export default function CookiePolicyPage() {
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-16">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold tracking-tight">Cookie Policy</h1>
        <p className="text-muted-foreground">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">1. Introduction</h2>
          <p className="text-muted-foreground">
            {`This Cookie Policy explains how Moonafique LLC ("we", "us", "our")
            uses cookies and similar technologies to recognize you when you
            visit our website. It explains what these technologies are and why
            we use them, as well as your rights to control our use of them.`}
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">2. What are cookies?</h2>
          <p className="text-muted-foreground">
            {`Cookies are small data files that are placed on your computer or
            mobile device when you visit a website. Cookies are widely used by
            website owners to make their websites work, or to work more
            efficiently, as well as to provide reporting information.`}
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">3. Why do we use cookies?</h2>
          <p className="text-muted-foreground">
            {`We use cookies for several reasons:`}
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>
              Essential cookies: Required for the website to function properly
            </li>
            <li>
              Performance cookies: Help us understand how visitors interact with
              our website
            </li>
            <li>
              Functionality cookies: Remember your preferences and settings
            </li>
            <li>Analytics cookies: Help us improve our website and services</li>
            <li>Marketing cookies: Used to track visitors across websites</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">4. Types of cookies we use</h2>
          <div className="space-y-4">
            <h3 className="text-xl font-medium">Essential Cookies</h3>
            <p className="text-muted-foreground">
              These cookies are strictly necessary to provide you with services
              available through our website and to use some of its features,
              such as access to secure areas.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-medium">Performance Cookies</h3>
            <p className="text-muted-foreground">
              These cookies are used to enhance the performance and
              functionality of our website but are non-essential to their use.
              However, without these cookies, certain functionality may become
              unavailable.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-medium">Analytics Cookies</h3>
            <p className="text-muted-foreground">
              These cookies help us understand how visitors interact with our
              website by collecting and reporting information anonymously.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">5. How to control cookies</h2>
          <p className="text-muted-foreground">
            You can control and/or delete cookies as you wish. You can delete
            all cookies that are already on your computer and you can set most
            browsers to prevent them from being placed. If you do this, however,
            you may have to manually adjust some preferences every time you
            visit a site and some services and functionalities may not work.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">6. Third-party cookies</h2>
          <p className="text-muted-foreground">
            In some special cases, we also use cookies provided by trusted third
            parties. The following section details which third party cookies you
            might encounter through this site:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>
              Google Analytics: Used to understand how you use our website
            </li>
            <li>Payment processors: Used to process your payments securely</li>
            <li>
              Social media platforms: Used to enable social sharing
              functionality
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">7. Updates to this policy</h2>
          <p className="text-muted-foreground">
            We may update this Cookie Policy from time to time in order to
            reflect changes to the cookies we use or for other operational,
            legal, or regulatory reasons. Please therefore revisit this Cookie
            Policy regularly to stay informed about our use of cookies and
            related technologies.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">8. Contact us</h2>
          <p className="text-muted-foreground">
            If you have any questions about our use of cookies, please contact
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
