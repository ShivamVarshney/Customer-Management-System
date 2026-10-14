import { useEffect, useRef, useState } from "react";
import { Building2, ChevronDown, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "./useWorkspace";

export default function WorkspaceSwitcher() {
  const { workspaces, activeWorkspace, switchWorkspace, createWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [switchingId, setSwitchingId] = useState(null);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open && !showCreate) return undefined;

    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();

      if (showCreate) {
        if (!submitting) setShowCreate(false);
        return;
      }

      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, showCreate, submitting]);

  const changeWorkspace = async (workspaceId) => {
    if (!workspaceId || workspaceId === activeWorkspace?.id || switchingId) return;
    setSwitchingId(workspaceId);
    try {
      await switchWorkspace(workspaceId);
      setOpen(false);
      toast.success("Workspace switched");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to switch workspaces.");
    } finally {
      setSwitchingId(null);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    const normalizedName = name.trim();
    if (!normalizedName || submitting) return;
    setSubmitting(true);
    try {
      await createWorkspace(normalizedName);
      setName("");
      setShowCreate(false);
      toast.success("Workspace created and activated");
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Unable to create workspace.");
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateDialog = () => {
    setOpen(false);
    setShowCreate(true);
  };

  return (
    <>
      <div className="relative" ref={containerRef}>
        <div className="flex items-center gap-2 rounded-xl border border-crm-border bg-crm-surface p-1.5">
          <Building2 className="ml-1 hidden text-crm-primary sm:block" size={17} aria-hidden="true" />
          <button
            ref={triggerRef}
            id="workspace-trigger"
            type="button"
            aria-label={`Active workspace: ${activeWorkspace?.name || "Select workspace"}`}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls="workspace-options"
            className="crm-hover-control inline-flex min-w-0 max-w-40 cursor-pointer items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 text-left text-sm font-semibold text-crm-text outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-crm-primary sm:max-w-52"
            onClick={() => setOpen((value) => !value)}
          >
            <span className="truncate">{activeWorkspace?.name || "My Workspace"}</span>
            <ChevronDown size={15} aria-hidden="true" className={`shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
          </button>
          <button
            className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-crm-primary text-white transition duration-200 hover:bg-crm-primary-hover hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-primary focus-visible:ring-offset-2 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            aria-label="Add workspace"
            title="Add workspace"
            onClick={openCreateDialog}
          ><Plus size={17} aria-hidden="true" /></button>
        </div>

        {open && (
          <div aria-label="Workspaces" className="absolute right-0 top-[calc(100%+0.5rem)] z-[65] w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-crm-border bg-crm-surface p-1.5 text-crm-text shadow-xl shadow-slate-950/15" role="group" aria-labelledby="workspace-trigger">
            <p className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-crm-muted">My Workspace</p>
            <div id="workspace-options" aria-label="Available workspaces" className="max-h-64 overflow-y-auto" role="listbox">
              {workspaces.map((workspace) => {
                const selected = workspace.id === activeWorkspace?.id;
                const switching = switchingId === workspace.id;
                return (
                  <button
                    key={workspace.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    disabled={Boolean(switchingId)}
                    className={`crm-hover-control flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left text-sm transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-primary disabled:cursor-not-allowed disabled:opacity-60 ${selected ? "bg-crm-primary-soft font-semibold text-crm-primary" : "text-crm-text"}`}
                    onClick={() => changeWorkspace(workspace.id)}
                  >
                    <span className="min-w-0 truncate">{workspace.name}{workspace.isDefault ? " · Personal" : ""}</span>
                    {switching ? <span className="text-xs text-crm-muted">Switching…</span> : selected ? <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-crm-primary" /> : null}
                  </button>
                );
              })}
              {workspaces.length === 0 && <p className="px-3 py-2 text-sm text-crm-muted">No workspaces available.</p>}
            </div>
            <div className="mt-1 border-t border-crm-border pt-1">
              <button type="button" className="crm-hover-control w-full cursor-pointer rounded-lg border border-transparent px-3 py-2 text-left text-sm font-semibold text-crm-primary transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-primary" onClick={openCreateDialog}>+ Add workspace</button>
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/45 p-4" onPointerDown={(event) => { if (event.target === event.currentTarget && !submitting) setShowCreate(false); }}>
          <section aria-labelledby="workspace-create-title" aria-modal="true" className="w-full max-w-md rounded-2xl border border-crm-border bg-crm-surface p-6 text-crm-text shadow-2xl" role="dialog">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-crm-primary">New account</p><h2 className="mt-1 text-xl font-bold" id="workspace-create-title">Add a workspace</h2></div>
              <button className="crm-hover-control cursor-pointer rounded-lg border border-transparent p-2 text-crm-muted transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-primary disabled:cursor-not-allowed disabled:opacity-50" type="button" aria-label="Close dialog" onClick={() => setShowCreate(false)} disabled={submitting}><X size={18} /></button>
            </div>
            <form className="mt-5 space-y-4" onSubmit={submit}>
              <label className="block text-sm font-semibold text-crm-text" htmlFor="workspace-name">Workspace name
                <input id="workspace-name" className="mt-2 w-full rounded-xl border border-crm-border bg-crm-content px-4 py-3 text-sm text-crm-text outline-none focus:border-crm-primary focus:ring-2 focus:ring-indigo-200" autoFocus maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="For example, North America" required />
              </label>
              <p className="text-xs leading-5 text-crm-muted">Each workspace keeps its customer records and reports separate.</p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button className="crm-hover-control cursor-pointer rounded-xl border border-crm-border px-4 py-2.5 text-sm font-semibold text-crm-muted transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-primary disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={() => setShowCreate(false)} disabled={submitting}>Cancel</button>
                <button className="cursor-pointer rounded-xl bg-crm-primary px-4 py-2.5 text-sm font-semibold text-white transition duration-200 hover:bg-crm-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-primary disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={submitting || !name.trim()}>{submitting ? "Creating…" : "Create workspace"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
