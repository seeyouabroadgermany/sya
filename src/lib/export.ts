"use client";

// Downloads rows as Excel or CSV. SheetJS is loaded only when someone exports.
export async function downloadRows(rows: Record<string, string | number | null>[], baseName: string, format: "xlsx" | "csv") {
  const XLSX = await import("xlsx");
  const sheet = XLSX.utils.json_to_sheet(rows);
  const keys = Object.keys(rows[0] ?? {});
  sheet["!cols"] = keys.map((k) => ({
    wch: Math.min(40, Math.max(k.length, ...rows.map((r) => String(r[k] ?? "").length)) + 2),
  }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Export");
  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(book, `${baseName}-${stamp}.${format}`, { bookType: format, compression: true });
}
