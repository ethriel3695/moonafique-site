'use client';

import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2 } from 'lucide-react';

async function subscribeToNewsletter(email: string, website: string) {
  const response = await fetch('/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, website, consent: true }) }).catch(() => {
    throw new Error('We couldn’t reach the signup service. Check your connection and try again.');
  });
  if (!response.ok) throw new Error(response.status === 429
    ? 'Too many signup attempts. Please wait a little before trying again.'
    : response.status === 400
      ? 'Please check your email address and try again.'
      : 'We couldn’t start your signup. Please try again in a moment.');
}
export function EmailSignupForm({ subscribe = subscribeToNewsletter }: { subscribe?: (email: string, website: string) => Promise<void> }) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const id = useId();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return;
    const form = new FormData(e.currentTarget);
    setIsLoading(true);
    setError('');

    try {
      await subscribe(email, String(form.get('website') ?? ''));

      setSent(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Couldn’t subscribe. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) return <div role="status" className="mx-auto max-w-2xl rounded-2xl border border-primary-foreground/30 bg-background/10 p-6 text-center">
    <CheckCircle2 aria-hidden="true" className="mx-auto mb-3 size-7" />
    <p className="text-lg font-bold">One more step: check your inbox.</p>
    <p className="mt-3 text-sm leading-6">If this address still needs confirmation, you’ll receive a link to confirm your email. The link expires in 24 hours. Check your spam folder too.</p>
    <p className="mt-2 text-sm leading-6">Already confirmed? You’re all set.</p>
    <button type="button" className="mt-3 min-h-11 text-sm font-bold underline underline-offset-4" onClick={() => { setSent(false); setEmail(''); }}>Use a different email</button>
  </div>;

  return (
    <form
      onSubmit={handleSubmit}
      aria-describedby={`${id}-consent`}
      className="mx-auto w-full max-w-2xl rounded-[1.75rem] border border-primary-foreground/25 bg-background/10 p-5 sm:p-6"
    >
      <label htmlFor="newsletter-email" className="mb-2 block text-sm font-semibold">
        Email address
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
      <Input
        id="newsletter-email"
        type="email"
        maxLength={254}
        name="email"
        autoComplete="email"
        inputMode="email"
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        placeholder="Your email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="h-12 flex-1 border-primary-foreground/15 bg-background text-foreground shadow-none"
        required
      />
      <div hidden aria-hidden="true">
        <label>Leave this blank <input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <Button
        type="submit"
        variant="secondary"
        className="h-12 whitespace-nowrap"
        disabled={isLoading}
      >
        {isLoading ? 'Subscribing...' : 'Subscribe'}
      </Button>
      </div>
      <p id={`${id}-consent`} className="mt-4 text-sm leading-6">By subscribing, you agree to receive Moonafique’s show announcements, new work, and studio news. Confirm your email to join. Unsubscribe at any time.</p>
      {error && <p id={`${id}-error`} role="alert" className="mt-4 rounded-xl border border-primary-foreground/40 bg-background/10 p-3 text-sm font-semibold leading-6">{error}</p>}
    </form>
  );
}
