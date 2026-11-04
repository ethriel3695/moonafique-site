import type { Metadata } from "next";
import { ConfirmEmailForm } from "@/components/confirm-email-form";

export const metadata: Metadata = {
  title: "Confirm your email | Moonafique",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function ConfirmEmailPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <h1 className="text-4xl">Confirm your email</h1>
      <p className="mt-4 leading-7">
        Confirm only if you asked Moonafique to email you. This won’t start a paid membership.
      </p>
      <ConfirmEmailForm />
    </main>
  );
}
