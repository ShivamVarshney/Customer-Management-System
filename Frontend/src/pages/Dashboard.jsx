import { useEffect, useState } from "react";
import { Clock3, Pencil, Plus, Search, Trash2, UserRoundCheck, UserRoundX, Users, ArrowUpRight, Building2 } from "lucide-react";
import { ClipLoader } from "react-spinners";
import { Link } from "react-router-dom";
import api from "../api";
import Loader from "../components/Loader";
import PhoneInput from "../components/PhoneInput";
import { isValidPhoneNumber, normalizePhoneNumber } from "../components/phoneUtils";

const newCustomerForm = () => ({ name: "", email: "", phone: "", address: "", status: "Pending", leadStage: "New Lead", companyName: "", jobTitle: "", country: "", state: "", city: "", leadSource: "", priority: "Normal", notes: "", nextFollowUpDate: "" });

export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [listError, setListError] = useState("");
  const [statsError, setStatsError] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, inactive: 0, recentCustomers: [] });

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    ...newCustomerForm(),
  });

  // Load Customers
  const loadCustomers = async () => {
    setLoadingCustomers(true);
    setListError("");
    try {
      const res = await api.get("/customers");

      if (res.data.success) {
        setCustomers(res.data.customers);
      } else {
        setCustomers([]);
      }
    } catch {
      setCustomers([]);
      setListError("Unable to load customers. Please try again.");
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Load Dashboard Stats
  const loadStats = async () => {
  setLoadingStats(true);
  setStatsError("");
  try {
    const res = await api.get("/dashboard/stats");

    if (res.data.success) {
      setStats({
        total: Number.isFinite(res.data.total) ? res.data.total : 0,
        active: Number.isFinite(res.data.active) ? res.data.active : 0,
        pending: Number.isFinite(res.data.pending) ? res.data.pending : 0,
        inactive: Number.isFinite(res.data.inactive) ? res.data.inactive : 0,
        recentCustomers: Array.isArray(res.data.recentCustomers) ? res.data.recentCustomers : [],
      });
    } else {
      setStatsError("Dashboard data is unavailable.");
    }
  } catch {
    setStatsError("Unable to load dashboard statistics.");
  } finally {
    setLoadingStats(false);
  }
};

  useEffect(() => {
    loadCustomers();
    loadStats();
  }, []);

  useEffect(() => {
    if (!showModal) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isSubmitting) {
        event.preventDefault();
        setShowModal(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showModal, isSubmitting]);

  // Add / Update Customer
  const submit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFormError("");
    const originalPhone = customers.find((customer) => customer._id === editingId)?.phone;
    const preserveLegacyPhone = Boolean(editingId && originalPhone && !form.phone.startsWith("+") && form.phone === originalPhone);
    if (!preserveLegacyPhone && !isValidPhoneNumber(form.phone)) {
      setFormError("Enter a valid phone number for the selected country.");
      return;
    }
    setIsSubmitting(true);

    try {
      const payload = { ...form, phone: preserveLegacyPhone ? form.phone : normalizePhoneNumber(form.phone), nextFollowUpDate: form.nextFollowUpDate || null };
      if (editingId) {
        await api.put(`/customers/${editingId}`, payload);
      } else {
        await api.post("/customers", payload);
      }

      setShowModal(false);
      setEditingId(null);

      setForm(newCustomerForm());

      await Promise.all([loadCustomers(), loadStats()]);
    } catch (error) {
      setFormError(error.response?.data?.message || "Unable to save this customer. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Customer
  const editCustomer = (c) => {
    setEditingId(c._id);

    setForm({
      ...newCustomerForm(),
      ...c,
      leadStage: c.leadStage || "New Lead",
      nextFollowUpDate: c.nextFollowUpDate ? new Date(c.nextFollowUpDate).toISOString().slice(0, 10) : "",
    });

    setShowModal(true);
  };

  // Delete Customer
  const deleteCustomer = async (id) => {
    if (deletingId) return;
    if (!window.confirm("Delete customer?")) return;

    setDeletingId(id);
    try {
      await api.delete(`/customers/${id}`);
      await Promise.all([loadCustomers(), loadStats()]);
    } catch (error) {
      setListError(error.response?.data?.message || "Unable to delete this customer. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  // Search + Filter
  const filtered = customers.filter((c) => {
    const matchSearch =
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search);

    const matchFilter =
      filter === "All" || c.status === filter;

    return matchSearch && matchFilter;
  });

  const cards = [
    { label: "Total customers", value: stats.total, icon: <Users size={22} aria-hidden="true" />, tone: "indigo" },
    { label: "Active customers", value: stats.active, icon: <UserRoundCheck size={22} aria-hidden="true" />, tone: "green" },
    { label: "Pending customers", value: stats.pending, icon: <Clock3 size={22} aria-hidden="true" />, tone: "amber" },
    { label: "Inactive customers", value: stats.inactive, icon: <UserRoundX size={22} aria-hidden="true" />, tone: "slate" },
  ];

  return (
    <div className="space-y-8 sm:space-y-10">
      <section className="relative overflow-hidden rounded-3xl bg-crm-primary px-6 py-8 text-white shadow-lg shadow-indigo-900/10 sm:px-9 sm:py-10">
        <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-100">YOUR CUSTOMER OVERVIEW</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Welcome{user.firstName ? `, ${user.firstName}` : " back"}</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-indigo-100 sm:text-base">Here&apos;s what&apos;s happening in your customer workspace today.</p>
          </div>
          <button className="crm-hover-inverse-control inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-indigo-700 shadow-lg shadow-indigo-950/10 transition duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40 sm:w-auto" onClick={() => {
            setEditingId(null);
            setForm(newCustomerForm());
            setShowModal(true);
          }}>
            <Plus size={18} aria-hidden="true" /> Add customer
          </button>
        </div>
      </section>

      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">At a glance</h2>
          <p className="mt-1 text-sm text-slate-500">A quick snapshot of your customer portfolio.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-teal-600" /> Live overview
        </span>
      </div>

      <section aria-label="Customer statistics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon, tone }) => {
          const colors = {
            indigo: "bg-indigo-50 text-indigo-700 ring-indigo-100",
          green: "bg-crm-success-bg text-crm-success ring-green-200",
          amber: "bg-crm-warning-bg text-crm-warning ring-amber-200",
          slate: "bg-slate-100 text-slate-600 ring-slate-200",
          };
          return (
            <article className="rounded-2xl border border-crm-border bg-crm-surface p-5 shadow-sm shadow-slate-900/[0.025] transition duration-200 hover:border-indigo-200 hover:shadow-md sm:p-6" key={label}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">{label}</p>
                  <p className="mt-3 flex min-h-10 items-center text-4xl font-bold tracking-tight text-slate-900">
                    {loadingStats ? <ClipLoader aria-label="Loading statistics" color="#4F46E5" size={22} /> : statsError ? "—" : value}
                  </p>
                </div>
                <span className={`grid size-12 place-items-center rounded-2xl ring-1 ${colors[tone]}`}>{icon}</span>
              </div>
              <p className={`mt-4 text-xs font-medium ${statsError ? "text-rose-700" : "text-slate-400"}`}>{statsError || "In your customer workspace"}</p>
            </article>
          );
        })}
      </section>

      {statsError && !loadingStats && <button type="button" className="-mt-6 text-sm font-semibold text-crm-primary underline underline-offset-4 hover:text-indigo-800" onClick={loadStats}>Retry dashboard data</button>}

      <section className="overflow-hidden rounded-2xl border border-crm-border bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-crm-border px-5 py-4 sm:px-6"><div><h2 className="text-base font-bold text-crm-text">Recent customers</h2><p className="mt-1 text-sm text-crm-muted">The latest five records added to your workspace.</p></div><Link className="inline-flex items-center gap-1 text-sm font-semibold text-crm-primary hover:text-crm-primary-hover" to="/customers">View all customers <ArrowUpRight size={15} aria-hidden="true" /></Link></div>
        {loadingStats ? <Loader message="Loading recent customers..." /> : statsError ? <p role="alert" className="m-5 rounded-xl bg-crm-error-bg p-4 text-sm text-crm-error">Recent customers could not be loaded.</p> : stats.recentCustomers.length === 0 ? <div className="p-8 text-center"><Users size={28} className="mx-auto text-slate-400" aria-hidden="true" /><p className="mt-2 font-semibold text-crm-text">No customers yet</p><p className="mt-1 text-sm text-crm-muted">Create your first customer to see it here.</p><button type="button" className="mt-4 cursor-pointer rounded-lg bg-crm-primary px-4 py-2 text-sm font-semibold text-white transition duration-200 hover:bg-crm-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-primary active:scale-[0.98]" onClick={() => { setEditingId(null); setForm(newCustomerForm()); setShowModal(true); }}>Add customer</button></div> : <div className="divide-y divide-crm-border">{stats.recentCustomers.map((customer) => { const status = customer.status || "Pending"; const stage = customer.leadStage || "New Lead"; return <div key={customer._id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-6"><div className="min-w-0 flex-1"><p className="truncate font-semibold text-crm-text">{customer.name}</p><p className="truncate text-sm text-crm-muted">{customer.email} · {customer.phone}</p>{customer.companyName && <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500"><Building2 size={12} aria-hidden="true" />{customer.companyName}</p>}</div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{status}</span><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">{stage}</span><Link aria-label={`View ${customer.name}`} className="rounded-lg border border-crm-border px-3 py-1.5 text-xs font-semibold text-crm-primary hover:bg-crm-content" to={`/customers/${customer._id}`}>View</Link></div></div>; })}</div>}
      </section>

      <section className="overflow-hidden rounded-3xl border border-crm-border bg-crm-surface shadow-sm shadow-slate-900/[0.035]">
        <div className="flex flex-col gap-4 border-b border-crm-border bg-crm-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">Customer directory</h2>
            <p className="mt-1 text-sm text-slate-500">Search, filter, and manage your customer records.</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <label className="relative flex-1 sm:min-w-64">
              <span className="sr-only">Search customers</span>
              <Search size={17} aria-hidden="true" className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
              <input className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pr-3 pl-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100" placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
            <label>
              <span className="sr-only">Filter by status</span>
              <select className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 sm:w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option>All</option><option>Active</option><option>Pending</option><option>Inactive</option>
              </select>
            </label>
          </div>
        </div>

        {loadingCustomers ? (
          <Loader message="Loading customers..." />
        ) : listError ? (
          <div className="m-5 rounded-xl border border-rose-200 bg-crm-error-bg p-4 text-sm text-crm-error" role="alert">
            <p>{listError}</p>
            <button className="mt-3 font-semibold underline underline-offset-4" onClick={loadCustomers}>Try again</button>
          </div>
        ) : <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="bg-crm-content text-[11px] font-bold uppercase tracking-[0.14em] text-crm-muted">
              <tr><th className="px-5 py-4">Name</th><th className="px-5 py-4">Email</th><th className="px-5 py-4">Phone</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Date</th><th className="px-5 py-4">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length > 0 ? filtered.map((c) => {
                const status = c.status || "Pending";
                const badge = status === "Active" ? "bg-crm-success-bg text-crm-success ring-green-200" : status === "Inactive" ? "bg-slate-100 text-slate-600 ring-slate-200" : "bg-crm-warning-bg text-crm-warning ring-amber-200";
                return (
                  <tr className="transition-colors duration-150 hover:bg-indigo-50/50" key={c._id}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-xs font-bold text-crm-primary ring-1 ring-indigo-200">{c.name?.trim()?.charAt(0)?.toUpperCase() || "?"}</span>
                        <span className="font-semibold text-slate-900">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{c.email}</td>
                    <td className="px-5 py-4 text-slate-600">{c.phone}</td>
                    <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${badge}`}>{status}</span></td>
                    <td className="px-5 py-4 text-slate-500">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "-"}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button aria-label={`Edit ${c.name}`} className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" onClick={() => editCustomer(c)}><Pencil size={14} aria-hidden="true" /> Edit</button>
                        <button aria-label={`Delete ${c.name}`} disabled={deletingId === c._id} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-crm-error transition hover:bg-crm-error-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-60" onClick={() => deleteCustomer(c._id)}>{deletingId === c._id ? <ClipLoader aria-label="Deleting customer" color="#BE123C" size={13} /> : <Trash2 size={14} aria-hidden="true" />} {deletingId === c._id ? "Deleting" : "Delete"}</button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan="6" className="px-5 py-14 text-center">
                  <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600"><Users size={22} aria-hidden="true" /></span>
                  <p className="mt-3 font-semibold text-slate-800">No customers found</p>
                  <p className="mt-1 text-sm text-slate-500">Try changing your search or status filter.</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>}
      </section>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm" role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget && !isSubmitting) setShowModal(false); }}>
          <div aria-labelledby="customer-modal-title" aria-modal="true" className="my-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-950/20 sm:p-8" role="dialog">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div><p className="text-xs font-bold uppercase tracking-widest text-indigo-600">CUSTOMER RECORD</p><h3 id="customer-modal-title" className="mt-1 text-xl font-bold text-slate-900">{editingId ? "Edit customer" : "Add a customer"}</h3></div>
              <span className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-700"><Users size={19} aria-hidden="true" /></span>
            </div>

            <form className="space-y-4" onSubmit={submit}>
              {formError && <p role="alert" className="rounded-xl border border-rose-200 bg-crm-error-bg px-4 py-3 text-sm font-medium text-crm-error">{formError}</p>}
              <div className="grid gap-4 sm:grid-cols-2">
                <input aria-label="Name" name="name" className="w-full rounded-xl border border-crm-border bg-crm-content px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <input aria-label="Company name" name="companyName" className="w-full rounded-xl border border-crm-border bg-crm-content px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" placeholder="Company name (optional)" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
                <input aria-label="Email" name="email" className="w-full rounded-xl border border-crm-border bg-crm-content px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                <PhoneInput value={form.phone} onChange={(phone) => setForm({ ...form, phone })} required />
                <input aria-label="Job title" name="jobTitle" className="w-full rounded-xl border border-crm-border bg-crm-content px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" placeholder="Job title" value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} />
                <input aria-label="Lead source" name="leadSource" className="w-full rounded-xl border border-crm-border bg-crm-content px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" placeholder="Lead source" value={form.leadSource} onChange={(e) => setForm({ ...form, leadSource: e.target.value })} />
                <input aria-label="Country" name="country" className="w-full rounded-xl border border-crm-border bg-crm-content px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" placeholder="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                <input aria-label="State" name="state" className="w-full rounded-xl border border-crm-border bg-crm-content px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                <input aria-label="City" name="city" className="w-full rounded-xl border border-crm-border bg-crm-content px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                <select aria-label="Customer account status" className="w-full rounded-xl border border-crm-border bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Active</option><option>Pending</option><option>Inactive</option></select>
                <select aria-label="Lead stage" className="w-full rounded-xl border border-crm-border bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" value={form.leadStage} onChange={(e) => setForm({ ...form, leadStage: e.target.value })}>{["New Lead", "Contacted", "Qualified", "Proposal Sent", "Won", "Lost"].map((stage) => <option key={stage}>{stage}</option>)}</select>
                <select aria-label="Priority" className="w-full rounded-xl border border-crm-border bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{["Low", "Normal", "High"].map((priority) => <option key={priority}>{priority}</option>)}</select>
                <label className="text-xs font-medium text-crm-muted">Next follow-up<input aria-label="Next follow-up date" className="mt-1 w-full rounded-xl border border-crm-border bg-crm-content px-4 py-3 text-sm text-crm-text" type="date" value={form.nextFollowUpDate || ""} onChange={(e) => setForm({ ...form, nextFollowUpDate: e.target.value })} /></label>
                <input aria-label="Address" name="address" className="w-full rounded-xl border border-crm-border bg-crm-content px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 sm:col-span-2" placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
                <textarea aria-label="Notes" name="notes" className="min-h-20 w-full rounded-xl border border-crm-border bg-crm-content px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 sm:col-span-2" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button disabled={isSubmitting} type="button" className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-60" onClick={() => { setShowModal(false); setEditingId(null); }}>Cancel</button>
                <button disabled={isSubmitting} type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-crm-primary px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-crm-primary-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-70">
                  {isSubmitting && <ClipLoader aria-label="Saving customer" color="#ffffff" size={17} />}
                  {isSubmitting ? "Saving..." : editingId ? "Update customer" : "Save customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
