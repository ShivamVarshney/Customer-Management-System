import { useEffect, useState } from "react";
import { Activity, CalendarDays, RefreshCw } from "lucide-react";
import { ClipLoader } from "react-spinners";
import api from "../api";
import Loader from "../components/Loader";

const stageColors = ["var(--crm-primary)", "var(--crm-blue)", "var(--crm-accent)", "var(--crm-warning)", "var(--crm-success)", "var(--crm-error)"];

const dateInputValue = (date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDefaultRange = () => {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
  return { from: dateInputValue(from), to: dateInputValue(now) };
};

function GrowthChart({ data }) {
  const values = data.map((point) => Number(point.count) || 0);
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => `${30 + index * (420 / Math.max(values.length - 1, 1))},${150 - value / max * 120}`).join(" ");

  return (
    <svg className="mt-5 h-56 w-full overflow-visible" viewBox="0 0 480 190" role="img" aria-label="Monthly customer growth line chart">
      {[0, 1, 2, 3].map((line) => (
        <g key={line}>
          <line x1="30" x2="460" y1={30 + line * 40} y2={30 + line * 40} stroke="var(--crm-border)" strokeDasharray="4 5" />
          <text x="2" y={34 + line * 40} fontSize="10" fill="var(--crm-muted)">{Math.round(max * (1 - line / 3))}</text>
        </g>
      ))}
      {values.length > 1 && <polyline points={points} fill="none" stroke="var(--crm-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
      {values.map((value, index) => {
        const x = 30 + index * (420 / Math.max(values.length - 1, 1));
        const y = 150 - value / max * 120;
        return (
          <g key={`${data[index]?.key}-${index}`}>
            <circle cx={x} cy={y} r="4" fill="var(--crm-primary)" stroke="var(--crm-surface)" strokeWidth="2"><title>{`${data[index]?.month}: ${value} customers`}</title></circle>
            <text x={x} y="178" textAnchor="middle" fontSize="10" fill="var(--crm-muted)">{data[index]?.month?.split(" ")[0]}</text>
          </g>
        );
      })}
    </svg>
  );
}

function StatusDonut({ data }) {
  const total = data.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  let offset = 0;
  const colors = ["var(--crm-success)", "var(--crm-warning)", "var(--crm-muted)"];

  return (
    <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
      <svg className="size-40 shrink-0" viewBox="0 0 120 120" role="img" aria-label="Customer account status distribution">
        <circle cx="60" cy="60" r="45" fill="none" stroke="var(--crm-border)" strokeWidth="18" />
        {total > 0 && data.map((item, index) => {
          const portion = (Number(item.value) || 0) / total * 100;
          const currentOffset = offset;
          offset += portion;
          return <circle key={item.name} cx="60" cy="60" r="45" fill="none" stroke={colors[index]} strokeWidth="18" pathLength="100" strokeDasharray={`${portion} ${100 - portion}`} strokeDashoffset={-currentOffset} transform="rotate(-90 60 60)"><title>{`${item.name}: ${item.value}`}</title></circle>;
        })}
        <text x="60" y="57" textAnchor="middle" fontSize="19" fontWeight="700" fill="var(--crm-text)">{total}</text>
        <text x="60" y="72" textAnchor="middle" fontSize="8" fill="var(--crm-muted)">CUSTOMERS</text>
      </svg>
      <ul className="w-full space-y-3 sm:max-w-48">
        {data.map((item, index) => <li key={item.name} className="flex items-center justify-between gap-3 text-sm"><span className="inline-flex items-center gap-2 text-crm-muted"><span className="size-2.5 rounded-full" style={{ backgroundColor: colors[index] }} />{item.name}</span><strong className="text-crm-text">{item.value}</strong></li>)}
      </ul>
    </div>
  );
}

function LeadStageBars({ data }) {
  const max = Math.max(...data.map((item) => Number(item.value) || 0), 1);
  return (
    <div className="mt-5 space-y-4">
      {data.map((item, index) => (
        <div key={item.name} className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-3 text-xs sm:grid-cols-[8rem_1fr_2.5rem] sm:text-sm">
          <span className="truncate text-crm-muted">{item.name}</span>
          <div className="h-2.5 overflow-hidden rounded-full bg-crm-content"><div className="h-full rounded-full transition-[width]" style={{ width: `${(Number(item.value) || 0) / max * 100}%`, backgroundColor: stageColors[index] }} /></div>
          <strong className="text-right text-crm-text">{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

export default function Analytics() {
  const [range, setRange] = useState(getDefaultRange);
  const [appliedRange, setAppliedRange] = useState(getDefaultRange);
  const [analytics, setAnalytics] = useState({ total: 0, monthlyGrowth: [], statusDistribution: [], leadStageDistribution: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");

    api.get("/dashboard/analytics", { params: appliedRange, signal: controller.signal })
      .then(({ data }) => {
        if (!data.success) throw new Error("Analytics data is unavailable.");
        setAnalytics({
          total: Number.isFinite(data.total) ? data.total : 0,
          monthlyGrowth: Array.isArray(data.monthlyGrowth) ? data.monthlyGrowth : [],
          statusDistribution: Array.isArray(data.statusDistribution) ? data.statusDistribution : [],
          leadStageDistribution: Array.isArray(data.leadStageDistribution) ? data.leadStageDistribution : [],
        });
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(requestError.response?.data?.message || requestError.message || "Unable to load analytics. Please try again.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [appliedRange, attempt]);

  const applyRange = (event) => {
    event.preventDefault();
    setFormError("");
    if (!range.from || !range.to) {
      setFormError("Choose both a start and end date.");
      return;
    }
    if (range.from > range.to) {
      setFormError("The start date must be on or before the end date.");
      return;
    }
    setAppliedRange({ ...range });
  };

  return (
    <div className="space-y-7 sm:space-y-8">
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-crm-primary"><Activity size={15} aria-hidden="true" /> Customer insights</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-crm-text">Analytics</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-crm-muted">Explore customer growth, account status, and lead pipeline activity for the selected creation-date range.</p>
        </div>
        <form className="grid gap-3 rounded-2xl border border-crm-border bg-crm-surface p-4 shadow-sm sm:grid-cols-[1fr_1fr_auto] sm:items-end" onSubmit={applyRange}>
          <label className="text-xs font-semibold text-crm-muted">From
            <span className="relative mt-1 block"><CalendarDays size={15} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-crm-muted" /><input className="w-full rounded-lg border border-crm-border bg-crm-content py-2 pl-9 pr-3 text-sm text-crm-text outline-none focus:border-crm-primary focus:ring-2 focus:ring-indigo-200" type="date" value={range.from} onChange={(event) => setRange((current) => ({ ...current, from: event.target.value }))} /></span>
          </label>
          <label className="text-xs font-semibold text-crm-muted">To
            <span className="relative mt-1 block"><CalendarDays size={15} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-crm-muted" /><input className="w-full rounded-lg border border-crm-border bg-crm-content py-2 pl-9 pr-3 text-sm text-crm-text outline-none focus:border-crm-primary focus:ring-2 focus:ring-indigo-200" type="date" value={range.to} onChange={(event) => setRange((current) => ({ ...current, to: event.target.value }))} /></span>
          </label>
          <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-crm-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-crm-primary-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200" type="submit"><RefreshCw size={15} aria-hidden="true" /> Apply</button>
          {formError && <p className="text-xs font-medium text-crm-error sm:col-span-3" role="alert">{formError}</p>}
        </form>
      </section>

      {loading ? <section className="grid min-h-80 place-items-center rounded-2xl border border-crm-border bg-crm-surface"><Loader message="Loading analytics..." /></section> : error ? (
        <section className="rounded-2xl border border-crm-border bg-crm-surface p-8 text-center" role="alert">
          <p className="font-semibold text-crm-text">Analytics could not be loaded</p>
          <p className="mt-2 text-sm text-crm-muted">{error}</p>
          <button type="button" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-crm-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-crm-primary-hover" onClick={() => setAttempt((value) => value + 1)}><ClipLoader color="currentColor" size={14} /> Try again</button>
        </section>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-crm-border bg-crm-surface px-4 py-3 text-sm">
            <p className="text-crm-muted">Showing customer records created from <strong className="text-crm-text">{appliedRange.from}</strong> through <strong className="text-crm-text">{appliedRange.to}</strong>.</p>
            <p className="font-semibold text-crm-text">{analytics.total} {analytics.total === 1 ? "customer" : "customers"}</p>
          </div>
          <section aria-label="Customer analytics charts" className="grid gap-5 lg:grid-cols-2">
            <article className="min-w-0 rounded-2xl border border-crm-border bg-crm-surface p-5 shadow-sm sm:p-6">
              <h2 className="text-base font-bold text-crm-text">Monthly customer growth</h2><p className="mt-1 text-sm text-crm-muted">New customer records created in each month.</p>
              {analytics.total === 0 && <p className="mt-3 text-xs text-crm-muted">No customers were created in this date range.</p>}
              <GrowthChart data={analytics.monthlyGrowth} />
            </article>
            <article className="min-w-0 rounded-2xl border border-crm-border bg-crm-surface p-5 shadow-sm sm:p-6">
              <h2 className="text-base font-bold text-crm-text">Account-status distribution</h2><p className="mt-1 text-sm text-crm-muted">Current statuses of customers created in this date range.</p>
              <StatusDonut data={analytics.statusDistribution} />
            </article>
            <article className="min-w-0 rounded-2xl border border-crm-border bg-crm-surface p-5 shadow-sm sm:col-span-2 sm:p-6">
              <h2 className="text-base font-bold text-crm-text">Lead-stage distribution</h2><p className="mt-1 text-sm text-crm-muted">Opportunities grouped by sales stage, separate from account status.</p>
              {analytics.total === 0 && <p className="mt-3 text-xs text-crm-muted">No lead-stage records are available for this date range.</p>}
              <LeadStageBars data={analytics.leadStageDistribution} />
            </article>
          </section>
        </>
      )}
    </div>
  );
}
