import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { getOrganizerSummary, isValidOrganizerToken } from '@/lib/board';

type OrganizerPageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function OrganizerPage({ searchParams }: OrganizerPageProps) {
  const { token } = await searchParams;

  if (!isValidOrganizerToken(token ?? null)) {
    return (
      <main className="mx-auto flex min-h-svh max-w-3xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="w-full rounded-[2rem] border border-border/70 bg-card/90 p-8 shadow-lift">
          <div className="flex items-center gap-3 text-destructive">
            <ShieldAlert className="size-6" />
            <p className="text-sm font-semibold uppercase tracking-[0.22em]">Organizer access only</p>
          </div>
          <h1 className="mt-4 text-4xl">Missing or invalid organizer token.</h1>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            Open this page with the shared secret link. In local development the preview token is
            <span className="font-semibold text-foreground"> local-preview</span>.
          </p>
        </div>
      </main>
    );
  }

  const summary = await getOrganizerSummary();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <section className="rounded-[2.5rem] border border-border/70 bg-card/90 p-6 shadow-lift sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
              Organizer summary
            </p>
            <h1 className="mt-4 text-4xl sm:text-5xl">{summary.production.title}</h1>
            <p className="mt-3 max-w-3xl text-lg leading-8 text-muted-foreground">
              {summary.production.organizerSummary}
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-border/60 bg-surface/80 p-5 shadow-soft">
            <p className="text-sm text-muted-foreground">Live totals</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">
              {summary.totals.people} people across {summary.totals.claims} claims
            </p>
            <Link
              className="mt-4 inline-flex text-sm font-semibold text-primary underline-offset-4 hover:underline"
              href={`/api/organizer?token=${token}&format=csv`}
            >
              Download CSV
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-2">
        {summary.lanes.map((lane) => (
          <div key={lane.id} className="rounded-[2rem] border border-border/70 bg-card/90 p-5 shadow-soft">
            <div className="mb-5">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">
                {lane.title}
              </p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{lane.description}</p>
            </div>

            <div className="space-y-4">
              {lane.rows.map((row) => (
                <article key={row.id} className="rounded-[1.5rem] border border-border/70 bg-surface/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold">{row.title}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{row.summary}</p>
                    </div>
                    <p className="rounded-full bg-background px-3 py-1 text-sm font-semibold shadow-soft">
                      {row.claimedCount}/{row.capacity}
                    </p>
                  </div>

                  {row.claims.length === 0 ? (
                    <p className="mt-4 text-sm text-muted-foreground">No one has claimed this row yet.</p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {row.claims.map((claim) => (
                        <div key={claim.id} className="rounded-[1.25rem] bg-background/90 p-4 text-sm shadow-soft">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="font-semibold text-foreground">{claim.parentName}</p>
                            <p className="text-muted-foreground">{claim.quantity} claimed</p>
                          </div>
                          <p className="mt-2 text-muted-foreground">
                            {claim.phone}
                            {claim.email ? ` • ${claim.email}` : ''}
                          </p>
                          {claim.notes ? (
                            <p className="mt-2 rounded-xl bg-surface px-3 py-2 text-muted-foreground">
                              {claim.notes}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}