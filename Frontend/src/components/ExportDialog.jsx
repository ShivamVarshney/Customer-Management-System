import { useEffect, useState } from "react";
import { Download, FileSpreadsheet, FileText, Mail, Share2, X } from "lucide-react";
import { toast } from "sonner";
import api from "../api";
import { createCustomerExport, createExportFilename, downloadExport } from "./customerExport";
import { EXPORT_COLUMNS } from "./exportUtils";

const defaultColumns = ["name", "email", "phone", "companyName", "status", "leadStage", "createdAt"];

export default function ExportDialog({ open, onClose, search, status, leadStage, selectedIds }) {
  const [scope, setScope] = useState(selectedIds.length ? "selected" : "all");
  const [format, setFormat] = useState("xlsx");
  const [columns, setColumns] = useState(defaultColumns);
  const [recordCount, setRecordCount] = useState(0);
  const [countLoading, setCountLoading] = useState(false);
  const [countError, setCountError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const columnChoices = EXPORT_COLUMNS;
  const selectedColumns = columnChoices.filter((column) => columns.includes(column.key));
  const filters = { search, status, leadStage };
  const selectedKey = selectedIds.join(",");

  useEffect(() => {
    if (!open) return undefined;
    if (scope === "selected" && !selectedKey) {
      setRecordCount(0);
      setCountError("Select at least one customer in the directory first.");
      setCountLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    setCountLoading(true);
    setCountError("");
    api.post("/customers/export", { scope, filters: { search, status, leadStage }, selectedIds: selectedKey ? selectedKey.split(",") : [], countOnly: true }, { signal: controller.signal })
      .then((response) => setRecordCount(Number(response.data.recordCount) || 0))
      .catch((error) => {
        if (!controller.signal.aborted) setCountError(error.response?.data?.message || "Unable to count matching customers.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setCountLoading(false);
      });
    return () => controller.abort();
  }, [open, scope, search, status, leadStage, selectedKey]);

  const toggleColumn = (key) => {
    setColumns((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  };

  const createFile = async (share) => {
    if (!selectedColumns.length) {
      toast.error("Choose at least one column to export.");
      return;
    }
    if (scope === "selected" && selectedIds.length === 0) {
      toast.error("Select at least one customer first.");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await api.post("/customers/export", { scope, filters, selectedIds, columns: selectedColumns.map((column) => column.key) });
      const records = Array.isArray(response.data.customers) ? response.data.customers : [];
      const actualCount = Number(response.data.recordCount) || 0;
      const { blob, mimeType } = await createCustomerExport(format, records, selectedColumns);
      const filename = createExportFilename(format);

      if (share) {
        const file = new File([blob], filename, { type: mimeType });
        const shareFiles = typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
        if (typeof navigator.share === "function" && shareFiles) {
          try {
            await navigator.share({ title: "CustomerHub customer report", text: `${actualCount} customer records`, files: [file] });
            toast.success("Report shared successfully.");
            return;
          } catch (error) {
            if (error.name === "AbortError") return;
          }
        }
        downloadExport(blob, filename);
        toast.info("The report was downloaded. Attach the file manually to share it; email sending is not configured.");
        return;
      }

      downloadExport(blob, filename);
      toast.success(`Downloaded ${actualCount} customer${actualCount === 1 ? "" : "s"}.`);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Unable to create the customer report.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isGenerating) onClose(); }}>
      <section aria-labelledby="export-title" aria-modal="true" className="my-auto max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-crm-border bg-crm-surface p-5 text-crm-text shadow-2xl shadow-slate-950/20 sm:p-7" role="dialog">
        <header className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-crm-primary">CUSTOMER REPORT</p><h2 id="export-title" className="mt-1 text-xl font-bold">Export and share</h2><p className="mt-1 text-sm text-crm-muted">Choose the records and fields for your report.</p></div>
          <button type="button" disabled={isGenerating} aria-label="Close export dialog" className="rounded-xl p-2 text-crm-muted transition hover:bg-crm-content hover:text-crm-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-primary disabled:opacity-50" onClick={onClose}><X size={18} aria-hidden="true" /></button>
        </header>

        <fieldset className="mt-5">
          <legend className="mb-2 text-sm font-semibold">Records to include</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {[{ id: "all", label: "All customers" }, { id: "filtered", label: "Current filters" }, { id: "selected", label: `Selected (${selectedIds.length})` }].map((option) => (
              <label key={option.id} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition ${scope === option.id ? "border-crm-primary bg-crm-primary-soft text-crm-primary" : "border-crm-border text-crm-muted hover:bg-crm-content"}`}>
                <input className="accent-crm-primary" type="radio" name="export-scope" value={option.id} checked={scope === option.id} onChange={() => setScope(option.id)} /> {option.label}
              </label>
            ))}
          </div>
          <p className="mt-2 min-h-5 text-xs text-crm-muted" aria-live="polite">{countLoading ? "Counting matching customers…" : countError || `${recordCount} record${recordCount === 1 ? "" : "s"} will be included`}</p>
        </fieldset>

        <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Columns</legend>
            <div className="grid max-h-48 grid-cols-2 gap-x-3 gap-y-2 overflow-y-auto rounded-xl border border-crm-border bg-crm-content p-3 sm:grid-cols-3">
              {columnChoices.map((column) => <label key={column.key} className="flex min-w-0 items-center gap-2 text-xs text-crm-text"><input className="accent-crm-primary" type="checkbox" checked={columns.includes(column.key)} onChange={() => toggleColumn(column.key)} /><span className="truncate">{column.label}</span></label>)}
            </div>
          </fieldset>
          <label className="text-sm font-semibold">File format
            <select className="mt-2 w-full rounded-xl border border-crm-border bg-crm-content px-3 py-3 text-sm font-medium text-crm-text outline-none focus:border-crm-primary focus:ring-4 focus:ring-crm-primary/15" value={format} onChange={(event) => setFormat(event.target.value)}>
              <option value="xlsx">Excel (.xlsx)</option><option value="csv">CSV (.csv)</option><option value="pdf">PDF (.pdf)</option>
            </select>
          </label>
        </div>

        <p className="mt-4 flex items-start gap-2 rounded-xl border border-crm-border bg-crm-content p-3 text-xs leading-5 text-crm-muted"><Mail size={15} className="mt-0.5 shrink-0" aria-hidden="true" /> Email delivery is unavailable because no email provider is configured. Download the report and attach it manually.</p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" disabled={isGenerating || countLoading || Boolean(countError) || !recordCount} className="inline-flex items-center justify-center gap-2 rounded-xl border border-crm-border px-4 py-2.5 text-sm font-semibold text-crm-text transition hover:bg-crm-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-primary disabled:cursor-not-allowed disabled:opacity-50" onClick={() => createFile(true)}><Share2 size={16} aria-hidden="true" /> Share report</button>
          <button type="button" disabled={isGenerating || countLoading || Boolean(countError) || !recordCount} className="inline-flex items-center justify-center gap-2 rounded-xl bg-crm-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-crm-primary-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-crm-primary/20 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => createFile(false)}><Download size={16} aria-hidden="true" /> {isGenerating ? "Preparing…" : "Download report"}</button>
        </div>
        <div className="sr-only" aria-hidden="true">{format === "xlsx" ? <FileSpreadsheet /> : <FileText />}</div>
      </section>
    </div>
  );
}
