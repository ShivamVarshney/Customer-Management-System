import { useEffect, useRef, useState } from "react";
import { Check, Monitor, Moon, Palette, RotateCcw, Sun } from "lucide-react";
import { useContext } from "react";
import { ThemeContext } from "./themeContext";
import { ACCENTS } from "./themePreferences";

const modes = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
];

export default function ThemeCustomizer() {
  const [open, setOpen] = useState(false);
  const { mode, accent, setMode, setAccent, reset } = useContext(ThemeContext);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Customize appearance"
        aria-expanded={open}
        aria-haspopup="dialog"
        className="crm-hover-control inline-flex size-10 cursor-pointer items-center justify-center rounded-xl border border-crm-border bg-crm-surface text-crm-muted transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-primary active:scale-95"
        onClick={() => setOpen((value) => !value)}
      >
        <Palette size={18} aria-hidden="true" />
      </button>
      {open && (
        <section aria-label="Appearance settings" aria-modal="false" className="absolute right-0 top-12 z-[60] w-[min(21rem,calc(100vw-2rem))] rounded-2xl border border-crm-border bg-crm-surface p-4 text-crm-text shadow-xl shadow-slate-950/15" role="dialog">
          <div className="flex items-start justify-between gap-3">
            <div><h2 className="text-sm font-bold">Appearance</h2><p className="mt-0.5 text-xs text-crm-muted">Preview theme and accent colors.</p></div>
            <button type="button" aria-label="Reset appearance to defaults" className="crm-hover-control inline-flex cursor-pointer items-center gap-1 rounded-lg border border-transparent px-2 py-1 text-xs font-semibold text-crm-muted transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-primary active:scale-95" onClick={reset}><RotateCcw size={13} aria-hidden="true" /> Reset</button>
          </div>

          <fieldset className="mt-4">
            <legend className="mb-2 text-xs font-semibold text-crm-muted">Theme</legend>
            <div className="grid grid-cols-3 gap-2">
              {modes.map(({ id, label }) => (
                <button key={id} type="button" aria-pressed={mode === id} className={`crm-hover-control inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-primary active:scale-[0.98] ${mode === id ? "border-crm-primary bg-crm-primary-soft text-crm-primary shadow-sm ring-1 ring-crm-primary/20" : "border-crm-border bg-crm-surface text-crm-muted"}`} onClick={() => setMode(id)}>
                  {id === "light" ? <Sun size={14} aria-hidden="true" /> : id === "dark" ? <Moon size={14} aria-hidden="true" /> : <Monitor size={14} aria-hidden="true" />} {label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-4">
            <legend className="mb-2 text-xs font-semibold text-crm-muted">Accent color</legend>
            <div className="grid grid-cols-4 gap-2">
              {ACCENTS.map((choice) => (
                <button key={choice.id} type="button" aria-label={`${choice.label} accent`} aria-pressed={accent === choice.id} className={`crm-hover-control inline-flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 text-xs font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-primary active:scale-[0.98] ${accent === choice.id ? "border-crm-primary bg-crm-primary-soft text-crm-primary shadow-sm ring-1 ring-crm-primary/20" : "border-crm-border text-crm-muted"}`} onClick={() => setAccent(choice.id)}>
                  <span aria-hidden="true" className="grid size-4 place-items-center rounded-full" style={{ backgroundColor: choice.color }}>{accent === choice.id && <Check size={11} className="text-white" />}</span>
                  {choice.label}
                </button>
              ))}
            </div>
          </fieldset>
        </section>
      )}
    </div>
  );
}
