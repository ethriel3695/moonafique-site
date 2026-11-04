// Public package measurements, shared by shipping and presentation examples.
// Return addresses and credentials belong in the server-only shipping module.
// Quote the high end of the owner-confirmed 8–10 oz packed range.
export const grimmParcel = {
  length: 6,
  width: 6,
  height: 6,
  weight: 10,
} as const;
// Quote the high end of the owner-confirmed 3–6 oz range.
export const aceoParcel = {
  length: 7,
  width: 5,
  height: 1,
  weight: 6,
} as const;
