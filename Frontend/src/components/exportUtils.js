export const EXPORT_COLUMNS = Object.freeze([
  { key: "customerId", label: "Customer ID" },
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "companyName", label: "Company" },
  { key: "jobTitle", label: "Job title" },
  { key: "address", label: "Address" },
  { key: "country", label: "Country" },
  { key: "state", label: "State" },
  { key: "city", label: "City" },
  { key: "status", label: "Account status" },
  { key: "leadStage", label: "Lead stage" },
  { key: "leadSource", label: "Lead source" },
  { key: "priority", label: "Priority" },
  { key: "notes", label: "Notes" },
  { key: "nextFollowUpDate", label: "Next follow-up" },
  { key: "createdAt", label: "Date added" },
]);

export function exportValue(value) {
  if (value === null || value === undefined || value === "") return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const date = typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) ? new Date(value) : null;
  if (date && !Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  return String(value);
}

export function safeSpreadsheetValue(value) {
  const text = exportValue(value);
  return /^[\s]*[=+@-]/.test(text) ? `'${text}` : text;
}

export function serializeCsv(records, columns) {
  const quote = (value) => `"${safeSpreadsheetValue(value).replaceAll('"', '""')}"`;
  const lines = [columns.map((column) => quote(column.label)).join(",")];
  for (const record of records) lines.push(columns.map((column) => quote(record[column.key])).join(","));
  return `\uFEFF${lines.join("\r\n")}`;
}
