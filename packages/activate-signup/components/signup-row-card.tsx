import { ArrowUpRight, CalendarDays, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PublicBoardRow, SignupCategory } from '@/lib/schema';

const laneStyles: Record<
  SignupCategory,
  {
    shell: string;
    badge: string;
    count: string;
  }
> = {
  meals: {
    shell: 'border-rose-200/80 bg-rose-50/85',
    badge: 'bg-rose-100 text-rose-900',
    count: 'text-rose-900',
  },
  cleanup: {
    shell: 'border-amber-200/80 bg-amber-50/85',
    badge: 'bg-amber-100 text-amber-900',
    count: 'text-amber-900',
  },
  concessions: {
    shell: 'border-teal-200/80 bg-teal-50/85',
    badge: 'bg-teal-100 text-teal-900',
    count: 'text-teal-900',
  },
  donations: {
    shell: 'border-sky-200/80 bg-sky-50/85',
    badge: 'bg-sky-100 text-sky-900',
    count: 'text-sky-900',
  },
};

type SignupRowCardProps = {
  row: PublicBoardRow;
  onClaim: (row: PublicBoardRow) => void;
};

export function SignupRowCard({ row, onClaim }: SignupRowCardProps) {
  const style = laneStyles[row.category];

  return (
    <article
      className={cn(
        'rounded-[1.5rem] border p-5 shadow-soft transition-transform duration-200 hover:-translate-y-0.5',
        style.shell
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className={cn(
              'inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em]',
              style.badge
            )}
          >
            {row.type}
          </p>
          <h3 className="mt-3 text-xl font-semibold text-foreground">{row.title}</h3>
        </div>
        <div className={cn('text-right text-sm font-semibold', style.count)}>
          {row.claimedCount}/{row.capacity}
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-muted-foreground">{row.summary}</p>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
        {row.dateLabel ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-background/80 px-3 py-1">
            <CalendarDays className="size-3.5" />
            {row.dateLabel}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1 rounded-full bg-background/80 px-3 py-1">
          <Users className="size-3.5" />
          {row.remainingCount} {row.unitLabel} left
        </span>
      </div>

      {row.details.length > 0 ? (
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          {row.details.map((detail) => (
            <li key={detail} className="flex items-start gap-2">
              <span className="mt-1 size-2 rounded-full bg-foreground/30" />
              <span>{detail}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <Button
        className="mt-5 w-full justify-between"
        onClick={() => onClaim(row)}
        disabled={row.isFull}
        variant={row.isFull ? 'outline' : 'default'}
      >
        <span>{row.isFull ? 'Slots filled' : 'Sign up'}</span>
        {!row.isFull ? <ArrowUpRight className="size-4" /> : null}
      </Button>
    </article>
  );
}