import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tight mb-8">Contact Us</h1>
        <p className="text-muted-foreground mb-8">
          Have a question or want to discuss a custom project? Fill out the form
          below and we&apos;ll get back to you as soon as possible.
        </p>

        <form className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Your name"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="your@email.com"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              name="subject"
              type="text"
              required
              placeholder="What's this about?"
            />
          </div>

          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              name="message"
              required
              placeholder="Your message..."
              className="min-h-[200px]"
            />
          </div>

          <Button type="submit" className="w-full">
            Send Message
          </Button>
        </form>

        <div className="mt-16 space-y-4">
          <h2 className="text-2xl font-semibold">Other Ways to Reach Us</h2>
          <div className="space-y-2">
            <p className="text-muted-foreground">
              <span className="font-medium">Email:</span> hello@moonafique.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
