import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { ClipLoader } from "react-spinners";
import { toast } from "sonner";
import api from "../api";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const registrationToastShown = useRef(false);

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!location.state?.registered || registrationToastShown.current) return;

    registrationToastShown.current = true;
    toast.success("Account created successfully! Please sign in.");

    const nextState = { ...location.state };
    delete nextState.registered;
    navigate(`${location.pathname}${location.search}${location.hash}`, {
      replace: true,
      state: Object.keys(nextState).length ? nextState : null,
    });
  }, [location.hash, location.pathname, location.search, location.state, navigate]);

  const change = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

 const submit = async (e) => {
  e.preventDefault();
  if (isSubmitting) return;
  setError("");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(form.email)) {
    return setError("Please enter a valid email address.");
  }

  setIsSubmitting(true);
  try {
    const { data } = await api.post("/auth/login", form);
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    navigate("/");
  } catch (err) {
    setError(err.response?.data?.message || "Login failed");
  } finally {
    setIsSubmitting(false);
  }
};

  const notice = location.state?.sessionExpired
    ? "Your session expired. Sign in again to continue."
    : location.state?.loggedOut
      ? "You are signed out."
        : "";

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-crm-app">
      <div className="relative mx-auto grid min-h-screen max-w-[1440px] lg:grid-cols-[1.05fr_0.95fr]">
        <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-indigo-500/20 bg-crm-primary p-12 text-white lg:flex xl:p-16">
          <div aria-hidden="true" className="absolute -right-24 -bottom-28 size-96 rounded-full border-[48px] border-white/10" />
          <Link className="relative inline-flex w-fit items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" to="/">
            <span className="grid size-11 place-items-center rounded-xl bg-white/15 text-lg font-black ring-1 ring-white/20">C</span>
            <span className="text-xl font-bold tracking-tight">CustomerHub</span>
          </Link>
          <div className="relative max-w-xl py-16">
            <span className="mb-5 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-100">Customer management, made clear</span>
            <h1 className="text-4xl leading-tight font-bold tracking-tight xl:text-5xl">Build stronger relationships, one customer at a time.</h1>
            <p className="mt-5 max-w-lg text-lg leading-8 text-indigo-100">Keep customer details organized, follow every status, and stay focused on the work that matters.</p>
            <div className="mt-10 flex items-center gap-3 text-sm text-indigo-100"><span className="grid size-8 place-items-center rounded-full bg-teal-300/20 text-teal-200">✓</span> Your customer workspace is ready when you are.</div>
          </div>
          <p className="relative text-sm text-indigo-200">A clear view of every customer connection.</p>
        </aside>

        <main className="flex items-center justify-center px-4 py-10 sm:px-8 lg:px-12">
          <section className="w-full max-w-md rounded-3xl border border-crm-border bg-crm-surface p-7 shadow-xl shadow-slate-900/5 sm:p-10">
            <Link className="mb-8 inline-flex items-center gap-2 rounded-lg text-sm font-bold text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 lg:hidden" to="/">
              <span className="grid size-9 place-items-center rounded-xl bg-crm-primary text-white">C</span> CustomerHub
            </Link>
            <div className="mb-8">
              <p className="text-sm font-semibold tracking-wide text-indigo-600">WELCOME BACK</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Sign in to your account</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Enter your details to continue to your workspace.</p>
            </div>

            {notice && <p role="status" className="mb-5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-800">{notice}</p>}

            <form className="space-y-5" onSubmit={submit}>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="login-email">Email address</label>
                <input className="w-full rounded-xl border border-crm-border bg-crm-content px-4 py-3 text-crm-text outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  id="login-email" type="email" name="email" placeholder="you@example.com" value={form.email} onChange={change} required autoComplete="email" />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="login-password">Password</label>
                <div className="relative">
                  <input className="w-full rounded-xl border border-crm-border bg-crm-content px-4 py-3 pr-12 text-crm-text outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                    id="login-password" type={showPassword ? "text" : "password"} name="password" placeholder="Enter your password" value={form.password} onChange={change} required autoComplete="current-password" />
                  <button aria-label={showPassword ? "Hide password" : "Show password"} type="button" className="absolute inset-y-0 right-0 inline-flex items-center rounded-r-xl px-4 text-slate-500 transition hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </div>

              {error && <div role="alert" className="rounded-xl border border-rose-200 bg-crm-error-bg px-4 py-3 text-sm font-medium text-crm-error">{error}</div>}

              <button disabled={isSubmitting} type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-crm-primary px-4 py-3.5 font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-crm-primary-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-70">
                {isSubmitting && <ClipLoader aria-label="Signing in" color="#ffffff" size={18} />}
                {isSubmitting ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <p className="mt-7 text-center text-sm text-crm-muted">Don&apos;t have an account? <Link className="font-semibold text-crm-primary underline-offset-4 hover:text-crm-primary-hover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" to="/register">Create one</Link></p>
          </section>
        </main>
      </div>
    </div>
  );
}
