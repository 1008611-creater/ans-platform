// Escape every cell, including spreadsheet formula prefixes hidden behind whitespace.
export function agriCsvCell(value: unknown): string {
  let text = value == null ? "" : String(value);
  if (/^[\s\uFEFF]*[=+@-]/u.test(text) || /^[\t\r\n]/u.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function agriCsv(rows: unknown[][]): string {
  return "\uFEFF" + rows.map(row => row.map(agriCsvCell).join(",")).join("\r\n") + "\r\n";
}
