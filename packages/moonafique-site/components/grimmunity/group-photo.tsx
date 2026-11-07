import Image from "next/image";

// Frame the lower square of the original portrait photograph. This removes the
// empty background without changing the characters or the source image.
export function GrimGroupPhoto({ sizes = "(min-width: 768px) 420px, 85vw" }: { sizes?: string }) {
  return <div className="relative mx-auto aspect-square w-full max-w-[420px] overflow-hidden rounded-2xl bg-black">
    <Image src="/showcase/grim-of-the-month-august-september-october.jpg" alt="Three painted Moonafique Grims with their matching pets." width={664} height={1182} sizes={sizes} className="absolute bottom-0 left-0 h-auto w-full max-w-none" />
  </div>;
}
