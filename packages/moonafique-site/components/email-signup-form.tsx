'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';

export function EmailSignupForm() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      toast({
        title: 'Success!',
        description: 'Thank you for subscribing to our newsletter.',
      });
      setEmail('');
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to subscribe',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-2xl flex-col gap-4 rounded-[1.75rem] border border-primary-foreground/20 bg-background/14 p-4 backdrop-blur sm:flex-row sm:items-center"
    >
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <Input
        id="newsletter-email"
        type="email"
        placeholder="Enter your email for new releases and market drops"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="h-12 flex-1 border-primary-foreground/15 bg-background text-foreground shadow-none"
        required
      />
      <Button
        type="submit"
        variant="secondary"
        className="h-12 whitespace-nowrap"
        disabled={isLoading}
      >
        {isLoading ? 'Subscribing...' : 'Subscribe'}
      </Button>
    </form>
  );
}
