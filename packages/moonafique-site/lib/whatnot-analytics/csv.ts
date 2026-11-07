// Bounded RFC 4180 reader. Reports may contain commas/newlines inside quoted titles.
export function parseCsv(source: string, requiredHeaders: readonly string[] = [], headerStyle: "report" | "notion" = "report"): Record<string, string>[] {
  if (Buffer.byteLength(source, "utf8") > 25_000_000) throw Error("report_too_large");
  const text = source.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [], value = "", quoted = false, closed = false;
  const field = () => { row.push(value); value = ""; closed = false; if (row.length > 100) throw Error("invalid_csv"); };
  const line = () => { field(); if (row.some(value => value !== "")) rows.push(row); row = []; if (rows.length > 100_001) throw Error("report_too_large"); };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { value += '"'; i++; } else { quoted = false; closed = true; } }
      else value += c;
    } else if (c === ',') field();
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; line(); }
    else if (c === '"' && !value && !closed) quoted = true;
    else { if (closed || c === '"') throw Error("invalid_csv"); value += c; }
    if (value.length > 100_000) throw Error("invalid_csv");
  }
  if (quoted) throw Error("invalid_csv");
  if (value || row.length || closed) line();
  const headers = rows.shift();
  if (!headers?.length || new Set(headers).size !== headers.length || headers.some(h => headerStyle === "report" ? !/^[a-z][a-z0-9_]*$/.test(h) : !h.trim() || h.length > 150 || /[\r\n\x00-\x1f]/.test(h))) throw Error("invalid_csv_headers");
  if (requiredHeaders.some(header => !headers.includes(header))) throw Error("missing_report_columns");
  return rows.map(values => {
    if (values.length !== headers.length) throw Error("invalid_csv_columns");
    return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
  });
}

// Neutralize spreadsheet formulas in untrusted text without changing signed
// numeric amounts. Every cell is quoted, including embedded newlines/commas.
export function exportCsv(headers: readonly string[], rows: Record<string, unknown>[]) {
  const cell = (value: unknown) => {
    let text = value == null ? "" : String(value);
    if (typeof value !== "number" && /^[\s]*[=+\-@\t\r\n]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  return "\uFEFF" + [headers.map(cell).join(","), ...rows.map(row => headers.map(header => cell(row[header])).join(","))].join("\r\n") + "\r\n";
}
