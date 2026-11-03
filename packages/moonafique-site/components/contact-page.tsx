import Link from "next/link";
import { ContactForm } from "@/components/contact-form";
import type { ContactSubmission } from "@/lib/contact";
export function ContactPageView({
  submitMessage,
}: {
  submitMessage?: (data: ContactSubmission) => Promise<void>;
}) {
  return (
    <div className="mx-auto grid max-w-screen-xl gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[0.8fr_1.2fr]">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">
          Contact Moonafique
        </p>
        <h1 className="mt-5 text-5xl leading-tight">
          What’s on
          <br />
          your mind?
        </h1>
        <p className="mt-6 max-w-md text-lg leading-8 text-muted-foreground">
          A question about a piece, help with an order, or something you’d like
          to know about the studio. Send us a message.
        </p>
        <a
          href="mailto:hello@moonafique.com"
          className="mt-5 inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4"
        >
          hello@moonafique.com
        </a>
        <div className="mt-8 max-w-md rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-xl">Have a custom project in mind?</h2>
          <p className="mt-3 leading-7 text-muted-foreground">
            Our custom request form gives you space for references, sizes,
            colors, and any date you have in mind.
          </p>
          <Link
            href="/customs"
            className="mt-4 inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4"
          >
            Request a custom creation
          </Link>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <ContactForm submitMessage={submitMessage} />
      </div>
    </div>
  );
}
