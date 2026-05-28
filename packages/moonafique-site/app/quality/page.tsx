export default function QualityPolicyPage() {
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-16">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold tracking-tight">Quality Policy</h1>
        <p className="text-muted-foreground">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">1. Introduction</h2>
          <p className="text-muted-foreground">
            At Moonafique, quality is at the heart of everything we do. This
            Quality Policy outlines our commitment to excellence in 3D printing
            and our dedication to delivering superior products to our customers.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">2. Quality Standards</h2>
          <p className="text-muted-foreground">
            We adhere to the following quality standards:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>ISO 9001:2015 Quality Management System</li>
            <li>Industry-standard 3D printing specifications</li>
            <li>Material safety and compliance standards</li>
            <li>Environmental sustainability guidelines</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">3. Quality Control Process</h2>
          <div className="space-y-4">
            <h3 className="text-xl font-medium">Pre-Production</h3>
            <p className="text-muted-foreground">Before production begins:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Material quality verification</li>
              <li>3D model integrity checks</li>
              <li>Print parameter optimization</li>
              <li>Support structure validation</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-medium">During Production</h3>
            <p className="text-muted-foreground">
              During the printing process:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Continuous print monitoring</li>
              <li>Temperature and humidity control</li>
              <li>Layer adhesion verification</li>
              <li>Real-time quality checks</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-medium">Post-Production</h3>
            <p className="text-muted-foreground">After printing is complete:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Dimensional accuracy verification</li>
              <li>Surface finish inspection</li>
              <li>Structural integrity testing</li>
              <li>Final quality assessment</li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">4. Material Quality</h2>
          <p className="text-muted-foreground">
            We ensure material quality through:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Supplier quality audits</li>
            <li>Material certification verification</li>
            <li>Regular material testing</li>
            <li>Proper storage and handling procedures</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">5. Continuous Improvement</h2>
          <p className="text-muted-foreground">
            We are committed to continuous improvement through:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Regular process reviews</li>
            <li>Customer feedback analysis</li>
            <li>Technology upgrades</li>
            <li>Staff training and development</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">6. Quality Assurance Team</h2>
          <p className="text-muted-foreground">
            Our dedicated quality assurance team:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Conducts regular quality audits</li>
            <li>Maintains quality documentation</li>
            <li>Investigates quality issues</li>
            <li>Implements corrective actions</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">7. Contact Us</h2>
          <p className="text-muted-foreground">
            If you have any questions about our quality policy or would like to
            report a quality concern, please contact us at:
          </p>
          <p className="text-muted-foreground">Email: quality@moonafique.com</p>
        </section>
      </div>
    </div>
  );
}
