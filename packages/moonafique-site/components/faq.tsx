'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: 'What materials do you use for your 3D prints?',
    paragraphs: [
      'We use high-quality PLA and PETG filaments for our prints. These materials are chosen for clean detail, durable everyday handling, and a finish that suits collectible display pieces.',
      'Each material and color is matched to the specific design so articulated creatures, fossils, and classroom-friendly miniatures all feel intentional in the hand.',
    ],
  },
  {
    question: 'How long does shipping take?',
    paragraphs: ['Shipping windows depend on whether an item is ready to ship or printed to order.'],
    bullets: [
      'In-stock pieces typically ship within 1 to 2 business days.',
      'Standard shipping usually arrives within 3 to 5 business days.',
      'Express shipping generally arrives within 1 to 2 business days.',
    ],
  },
  {
    question: 'Do you offer custom designs?',
    paragraphs: [
      'Yes. We love collaborating on custom projects, whether you already have a creature in mind or need help shaping the idea into something printable and display-ready.',
      'The best starting point is the contact page, where you can share references, intended size, and how you want the finished piece to feel.',
    ],
  },
  {
    question: 'What is your return policy?',
    paragraphs: [
      'We accept returns within 14 days of delivery for items that are unused and in their original packaging.',
      'Custom orders and made-to-order pieces are not eligible for returns unless they arrive damaged or defective. Reach out as soon as possible so we can help.',
    ],
  },
  {
    question: 'How do I care for my 3D printed items?',
    paragraphs: [
      'To keep your piece looking its best, avoid direct sunlight for long periods, keep it away from high heat, and clean it gently with a soft dry cloth.',
    ],
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="w-full py-20">
      <div className="mx-auto max-w-screen-xl px-4">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.26em] text-primary">
            Frequently asked
          </p>
          <h2 className="mt-4 text-4xl sm:text-5xl">Questions before you adopt a new desk creature?</h2>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            Here are the details customers ask for most often, from materials
            and shipping to care and custom work.
          </p>
        </div>
        <div className="mx-auto mt-12 max-w-3xl space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-[1.5rem] border border-border/70 bg-background/90 shadow-soft"
            >
              <button
                className="flex w-full items-center justify-between gap-6 px-5 py-5 text-left transition-colors hover:bg-surface/80"
                onClick={() => toggleFAQ(index)}
              >
                <span className="text-lg font-semibold text-foreground">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openIndex === index && (
                <div className="border-t border-border/70 bg-surface/60 px-5 py-5">
                  <div className="space-y-4 text-base leading-7 text-muted-foreground">
                    {faq.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                    {faq.bullets && (
                      <ul className="list-disc space-y-2 pl-5 text-foreground/80 marker:text-primary">
                        {faq.bullets.map((bullet) => (
                          <li key={bullet}>{bullet}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
