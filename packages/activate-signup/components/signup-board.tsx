'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Download, ShieldCheck } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { SignupRowCard } from '@/components/signup-row-card';
import { SignupSheet } from '@/components/signup-sheet';
import type { PublicBoard, SignupCategory, SignupClaimInput } from '@/lib/schema';

const laneShells: Record<SignupCategory, string> = {
  meals: 'border-rose-200 bg-white/80',
  cleanup: 'border-amber-200 bg-white/80',
  concessions: 'border-teal-200 bg-white/80',
  donations: 'border-sky-200 bg-white/80',
};

type SignupBoardProps = {
  initialBoard: PublicBoard;
};

export function SignupBoard({ initialBoard }: SignupBoardProps) {
  const [board, setBoard] = useState(initialBoard);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SignupCategory>(board.lanes[0]?.id ?? 'meals');
  const { toast } = useToast();

  const selectedRow = useMemo(() => {
    for (const lane of board.lanes) {
      const row = lane.rows.find((item) => item.id === selectedRowId);
      if (row) {
        return row;
      }
    }

    return null;
  }, [board.lanes, selectedRowId]);

  const submitClaim = async (input: SignupClaimInput) => {
    const response = await fetch('/api/signups', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    const data = (await response.json()) as {
      error?: string;
      board?: PublicBoard;
    };

    if (data.board) {
      setBoard(data.board);
    }

    if (!response.ok) {
      throw new Error(data.error ?? 'Unable to save signup right now.');
    }

    toast({
      title: 'Signup saved',
      description: 'Your claim is live and the board totals are already updated.',
    });
    setSelectedRowId(null);
  };

  return (
    <main className="min-h-svh px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="mx-auto max-w-7xl">
        <section className="overflow-hidden rounded-[2.5rem] border border-border/60 bg-[linear-gradient(140deg,_hsl(var(--background))_0%,_hsl(var(--accent)/0.45)_54%,_hsl(var(--secondary)/0.75)_100%)] px-6 py-8 shadow-lift sm:px-8 lg:px-12 lg:py-12">
          <div className="grid gap-8 lg:grid-cols-[1.6fr_0.9fr] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.26em] text-primary">
                {board.production.seasonLabel}
              </p>
              <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl">
                {board.production.title} family signup board
              </h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
                {board.production.blurb}
              </p>
            </div>
            <div className="rounded-[2rem] border border-white/55 bg-white/72 p-5 backdrop-blur shadow-soft">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
                {board.production.venue}
              </p>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {board.production.coverageNote}
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-foreground">
                <span className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-1.5 font-semibold shadow-soft">
                  <CheckCircle2 className="size-4 text-success" />
                  Live capacity tracking
                </span>
                <a
                  className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-1.5 font-semibold shadow-soft"
                  href="/organizer?token=local-preview"
                >
                  <ShieldCheck className="size-4 text-info" />
                  Organizer summary
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 lg:hidden">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SignupCategory)}>
            <div className="sticky top-3 z-20 overflow-x-auto pb-2">
              <TabsList className="w-max min-w-full justify-start gap-1 rounded-full border border-border/60 bg-card/95 px-1 shadow-soft backdrop-blur">
                {board.lanes.map((lane) => (
                  <TabsTrigger key={lane.id} value={lane.id}>
                    {lane.shortTitle}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {board.lanes.map((lane) => (
              <TabsContent key={lane.id} value={lane.id}>
                <div className="space-y-4">
                  <div className={laneShells[lane.id] + ' rounded-[2rem] border p-5 shadow-soft'}>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">
                      {lane.title}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">{lane.description}</p>
                  </div>
                  {lane.rows.map((row) => (
                    <SignupRowCard key={row.id} row={row} onClaim={(item) => setSelectedRowId(item.id)} />
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </section>

        <section className="mt-8 hidden lg:block">
          <div className="grid gap-5 lg:grid-cols-4">
            {board.lanes.map((lane) => (
              <div
                key={lane.id}
                className={laneShells[lane.id] + ' rounded-[2rem] border p-5 shadow-soft'}
              >
                <div className="mb-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">
                    {lane.title}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{lane.description}</p>
                </div>
                <div className="space-y-4">
                  {lane.rows.map((row) => (
                    <SignupRowCard key={row.id} row={row} onClaim={(item) => setSelectedRowId(item.id)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 flex flex-col gap-4 rounded-[2rem] border border-border/70 bg-card/85 p-6 shadow-soft sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">
              Organizer output
            </p>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              {board.production.organizerSummary}
            </p>
          </div>
          <Button asChild variant="outline">
            <a href="/api/organizer?token=local-preview&format=csv">
              <Download className="size-4" />
              Download CSV
            </a>
          </Button>
        </section>
      </div>

      <SignupSheet
        key={selectedRow?.id ?? 'closed'}
        open={selectedRow !== null}
        row={selectedRow}
        onOpenChange={(open) => setSelectedRowId(open ? selectedRowId : null)}
        onSubmit={async (input) => {
          try {
            await submitClaim(input);
          } catch (error) {
            toast({
              title: 'Signup not saved',
              description:
                error instanceof Error ? error.message : 'Please try again.',
              variant: 'destructive',
            });
            throw error;
          }
        }}
      />
    </main>
  );
}