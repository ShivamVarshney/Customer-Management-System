const assert = require("node:assert/strict");
const path = require("node:path");
const { createRequire } = require("node:module");
const { before, test } = require("node:test");
const frontendRequire = createRequire(path.resolve(__dirname, "../../Frontend/package.json"));

let themePreferences;
let exportUtils;
before(async () => {
  themePreferences = await import("../../Frontend/src/components/themePreferences.js");
  exportUtils = await import("../../Frontend/src/components/exportUtils.js");
});

test("theme preferences accept the supported modes and seven accents and fall back safely", () => {
  const { ACCENTS, THEME_DEFAULTS, normalizePreferences, resolveTheme } = themePreferences;
  assert.deepEqual(THEME_DEFAULTS, { mode: "system", accent: "indigo" });
  assert.deepEqual(ACCENTS.map(({ id }) => id), ["indigo", "blue", "teal", "emerald", "violet", "rose", "amber"]);
  assert.deepEqual(normalizePreferences({ mode: "dark", accent: "rose", ignored: true }), { mode: "dark", accent: "rose" });
  assert.deepEqual(normalizePreferences({ mode: "auto", accent: "neon" }), THEME_DEFAULTS);
  assert.equal(resolveTheme("system", true), "dark");
  assert.equal(resolveTheme("system", false), "light");
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("dark", false), "dark");
});

test("theme preferences persist and restore from browser-like storage", () => {
  const storage = {
    values: new Map(),
    getItem(key) { return this.values.get(key) ?? null; },
    setItem(key, value) { this.values.set(key, value); },
  };
  const { THEME_DEFAULTS, THEME_STORAGE_KEY, readStoredPreferences, writeStoredPreferences } = themePreferences;
  assert.equal(writeStoredPreferences({ mode: "dark", accent: "teal" }, storage), true);
  assert.deepEqual(readStoredPreferences(storage), { mode: "dark", accent: "teal" });
  storage.values.set(THEME_STORAGE_KEY, "not-json");
  assert.deepEqual(readStoredPreferences(storage), THEME_DEFAULTS);
  assert.equal(writeStoredPreferences({ mode: "dark" }, null), false);
});

test("CSV exports quote values and neutralize spreadsheet formulas", () => {
  const { EXPORT_COLUMNS, serializeCsv } = exportUtils;
  const columns = EXPORT_COLUMNS.filter(({ key }) => ["name", "email", "notes"].includes(key));
  const csv = serializeCsv([{ name: '=HYPERLINK("https://bad.test")', email: "a,b@example.test", notes: "He said \"hello\"" }], columns);
  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.match(csv, /"Name","Email","Notes"/);
  assert.match(csv, /"'=HYPERLINK\(""https:\/\/bad\.test""\)"/);
  assert.match(csv, /"a,b@example\.test"/);
  assert.match(csv, /"He said ""hello"""/);
});

test("XLSX and PDF export generators produce downloadable files", async () => {
  const { createCustomerExport } = await import("../../Frontend/src/components/customerExport.js");
  const { EXPORT_COLUMNS } = exportUtils;
  const columns = EXPORT_COLUMNS.filter(({ key }) => ["name", "email", "status"].includes(key));
  const records = [{ name: "Avery Example", email: "avery@example.test", status: "Active" }];
  const xlsx = await createCustomerExport("xlsx", records, columns);
  const xlsxBytes = new Uint8Array(await xlsx.blob.arrayBuffer());
  assert.equal(xlsx.mimeType, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  assert.deepEqual([...xlsxBytes.slice(0, 2)], [0x50, 0x4b]);
  const xlsxArchive = await frontendRequire("jszip").loadAsync(xlsx.blob);
  const worksheet = await xlsxArchive.file("xl/worksheets/sheet1.xml").async("string");
  assert.match(worksheet, /Avery Example/);
  assert.match(worksheet, /autoFilter/);

  const pdf = await createCustomerExport("pdf", records, columns);
  const pdfText = new TextDecoder().decode(await pdf.blob.arrayBuffer());
  assert.equal(pdf.mimeType, "application/pdf");
  assert.match(pdfText, /^%PDF-/);
});
