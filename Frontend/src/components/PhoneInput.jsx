import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search } from "lucide-react";
import { phoneCountries as countries, searchPhoneCountries } from "./phoneUtils";

const parseValue = (value = "") => {
  const digits = value.replace(/\D/g, "");
  if (!value.trim().startsWith("+")) return { country: countries[0], local: digits };
  const country = [...countries].sort((a, b) => b.dial.length - a.dial.length).find((item) => digits.startsWith(item.dial.slice(1)));
  return country ? { country, local: digits.slice(country.dial.length - 1) } : { country: countries[0], local: digits };
};

const getMenuPosition = (trigger) => {
  if (!trigger) return null;
  const rect = trigger.getBoundingClientRect();
  const viewportPadding = 12;
  const width = Math.min(288, window.innerWidth - viewportPadding * 2);
  const left = Math.min(Math.max(viewportPadding, rect.left), window.innerWidth - width - viewportPadding);
  const spaceBelow = window.innerHeight - rect.bottom - 8 - viewportPadding;
  const spaceAbove = rect.top - 8 - viewportPadding;
  const openAbove = spaceBelow < 200 && spaceAbove > spaceBelow;
  const maxHeight = Math.max(120, Math.min(320, openAbove ? spaceAbove : spaceBelow));
  const top = openAbove ? Math.max(viewportPadding, rect.top - maxHeight - 8) : Math.min(rect.bottom + 8, window.innerHeight - maxHeight - viewportPadding);
  return { left, top, width, maxHeight };
};

export default function PhoneInput({ value = "", onChange, required = false, className = "" }) {
  const [country, setCountry] = useState(() => parseValue(value).country);
  const [local, setLocal] = useState(() => parseValue(value).local);
  const lastSent = useRef(value);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [menuPosition, setMenuPosition] = useState(null);

  useEffect(() => {
    if (value === lastSent.current) return;
    const parsed = parseValue(value);
    setCountry(parsed.country);
    setLocal(parsed.local);
    lastSent.current = value;
  }, [value]);

  useLayoutEffect(() => {
    if (!open) return undefined;
    const updatePosition = () => setMenuPosition(getMenuPosition(triggerRef.current));
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsidePointer = (event) => {
      if (!triggerRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const visibleCountries = searchPhoneCountries(search);
  const emit = (selected, number) => {
    const nextValue = `${selected.dial}${number.replace(/\D/g, "")}`;
    lastSent.current = nextValue;
    onChange(nextValue);
  };

  const handleNumberChange = (event) => {
    const next = event.target.value;
    if (next.trim().startsWith("+")) {
      const parsed = parseValue(next);
      setCountry(parsed.country);
      setLocal(parsed.local);
      emit(parsed.country, parsed.local);
      return;
    }
    setLocal(next);
    emit(country, next);
  };

  const menu = open && menuPosition ? createPortal(
    <div
      ref={menuRef}
      className="fixed z-[1000] flex flex-col overflow-hidden rounded-xl border border-crm-border bg-white shadow-2xl"
      style={{ left: menuPosition.left, top: menuPosition.top, width: menuPosition.width, maxHeight: menuPosition.maxHeight }}
      role="dialog"
      aria-label="Select country"
    >
      <label className="relative block shrink-0 border-b border-crm-border p-2">
        <Search size={15} aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input autoFocus aria-label="Search countries by name or dial code" className="w-full rounded-lg bg-crm-content py-2 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200" placeholder="Search countries or code" value={search} onChange={(event) => setSearch(event.target.value)} />
      </label>
      <ul className="min-h-0 flex-1 overflow-y-auto p-1" role="listbox" aria-label="Countries">
        {visibleCountries.map((item) => (
          <li key={item.code}>
            <button type="button" role="option" aria-selected={country.code === item.code} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-800 hover:bg-crm-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" onClick={() => { setCountry(item); emit(item, local); setOpen(false); setSearch(""); }}>
              <span aria-hidden="true" className="text-lg">{item.flag}</span><span className="flex-1">{item.name}</span><span className="text-crm-muted">{item.dial}</span>
            </button>
          </li>
        ))}
        {visibleCountries.length === 0 && <li className="px-3 py-4 text-sm text-crm-muted">No countries found.</li>}
      </ul>
    </div>,
    document.body
  ) : null;

  return (
    <div className={`relative flex min-w-0 ${className}`}>
      <button ref={triggerRef} type="button" aria-label={`Country code: ${country.name} ${country.dial}`} aria-haspopup="dialog" aria-expanded={open} className="inline-flex shrink-0 items-center gap-1.5 rounded-l-xl border border-r-0 border-crm-border bg-crm-surface px-2.5 text-sm font-medium text-crm-text focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-primary sm:px-3" onClick={() => { setOpen((shown) => !shown); setSearch(""); }}>
        <span aria-hidden="true">{country.flag}</span><span className="text-xs font-semibold">{country.code}</span><span>{country.dial}</span><ChevronDown size={14} aria-hidden="true" />
      </button>
      <input aria-label="Phone number" autoComplete="tel-national" className="min-w-0 flex-1 rounded-r-xl border border-crm-border bg-crm-content px-3 py-3 text-sm text-crm-text caret-crm-text outline-none placeholder:text-crm-muted selection:bg-crm-primary-soft selection:text-crm-primary-soft-text focus:border-crm-primary focus:bg-crm-surface focus:ring-4 focus:ring-crm-primary/20 sm:px-4" inputMode="tel" maxLength={24} placeholder="Phone number" required={required} type="tel" value={local} onChange={handleNumberChange} />
      {menu}
    </div>
  );
}
