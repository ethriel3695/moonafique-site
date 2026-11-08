/** Friendly edition labels without changing stored edition or billing dates. */
export function editionMonth(month: string): string {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return month;
  return new Intl.DateTimeFormat("en-US", {
    month: "long", year: "numeric", timeZone: "UTC",
  }).format(new Date(`${month}-01T12:00:00Z`));
}

export function editionLabel(edition: { title: string; month: string }): string {
  const month = editionMonth(edition.month);
  // The automatic title already includes the month. Named editions keep their name.
  const parts = edition.title.split(/\s*·\s*/).filter(part =>
    part && part !== edition.month && part.toLowerCase() !== month.toLowerCase(),
  );
  const title = parts.join(" · ").trim();
  if (!title || /^Moonafique collections?$/i.test(title)) return `${month} collection`;
  return `${title} · ${month}`;
}
