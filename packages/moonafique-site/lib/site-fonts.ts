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
