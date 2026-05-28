import Image, { type ImageProps } from 'next/image';

type LogoProps = Omit<ImageProps, 'alt' | 'height' | 'src' | 'width'> & {
  alt?: string;
};

export function Logo({ alt = '', priority = true, ...props }: LogoProps) {
  return (
    <Image
      src="/moonafique.svg"
      alt={alt}
      width={1024}
      height={1024}
      priority={priority}
      {...props}
    />
  );
}
