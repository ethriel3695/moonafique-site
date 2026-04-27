'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Quote, Star } from 'lucide-react';
// import { Textarea } from '@/components/ui/textarea';
// import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';

const testimonials = [
  {
    id: 1,
    name: 'Anonymous',
    role: 'Dino and Fossil Enthusiast',
    content:
      'I had to have the extra large Pteranodon. It kept calling to me from my booth!',
    rating: 5,
  },
  {
    id: 2,
    name: 'Anonymous',
    role: 'Teacher',
    content: 'I am excited for the micro prints. My students will love them!',
    rating: 5,
  },
];

export function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);
  //   const [showForm, setShowForm] = useState(false);
  //   const [rating, setRating] = useState(0);
  //   const [hoverRating, setHoverRating] = useState(0);
  //   const [formData, setFormData] = useState({
  //     name: '',
  //     role: '',
  //     content: '',
  //   });

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex(
      (prev) => (prev - 1 + testimonials.length) % testimonials.length
    );
  };

  //   const handleSubmit = (e: React.FormEvent) => {
  //     e.preventDefault();
  //     // TODO: Implement actual submission logic
  //     console.log('Submitting review:', { ...formData, rating });
  //     setShowForm(false);
  //     setRating(0);
  //     setFormData({ name: '', role: '', content: '' });
  //   };

  const currentTestimonial = testimonials[currentIndex];

  return (
    <section className="w-full py-20">
      <div className="mx-auto max-w-screen-xl px-4">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-end">
          <div className="space-y-5">
            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-primary">
              Testimonials
            </p>
            <h2 className="text-4xl sm:text-5xl">Collectors remember the details.</h2>
            <p className="max-w-xl text-lg leading-8 text-muted-foreground">
              The most consistent feedback is simple: Moonafique pieces feel
              thoughtful, tactile, and impossible to leave behind once someone
              picks one up.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-border/70 bg-background/80 p-5 shadow-soft">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Favorite quality
                </p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  Articulated motion with polished finish
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-border/70 bg-background/80 p-5 shadow-soft">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Common use
                </p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  Giftable desk pieces and classroom conversation starters
                </p>
              </div>
            </div>
          </div>
          <div className="relative rounded-[2rem] border border-border/70 bg-background/90 p-8 shadow-lift">
            <Quote className="absolute right-8 top-8 size-10 text-primary/25" />
            <div className="mb-5 flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-5 w-5 ${
                    i < currentTestimonial.rating
                      ? 'fill-warning text-warning'
                      : 'text-border'
                  }`}
                />
              ))}
            </div>
            <p className="min-h-[120px] text-xl leading-9 text-foreground">
              &ldquo;{currentTestimonial.content}&rdquo;
            </p>
            <div className="mt-8 flex flex-col gap-1">
              <p className="font-semibold text-foreground">{currentTestimonial.name}</p>
              <p className="text-sm text-muted-foreground">
                {currentTestimonial.role}
              </p>
            </div>
            <div className="mt-8 flex items-center justify-between gap-4 border-t border-border/70 pt-6">
              <p className="text-sm text-muted-foreground">
                {currentIndex + 1} of {testimonials.length}
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={prevTestimonial}
                  className="rounded-full"
                  aria-label="Previous testimonial"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={nextTestimonial}
                  className="rounded-full"
                  aria-label="Next testimonial"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Temporarily hidden until review functionality is implemented
        <div className="mt-16 text-center">
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : 'Write a Review'}
          </Button>
        </div>

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="mt-8 max-w-2xl mx-auto bg-background p-8 rounded-lg shadow-lg"
          >
            <div className="space-y-6">
              <div>
                <Label htmlFor="rating">Rating</Label>
                <div className="flex gap-1 mt-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-8 h-8 cursor-pointer ${
                        i < (hoverRating || rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                      onClick={() => setRating(i + 1)}
                      onMouseEnter={() => setHoverRating(i + 1)}
                      onMouseLeave={() => setHoverRating(0)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="role">Role (e.g., Collector, Enthusiast)</Label>
                <Input
                  id="role"
                  value={formData.role}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="content">Your Review</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  required
                  className="min-h-[100px]"
                />
              </div>

              <Button type="submit" className="w-full">
                Submit Review
              </Button>
            </div>
          </form>
        )}
        */}
      </div>
    </section>
  );
}
