"use client";

import { Button } from "@/components/ui";

type CsvValue = string | number | boolean | null | undefined;

export function CsvExportButton({
  filenamePrefix,
  rows,
  label,
}: {
  filenamePrefix: string;
  rows: Record<string, CsvValue>[];
  label: string;
}) {
  function handleDownload() {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((row) => headers.map((header) => quoteCsv(row[header])).join(",")),
    ].join("\r\n");
    const today = new Date().toISOString().slice(0, 10);
    downloadCsv(`${filenamePrefix}-export-${today}.csv`, csv);
  }

  return (
    <Button type="button" variant="secondary" onClick={handleDownload} disabled={!rows.length}>
      {label}
    </Button>
  );
}

function quoteCsv(value: CsvValue) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
