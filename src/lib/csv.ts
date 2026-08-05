function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

// Written as a code point rather than a string-literal escape to avoid an invisible character
// sitting in the source file.
const UTF8_BOM = String.fromCharCode(0xfeff);

export function toCsv<T extends Record<string, string | number>>(
  rows: T[],
  columns: { key: keyof T; header: string }[],
): string {
  const headerLine = columns.map((c) => escapeCsvCell(c.header)).join(",");
  const lines = rows.map((row) => columns.map((c) => escapeCsvCell(row[c.key])).join(","));
  // Leading UTF-8 BOM: without it, Excel assumes the system codepage (never UTF-8) when opening a
  // .csv directly, so any non-ASCII text (Arabic names, etc.) renders as garbled characters.
  return UTF8_BOM + [headerLine, ...lines].join("\r\n");
}
