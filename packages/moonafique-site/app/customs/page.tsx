import Link from "next/link";
import { Sparkles, ArrowLeft } from "lucide-react";
import { CustomRequestForm } from "@/components/customs/request-form";

export const metadata = {
  title: "Request a custom creation | Moonafique",
  description: "Have an idea for a custom Moonafique creation? Share your request, details, and any date you have in mind.",
};

export default function CustomsPage() {
  return (
    <div className="bg-[#f8f5fb] text-[#30263b]">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:py-16">
        <Link href="/#showcase" className="mb-10 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#4c326d] hover:underline"><ArrowLeft className="size-4" aria-hidden="true" />Back to our creations</Link>
        {process.env.GRIM_MODE === "sandbox" && <p role="note" className="mb-8 rounded-xl bg-amber-100 p-4 text-sm text-amber-950">Test site — requests here go to a separate test queue.</p>}
        <div className="grid items-start gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <p className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#704a91]"><Sparkles className="size-4" aria-hidden="true" />Made at Moonafique</p>
            <h1 className="max-w-lg font-display text-4xl leading-tight sm:text-5xl">Your idea.<br />Our next creation?</h1>
            <p className="mt-6 max-w-md text-lg leading-8 text-[#665b70]">A keepsake, a character, something wonderfully unexpected. Tell us what you have in mind.</p>
            <div className="mt-9 max-w-md rounded-2xl border border-[#4c326d]/15 p-6">
              <h2 className="font-display text-xl">A request starts the conversation.</h2>
              <p className="mt-3 text-sm leading-7 text-[#665b70]">We work through custom requests in the order they’re received. We’ll review your idea and discuss what’s possible before agreeing on a project.</p>
              <p className="mt-3 text-sm leading-7 text-[#665b70]">Have a birthday or special occasion in mind? You can share the date for our information only. It does not move your request ahead in the queue or create a promise to complete or deliver an order by that date.</p>
            </div>
          </div>
          <CustomRequestForm />
        </div>
      </div>
    </div>
  );
}
