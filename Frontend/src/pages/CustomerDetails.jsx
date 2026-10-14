import { createElement, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, CalendarDays, Mail, MapPin, Phone, UserRound, Building2, BriefcaseBusiness, Flag, NotebookPen, CalendarClock, Target } from "lucide-react";
import api from "../api";
import Loader from "../components/Loader";

function CustomerDetails() {

  const { id } = useParams();

  const [customer, setCustomer] =
    useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    const fetchCustomer = async () => {
      setLoading(true);
      setError("");
      setCustomer(null);

      try {

        const response =
          await api.get(`/customers/${id}`);

        setCustomer(response.data.customer);

      } catch (error) {
        setError(
          error.response?.data?.message || "Unable to load this customer."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();

  }, [id]);


  if (loading) {
    return <Loader fullScreen message="Loading customer details..." />;
  }

  if (error || !customer) {
    return (
      <div className="space-y-6">
        <Link className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm transition duration-200 hover:border-indigo-200 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" to="/customers">
          <ArrowLeft size={17} aria-hidden="true" /> Back to customers
        </Link>
        <section className="rounded-3xl border border-rose-200 bg-crm-surface p-8 shadow-sm">
          <span className="grid size-12 place-items-center rounded-2xl bg-crm-error-bg text-crm-error"><UserRound size={22} aria-hidden="true" /></span>
          <h1 className="mt-4 text-xl font-bold text-slate-900">Customer details unavailable</h1>
          <p role="alert" className="mt-2 text-sm leading-6 text-crm-error">{error || "Customer not found."}</p>
        </section>
      </div>
    );
  }


  return (

    <div className="space-y-6">
      <Link className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm transition duration-200 hover:border-indigo-200 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" to="/customers">
        <ArrowLeft size={17} aria-hidden="true" /> Back to customers
      </Link>

      <section className="overflow-hidden rounded-3xl border border-crm-border bg-crm-surface shadow-sm shadow-slate-900/[0.035]">
        <div className="relative overflow-hidden bg-crm-primary px-6 py-8 text-white sm:px-9 sm:py-10">
          <div aria-hidden="true" className="absolute -right-10 -top-24 size-64 rounded-full border-[34px] border-white/10" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-white/15 text-2xl font-bold ring-1 ring-white/25">{customer.name?.charAt(0)?.toUpperCase() || <UserRound size={25} aria-hidden="true" />}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-100">CUSTOMER PROFILE</p>
              <h1 className="mt-1 break-words text-2xl font-bold tracking-tight sm:text-3xl">{customer.name}</h1>
              <p className="mt-2 break-all text-sm text-indigo-100">{customer.email}</p>
            </div>
            <div className="flex flex-wrap gap-2"><span className={`inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset ${customer.status === "Active" ? "bg-crm-success-bg text-crm-success ring-green-200" : customer.status === "Inactive" ? "bg-slate-100 text-slate-700 ring-slate-200" : "bg-crm-warning-bg text-crm-warning ring-amber-200"}`}>{customer.status || "Pending"}</span><span className="inline-flex w-fit rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold ring-1 ring-white/25">{customer.leadStage || "New Lead"}</span></div>
          </div>
        </div>

        <div className="p-5 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">PROFILE DETAILS</p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Contact information</h2>
          <p className="mt-1 text-sm text-slate-500">Details associated with this customer record.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-crm-border bg-crm-surface p-5 transition duration-200 hover:border-indigo-200 hover:shadow-sm">
              <span className="grid size-10 place-items-center rounded-xl bg-indigo-100 text-indigo-700"><Mail size={18} aria-hidden="true" /></span>
              <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">Email address</p>
              <p className="mt-1 break-all text-sm font-semibold text-slate-900">{customer.email}</p>
            </div>
            <div className="rounded-2xl border border-crm-border bg-crm-surface p-5 transition duration-200 hover:border-teal-200 hover:shadow-sm">
              <span className="grid size-10 place-items-center rounded-xl bg-teal-100 text-teal-700"><Phone size={18} aria-hidden="true" /></span>
              <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">Phone number</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{customer.phone}</p>
            </div>
            <div className="rounded-2xl border border-crm-border bg-crm-surface p-5 transition duration-200 hover:border-blue-200 hover:shadow-sm">
              <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-crm-blue"><MapPin size={18} aria-hidden="true" /></span>
              <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">Address</p>
              <p className="mt-1 text-sm leading-6 font-semibold text-slate-900">{customer.address}</p>
            </div>
            <div className="rounded-2xl border border-crm-border bg-crm-surface p-5 transition duration-200 hover:border-amber-200 hover:shadow-sm">
              <span className="grid size-10 place-items-center rounded-xl bg-amber-100 text-amber-800"><CalendarDays size={18} aria-hidden="true" /></span>
              <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">Date added</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{new Date(customer.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          <h2 className="mt-8 text-lg font-bold tracking-tight text-slate-900">Lead &amp; company details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              [Building2, "Company", customer.companyName], [BriefcaseBusiness, "Job title", customer.jobTitle], [Target, "Lead source", customer.leadSource],
              [Flag, "Priority", customer.priority], [MapPin, "Location", [customer.city, customer.state, customer.country].filter(Boolean).join(", ")],
              [CalendarClock, "Next follow-up", customer.nextFollowUpDate ? new Date(customer.nextFollowUpDate).toLocaleDateString() : ""],
            ].filter(([, , value]) => value).map(([Icon, label, value]) => <div key={label} className="rounded-xl border border-crm-border bg-crm-content p-4"><span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-crm-muted">{createElement(Icon, { size: 15, "aria-hidden": true })}{label}</span><p className="mt-2 break-words text-sm font-semibold text-crm-text">{value}</p></div>)}
          </div>
          {customer.notes && <div className="mt-4 rounded-xl border border-crm-border bg-crm-content p-4"><p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-crm-muted"><NotebookPen size={15} aria-hidden="true" />Notes</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-crm-text">{customer.notes}</p></div>}
        </div>
      </section>
    </div>
  );
}

export default CustomerDetails;
