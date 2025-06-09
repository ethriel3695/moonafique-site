// Free-to-use placeholder images from Unsplash
const PLACEHOLDER_IMAGES = {
  dragon: ['/cinder-heart-dragon.jpg'],
  creature: [
    'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=800&auto=format&fit=crop&q=60',
    'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=800&auto=format&fit=crop&q=60',
  ],
  fossil: [
    'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=800&auto=format&fit=crop&q=60',
    'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=800&auto=format&fit=crop&q=60',
  ],
  misc: [
    'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=800&auto=format&fit=crop&q=60',
    'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=800&auto=format&fit=crop&q=60',
  ],
  default: ['/cinder-heart-dragon.jpg'],
};

export function getPlaceholderImages(category?: string): string[] {
  if (!category) return PLACEHOLDER_IMAGES.default;

  const normalizedCategory = category.toLowerCase();
  return (
    PLACEHOLDER_IMAGES[normalizedCategory as keyof typeof PLACEHOLDER_IMAGES] ||
    PLACEHOLDER_IMAGES.default
  );
}
