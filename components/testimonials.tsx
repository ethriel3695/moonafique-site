'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
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
    <section className="w-full bg-muted/50 py-16">
      <div className="mx-auto max-w-screen-xl px-4">
        <h2 className="text-3xl font-bold text-center mb-12">
          What Our Customers Say
        </h2>
        <div className="relative">
          <div className="bg-background rounded-lg p-8 shadow-lg">
            <div className="flex items-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${
                    i < currentTestimonial.rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <p className="text-lg italic mb-6">
              &ldquo;{currentTestimonial.content}&rdquo;
            </p>
            <div className="flex flex-col items-center">
              <p className="font-semibold">{currentTestimonial.name}</p>
              <p className="text-muted-foreground text-sm">
                {currentTestimonial.role}
              </p>
            </div>
          </div>
          <div className="flex justify-center gap-4 mt-8">
            <Button
              variant="outline"
              size="icon"
              onClick={prevTestimonial}
              className="rounded-full"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={nextTestimonial}
              className="rounded-full"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
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
