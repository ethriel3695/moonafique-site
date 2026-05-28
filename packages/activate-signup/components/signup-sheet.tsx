'use client';

import { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { PublicBoardRow, SignupClaimInput } from '@/lib/schema';

type SignupSheetProps = {
  row: PublicBoardRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: SignupClaimInput) => Promise<void>;
};

const initialFormState = {
  parentName: '',
  phone: '',
  email: '',
  quantity: '1',
  notes: '',
};

export function SignupSheet({
  row,
  open,
  onOpenChange,
  onSubmit,
}: SignupSheetProps) {
  const [formState, setFormState] = useState(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!row) {
    return null;
  }

  const maxQuantity = Math.max(row.remainingCount, 1);

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setFormState(initialFormState);
          setIsSubmitting(false);
        }

        onOpenChange(nextOpen);
      }}
    >
      <SheetContent className="max-h-[92svh] overflow-y-auto sm:max-w-xl" side="bottom">
        <SheetHeader>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
            Quick claim
          </p>
          <SheetTitle>{row.title}</SheetTitle>
          <SheetDescription>{row.summary}</SheetDescription>
        </SheetHeader>

        <div className="rounded-[1.5rem] border border-border/70 bg-surface/80 p-4 text-sm text-muted-foreground shadow-soft">
          <div className="flex flex-wrap gap-3 text-foreground">
            <span className="rounded-full bg-background px-3 py-1 font-semibold">
              {row.claimedCount}/{row.capacity} claimed
            </span>
            <span className="rounded-full bg-background px-3 py-1 font-semibold">
              {row.remainingCount} {row.unitLabel} left
            </span>
          </div>
          {row.noteHint ? <p className="mt-3">{row.noteHint}</p> : null}
        </div>

        <form
          className="mt-6 space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setIsSubmitting(true);

            try {
              await onSubmit({
                slotId: row.id,
                parentName: formState.parentName.trim(),
                phone: formState.phone.trim(),
                email: formState.email.trim(),
                quantity: Number(formState.quantity),
                notes: formState.notes.trim() || undefined,
              });
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="parentName">Parent name</Label>
              <Input
                id="parentName"
                value={formState.parentName}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    parentName: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                inputMode="tel"
                value={formState.phone}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    phone: event.target.value,
                  }))
                }
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <div className="space-y-2">
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                value={formState.email}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                max={maxQuantity}
                value={formState.quantity}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    quantity: event.target.value,
                  }))
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Anything the organizers should know?"
              value={formState.notes}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
            />
          </div>

          <SheetFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || row.isFull}>
              {isSubmitting ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  Saving claim...
                </>
              ) : row.isFull ? (
                'This row is full'
              ) : (
                'Save signup'
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}