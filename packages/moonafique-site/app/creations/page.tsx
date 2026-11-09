import { GrimmWorldsCollection } from "@/components/grimmunity/grimm-worlds";
import Link from "next/link";
import { CreationsShowcase } from "@/components/creations-showcase";
export const metadata = {
  title: "The creations showcase | Moonafique",
  description:
    "Explore finished Moonafique projects, Print Wars creations, and custom work.",
};
export default function CreationsPage() {
  return (
    <div className="pb-16">
      <div className="mx-auto max-w-screen-xl px-5 pt-10 sm:px-8">
        <Link
          href="/#showcase"
          className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4"
        >
          Back to selected work
        </Link>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
          A look through our finished work. These are showcase pieces; their
          appearance here does not indicate shop availability.
        </p>
      </div>
      <CreationsShowcase headingLevel={1} />
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8"><GrimmWorldsCollection /></div>
    </div>
  );
}
