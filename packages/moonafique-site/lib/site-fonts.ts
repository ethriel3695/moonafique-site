import localFont from "next/font/local";
export const manrope = localFont({
  src: "../public/fonts/manrope-latin.woff2",
  variable: "--font-sans",
  weight: "200 800",
  style: "normal",
  display: "swap",
  fallback: ["Arial"],
});
export const lora = localFont({
  src: "../public/fonts/lora-latin.woff2",
  variable: "--font-display",
  weight: "400 700",
  style: "normal",
  display: "swap",
  fallback: ["Georgia"],
});

// Self-hosted script lettering for the brand wordmark only.
export const playball = localFont({
  src: "../public/fonts/playball-regular.ttf",
  weight: "400",
  style: "normal",
  display: "swap",
  fallback: ["Georgia"],
});
