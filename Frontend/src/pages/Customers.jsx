import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Download, Pencil, Plus, Search, Trash2, Users, X } from "lucide-react";
import { ClipLoader } from "react-spinners";
import { toast } from "sonner";
import api from "../api";
import Loader from "../components/Loader";
import PhoneInput from "../components/PhoneInput";
import { isValidPhoneNumber, normalizePhoneNumber } from "../components/phoneUtils";
import ExportDialog from "../components/ExportDialog";

const emptyForm = () => ({ name: "", phone: "", email: "", address: "", status: "Pending", leadStage: "New Lead", companyName: "", jobTitle: "", country: "", state: "", city: "", leadSource: "", priority: "Normal", notes: "", nextFollowUpDate: "" });

function Customers() {

  const [customers, setCustomers] =
    useState([]);

  const [search, setSearch] =
    useState("");

  const [status, setStatus] =
    useState("All");
  const [leadStage, setLeadStage] = useState("All");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const [showForm, setShowForm] =
    useState(false);

  const [editingCustomer, setEditingCustomer] =
    useState(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showExport, setShowExport] = useState(false);


  const [form, setForm] = useState(emptyForm);


  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setListError("");

    try {

      const response = await api.get(
        "/customers",
        {
          params: {
            search,
            status,
            leadStage,
            sortBy,
            sortOrder,
            page,
            limit: 10,
          }
        }
      );

      setCustomers(response.data.customers);
      setPagination(response.data.pagination || { page, pages: 1, total: response.data.customers.length });

    } catch {
      setCustomers([]);
      setListError("Unable to load customers. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [search, status, leadStage, sortBy, sortOrder, page]);


  useEffect(() => {

    const timer = setTimeout(
      fetchCustomers,
      300
    );

    return () => clearTimeout(timer);

  }, [fetchCustomers]);

  useEffect(() => {
    if (!showForm) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isSubmitting) {
        event.preventDefault();
        setShowForm(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showForm, isSubmitting]);


  const handleChange = (e) => {

    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };


  const submitCustomer = async (e) => {

    e.preventDefault();
    if (isSubmitting) return;

    if (
      !form.name ||
      !form.phone ||
      !form.email ||
      !form.address
    ) {
      alert("Please fill all fields");
      return;
    }

    const isEditing = Boolean(editingCustomer);
    const preserveLegacyPhone = Boolean(isEditing && !form.phone.startsWith("+") && form.phone === editingCustomer.phone);
    if (!preserveLegacyPhone && !isValidPhoneNumber(form.phone)) {
      toast.error("Enter a valid phone number for the selected country.");
      return;
    }
    const payload = { ...form, phone: preserveLegacyPhone ? form.phone : normalizePhoneNumber(form.phone), nextFollowUpDate: form.nextFollowUpDate || null };

    setIsSubmitting(true);
    try {

      if (isEditing) {

        await api.put(
          `/customers/${editingCustomer._id}`,
          payload
        );

        toast.success("Customer updated successfully.");

      } else {

        await api.post(
          "/customers",
          payload
        );

        toast.success("Customer added successfully.");
      }

      setShowForm(false);
      setEditingCustomer(null);

      setForm(emptyForm());

      await fetchCustomers();

    } catch (error) {

      const message = error.response?.data?.message || "Unable to save this customer. Please try again.";
      if (isEditing) {
        alert(message);
      } else {
        toast.error(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };


  const editCustomer = (customer) => {

    setEditingCustomer(customer);

    setForm({
      name: customer.name,
      ...emptyForm(),
      ...customer,
      email: customer.email,
      address: customer.address,
      status: customer.status || "Pending",
      leadStage: customer.leadStage || "New Lead",
      nextFollowUpDate: customer.nextFollowUpDate ? new Date(customer.nextFollowUpDate).toISOString().slice(0, 10) : "",
    });

    setShowForm(true);
  };


  const deleteCustomer = async (id) => {
    if (deletingId) return;

    const confirmDelete =
      window.confirm(
        "Are you sure you want to delete this customer?"
      );

    if (!confirmDelete) return;

    setDeletingId(id);
    try {

      await api.delete(
        `/customers/${id}`
      );

      toast.success("Customer deleted successfully.");
      setSelectedIds((current) => current.filter((selectedId) => selectedId !== id));

      await fetchCustomers();

    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to delete this customer.");
    } finally {
      setDeletingId(null);
    }
  };

  const currentPageSelected = customers.length > 0 && customers.every((customer) => selectedIds.includes(customer._id));
  const toggleCustomer = (id) => setSelectedIds((current) => current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]);
  const toggleCurrentPage = () => setSelectedIds((current) => currentPageSelected
    ? current.filter((id) => !customers.some((customer) => customer._id === id))
    : [...new Set([...current, ...customers.map((customer) => customer._id)])]);


  return (

    <div className="space-y-7 sm:space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">YOUR DIRECTORY <span className="ml-1 text-teal-600">/ RELATIONSHIPS</span></p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Customers</h1>
          <p className="mt-2 text-sm text-slate-500">Manage and keep track of your customer relationships.</p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button type="button" className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-crm-border bg-crm-surface px-4 py-3 text-sm font-semibold text-crm-primary transition hover:bg-crm-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-primary sm:w-auto" onClick={() => setShowExport(true)}>
            <Download size={17} aria-hidden="true" /> Export{selectedIds.length ? ` (${selectedIds.length})` : ""}
          </button>
          <button
            type="button"
            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-crm-primary px-5 py-3 font-semibold text-white shadow-sm transition duration-200 hover:bg-crm-primary-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 sm:w-auto"
            onClick={() => {
              setEditingCustomer(null);
              setForm(emptyForm());
              setShowForm(true);
            }}
          >
            <Plus size={18} aria-hidden="true" /> Add customer
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-crm-border bg-crm-surface p-4 shadow-sm shadow-slate-900/[0.025] sm:flex-row sm:items-center sm:p-5">
        <label className="relative w-full sm:flex-1">
          <span className="sr-only">Search customers by name, email, or phone</span>
          <Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            aria-label="Search customers by name, email, or phone"
            className="w-full rounded-xl border border-crm-border bg-crm-content py-3 pl-10 pr-4 text-sm text-crm-text outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
            placeholder="Search name, email or phone..."
            value={search}
            onChange={(e) => { setPage(1); setSearch(e.target.value); }}
          />
        </label>

        <select
          aria-label="Filter customers by status"
          className="rounded-xl border border-crm-border bg-crm-surface px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 sm:min-w-40"
          value={status}
          onChange={(e) => { setPage(1); setStatus(e.target.value); }}
        >
          <option>All</option>
          <option>Active</option>
          <option>Pending</option>
          <option>Inactive</option>
        </select>
        <select aria-label="Filter by lead stage" className="rounded-xl border border-crm-border bg-crm-surface px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" value={leadStage} onChange={(e) => { setPage(1); setLeadStage(e.target.value); }}>
          <option value="All">All lead stages</option>{["New Lead", "Contacted", "Qualified", "Proposal Sent", "Won", "Lost"].map((stage) => <option key={stage}>{stage}</option>)}
        </select>
        <label className="sr-only" htmlFor="customer-sort">Sort customers</label>
        <select id="customer-sort" className="rounded-xl border border-crm-border bg-crm-surface px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" value={`${sortBy}:${sortOrder}`} onChange={(e) => { const [field, order] = e.target.value.split(":"); setPage(1); setSortBy(field); setSortOrder(order); }}>
          <option value="createdAt:desc">Newest first</option><option value="createdAt:asc">Oldest first</option><option value="name:asc">Name A–Z</option><option value="name:desc">Name Z–A</option>
        </select>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm" role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget && !isSubmitting) setShowForm(false); }}>
          <div aria-labelledby="customer-form-title" aria-modal="true" className="my-auto max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-crm-border bg-crm-surface p-5 shadow-xl shadow-slate-950/10 sm:p-7" role="dialog">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">CUSTOMER RECORD <span className="ml-1 text-teal-600">/ DETAILS</span></p>
                <h2 id="customer-form-title" className="mt-1 text-xl font-bold tracking-tight text-slate-900">
                  {editingCustomer ? "Edit Customer" : "Add Customer"}
                </h2>
              </div>
              <button aria-label="Close customer form" type="button" disabled={isSubmitting} className="crm-hover-control rounded-xl border border-transparent p-2 text-slate-500 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => { setShowForm(false); setEditingCustomer(null); }}>
                <X size={18} aria-hidden="true" />
              </button>
            </div>

          <form className="grid gap-4 sm:grid-cols-2" onSubmit={submitCustomer}>
            <input
              className="rounded-xl border border-crm-border bg-crm-content px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
              name="name"
              placeholder="Full name"
              aria-label="Full name"
              required
              value={form.name}
              onChange={handleChange}
            />

            <PhoneInput value={form.phone} onChange={(phone) => setForm({ ...form, phone })} required />

            <input
              className="rounded-xl border border-crm-border bg-crm-content px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
              name="email"
              type="email"
              placeholder="Email"
              aria-label="Email address"
              required
              value={form.email}
              onChange={handleChange}
            />

            <textarea
              className="min-h-24 rounded-xl border border-crm-border bg-crm-content px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
              name="address"
              placeholder="Address"
              aria-label="Address"
              required
              value={form.address}
              onChange={handleChange}
            />

            <input aria-label="Company name" className="rounded-xl border border-crm-border bg-crm-content px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" name="companyName" placeholder="Company name (optional)" value={form.companyName} onChange={handleChange} />
            <input aria-label="Job title" className="rounded-xl border border-crm-border bg-crm-content px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" name="jobTitle" placeholder="Job title" value={form.jobTitle} onChange={handleChange} />
            <input aria-label="Country" className="rounded-xl border border-crm-border bg-crm-content px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" name="country" placeholder="Country" value={form.country} onChange={handleChange} />
            <input aria-label="State" className="rounded-xl border border-crm-border bg-crm-content px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" name="state" placeholder="State" value={form.state} onChange={handleChange} />
            <input aria-label="City" className="rounded-xl border border-crm-border bg-crm-content px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" name="city" placeholder="City" value={form.city} onChange={handleChange} />
            <input aria-label="Lead source" className="rounded-xl border border-crm-border bg-crm-content px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" name="leadSource" placeholder="Lead source" value={form.leadSource} onChange={handleChange} />
            <select aria-label="Customer account status" className="rounded-xl border border-crm-border bg-crm-content px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" name="status" value={form.status} onChange={handleChange}>
              <option>Active</option>
              <option>Pending</option>
              <option>Inactive</option>
            </select>
            <select aria-label="Lead stage" className="rounded-xl border border-crm-border bg-crm-content px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" name="leadStage" value={form.leadStage} onChange={handleChange}>{["New Lead", "Contacted", "Qualified", "Proposal Sent", "Won", "Lost"].map((stage) => <option key={stage}>{stage}</option>)}</select>
            <select aria-label="Priority" className="rounded-xl border border-crm-border bg-crm-content px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" name="priority" value={form.priority} onChange={handleChange}>{["Low", "Normal", "High"].map((priority) => <option key={priority}>{priority}</option>)}</select>
            <label className="text-xs font-medium text-crm-muted">Next follow-up<input aria-label="Next follow-up date" className="mt-1 w-full rounded-xl border border-crm-border bg-crm-content px-4 py-3 text-sm text-crm-text" name="nextFollowUpDate" type="date" value={form.nextFollowUpDate || ""} onChange={handleChange} /></label>
            <textarea aria-label="Notes" className="min-h-20 rounded-xl border border-crm-border bg-crm-content px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 sm:col-span-2" name="notes" placeholder="Notes" value={form.notes} onChange={handleChange} />

            <div className="mt-2 flex flex-col-reverse justify-end gap-3 sm:col-span-2 sm:flex-row">
              <button
                type="button"
                disabled={isSubmitting}
                className="cursor-pointer rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                onClick={() => {
                  setShowForm(false);
                  setEditingCustomer(null);
                  setForm(emptyForm());
                }}
              >
                Cancel
              </button>

              <button
                disabled={isSubmitting}
                type="submit"
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-crm-primary px-5 py-3 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-crm-primary-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting && <ClipLoader aria-label="Saving customer" color="#ffffff" size={17} />}
                {isSubmitting ? "Saving..." : editingCustomer ? "Update Customer" : "Add Customer"}
              </button>
            </div>
          </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-crm-border bg-crm-surface shadow-sm"><Loader message="Loading customers..." /></div>
      ) : listError ? (
        <div className="rounded-2xl border border-rose-200 bg-crm-error-bg p-5 text-sm text-crm-error" role="alert">
          <p>{listError}</p>
          <button className="mt-3 font-semibold underline underline-offset-4" onClick={fetchCustomers}>Try again</button>
        </div>
      ) : <div className="overflow-hidden rounded-3xl border border-crm-border bg-crm-surface shadow-sm shadow-slate-900/[0.035]">
        <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-crm-content text-[11px] font-bold uppercase tracking-[0.14em] text-crm-muted">
            <tr>
              <th className="px-4 py-4"><input aria-label="Select all customers on this page" type="checkbox" checked={currentPageSelected} onChange={toggleCurrentPage} /></th>
              <th className="px-5 py-4">Name</th>
              <th className="px-5 py-4">Company</th>
              <th className="px-5 py-4">Phone</th>
              <th className="px-5 py-4">Email</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Lead stage</th>
              <th className="px-5 py-4">Date added</th>
              <th className="px-5 py-4">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {customers.map((customer) => (
              <tr className="transition-colors duration-150 hover:bg-indigo-50/50" key={customer._id}>
                <td className="px-4 py-4"><input aria-label={`Select ${customer.name}`} type="checkbox" checked={selectedIds.includes(customer._id)} onChange={() => toggleCustomer(customer._id)} /></td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-sm font-bold text-crm-primary ring-1 ring-indigo-200">
                      {customer.name?.trim()?.charAt(0)?.toUpperCase() || "?"}
                    </span>
                    <span className="font-semibold text-slate-900">{customer.name}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-slate-600">{customer.companyName || "—"}</td>
                <td className="px-5 py-4 text-slate-600">{customer.phone}</td>
                <td className="px-5 py-4 text-slate-600">{customer.email}</td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${customer.status === "Active" ? "bg-crm-success-bg text-crm-success ring-green-200" : customer.status === "Inactive" ? "bg-slate-100 text-slate-600 ring-slate-200" : "bg-crm-warning-bg text-crm-warning ring-amber-200"}`}
                  >
                    {customer.status}
                  </span>
                </td>
                <td className="px-5 py-4"><span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">{customer.leadStage || "New Lead"}</span></td>
                <td className="px-5 py-4 text-slate-500">
                  {new Date(customer.createdAt).toLocaleDateString()}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <Link
                      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      to={`/customers/${customer._id}`}
                    >
                      <Users size={14} aria-hidden="true" /> View
                    </Link>

                    <button
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      onClick={() => editCustomer(customer)}
                    >
                      <Pencil size={13} aria-hidden="true" /> Edit
                    </button>

                    <button
                      disabled={deletingId === customer._id}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-crm-error transition hover:bg-crm-error-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => deleteCustomer(customer._id)}
                    >
                      {deletingId === customer._id ? <ClipLoader aria-label="Deleting customer" color="#BE123C" size={13} /> : <Trash2 size={13} aria-hidden="true" />} {deletingId === customer._id ? "Deleting" : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr><td colSpan="9" className="px-5 py-14 text-center">
                <p className="font-semibold text-slate-800">No customers found</p>
                <p className="mt-1 text-sm text-slate-500">Try changing your search or status filter, or add a customer to get started.</p>
              </td></tr>
            )}
          </tbody>
        </table>
        </div>
        <div className="divide-y divide-crm-border md:hidden">
          {customers.length ? customers.map((customer) => <article key={customer._id} className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-2"><input aria-label={`Select ${customer.name}`} className="mt-1" type="checkbox" checked={selectedIds.includes(customer._id)} onChange={() => toggleCustomer(customer._id)} /><div className="min-w-0"><h3 className="truncate font-semibold text-crm-text">{customer.name}</h3><p className="truncate text-sm text-crm-muted">{customer.companyName || customer.email}</p></div></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${customer.status === "Active" ? "bg-crm-success-bg text-crm-success" : customer.status === "Inactive" ? "bg-slate-100 text-slate-600" : "bg-crm-warning-bg text-crm-warning"}`}>{customer.status || "Pending"}</span></div>
            <p className="text-sm text-slate-600">{customer.phone} · {customer.email}</p>
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">{customer.leadStage || "New Lead"}</span><div className="flex gap-1"><Link aria-label={`View ${customer.name}`} className="rounded-lg border border-crm-border px-2.5 py-2 text-xs font-semibold text-crm-primary" to={`/customers/${customer._id}`}>View</Link><button type="button" className="rounded-lg border border-indigo-200 px-2.5 py-2 text-xs font-semibold text-indigo-700" onClick={() => editCustomer(customer)}>Edit</button><button type="button" disabled={deletingId === customer._id} className="rounded-lg border border-rose-200 px-2.5 py-2 text-xs font-semibold text-crm-error disabled:opacity-50" onClick={() => deleteCustomer(customer._id)}>Delete</button></div></div>
          </article>) : <p className="px-5 py-12 text-center text-sm text-crm-muted">No customers match these filters. Try adjusting your search or add a customer.</p>}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-crm-border px-4 py-3 text-sm text-crm-muted">
          <span>{pagination.total} customers · Page {pagination.page} of {Math.max(pagination.pages, 1)}</span>
          <div className="flex gap-2">
            <button type="button" aria-label="Previous page" disabled={page <= 1 || loading} className="inline-flex items-center gap-1 rounded-lg border border-crm-border px-3 py-2 font-medium text-crm-text disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setPage((current) => Math.max(current - 1, 1))}><ChevronLeft size={15} /> Previous</button>
            <button type="button" aria-label="Next page" disabled={page >= pagination.pages || loading} className="inline-flex items-center gap-1 rounded-lg border border-crm-border px-3 py-2 font-medium text-crm-text disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setPage((current) => current + 1)}>Next <ChevronRight size={15} /></button>
          </div>
        </div>
      </div>}
      <ExportDialog open={showExport} onClose={() => setShowExport(false)} search={search} status={status} leadStage={leadStage} selectedIds={selectedIds} />
    </div>
  );
}

export default Customers;
