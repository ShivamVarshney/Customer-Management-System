import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { BarChart3, LayoutDashboard, LogOut, Users } from "lucide-react";
import { Toaster } from "sonner";
import { ThemeProvider } from "./components/ThemeProvider";
import ThemeCustomizer from "./components/ThemeCustomizer";
import WorkspaceSwitcher from "./components/WorkspaceSwitcher";
import { WorkspaceProvider } from "./components/WorkspaceProvider";
import { useWorkspace } from "./components/useWorkspace";
import { ACTIVE_WORKSPACE_STORAGE_KEY } from "./components/workspaceStorage";
import api from "./api";
import Loader from "./components/Loader";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import Customers from "./pages/Customers";
import CustomerDetails from "./pages/CustomerDetails";

function ProtectedLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { status: workspaceStatus, error: workspaceError, refresh: refreshWorkspaces, activeWorkspace } = useWorkspace();
  let user = {};
  try {
    user = JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    localStorage.removeItem("user");
  }

  useEffect(() => {
    const handleSessionExpired = () => {
      navigate("/login", { replace: true, state: { sessionExpired: true } });
    };

    window.addEventListener("auth:session-expired", handleSessionExpired);
    return () => window.removeEventListener("auth:session-expired", handleSessionExpired);
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem(ACTIVE_WORKSPACE_STORAGE_KEY);
    navigate("/login", { state: { loggedOut: true } });
  };

  if (workspaceStatus === "loading") return <Loader fullScreen message="Loading your workspace..." />;

  if (workspaceStatus === "error") {
    return (
      <main className="grid min-h-screen place-items-center bg-crm-app px-4">
        <section className="max-w-md rounded-2xl border border-crm-border bg-crm-surface p-7 text-center shadow-sm">
          <h1 className="text-lg font-bold text-crm-text">Can&apos;t load your workspaces</h1>
          <p className="mt-2 text-sm leading-6 text-crm-muted">{workspaceError}</p>
          <button className="mt-5 rounded-xl bg-crm-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-crm-primary-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200" onClick={refreshWorkspaces}>Try again</button>
        </section>
      </main>
    );
  }

  const navLink = (path) => {
    const active = path === "/" ? location.pathname === path : location.pathname.startsWith(path);
    return `group relative flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 lg:justify-start lg:gap-3 lg:px-4 ${active ? "bg-indigo-50 text-crm-primary shadow-sm ring-1 ring-indigo-100" : "text-crm-muted hover:bg-crm-content hover:text-crm-text"}`;
  };

  return (
    <div className="min-h-screen bg-crm-app text-crm-text">
      <aside className="fixed inset-x-0 bottom-0 z-40 border-t border-crm-border bg-crm-surface px-3 py-2 shadow-[0_-8px_30px_-18px_rgba(15,23,42,0.16)] lg:inset-y-0 lg:left-0 lg:right-auto lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-t-0 lg:px-5 lg:py-6 lg:shadow-sm">
        <Link className="mb-10 hidden items-center gap-3 rounded-xl px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 lg:flex" to="/">
          <span className="grid size-11 place-items-center rounded-2xl bg-crm-primary text-lg font-black text-white shadow-md shadow-indigo-200">C</span>
          <span className="min-w-0">
            <span className="block text-lg font-bold tracking-tight text-slate-900">CustomerHub</span>
            <span className="block text-xs font-medium text-slate-500">Customer workspace</span>
          </span>
        </Link>

        <p className="mb-3 hidden px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 lg:block">Workspace</p>
        <nav aria-label="Main navigation" className="mx-auto grid max-w-md grid-cols-3 gap-2 lg:mx-0 lg:max-w-none lg:grid-cols-1">
          <Link aria-current={location.pathname === "/" ? "page" : undefined} className={navLink("/")} to="/">
            {location.pathname === "/" && <span aria-hidden="true" className="absolute left-0 top-1/2 hidden h-6 w-1 -translate-y-1/2 rounded-r-full bg-indigo-600 lg:block" />}
            <LayoutDashboard size={18} aria-hidden="true" className={location.pathname === "/" ? "text-indigo-600" : "text-slate-400 transition-colors group-hover:text-indigo-600"} />
            Dashboard
          </Link>
          <Link aria-current={location.pathname.startsWith("/customers") ? "page" : undefined} className={navLink("/customers")} to="/customers">
            {location.pathname.startsWith("/customers") && <span aria-hidden="true" className="absolute left-0 top-1/2 hidden h-6 w-1 -translate-y-1/2 rounded-r-full bg-crm-primary lg:block" />}
            <Users size={18} aria-hidden="true" className={location.pathname.startsWith("/customers") ? "text-crm-primary" : "text-slate-400 transition-colors group-hover:text-crm-primary"} />
            Customers
          </Link>
          <Link aria-current={location.pathname === "/analytics" ? "page" : undefined} className={navLink("/analytics")} to="/analytics">
            {location.pathname === "/analytics" && <span aria-hidden="true" className="absolute left-0 top-1/2 hidden h-6 w-1 -translate-y-1/2 rounded-r-full bg-crm-primary lg:block" />}
            <BarChart3 size={18} aria-hidden="true" className={location.pathname === "/analytics" ? "text-crm-primary" : "text-slate-400 transition-colors group-hover:text-crm-primary"} />
            Analytics
          </Link>
        </nav>

        <div className="mt-auto hidden rounded-2xl border border-crm-border bg-crm-content p-4 lg:block">
          <p className="text-sm font-semibold text-slate-800">Your workspace</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">Customer records stay organized in one clear view.</p>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-64">
        <header className="sticky top-0 z-50 border-b border-crm-border bg-crm-surface">
          <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:min-h-[72px] lg:px-8">
            <Link className="inline-flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 lg:hidden" to="/">
              <span className="grid size-9 place-items-center rounded-xl bg-crm-primary text-sm font-black text-white">C</span>
              <span className="text-base font-bold tracking-tight text-slate-900">CustomerHub</span>
            </Link>
            <div className="hidden lg:block">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">Customer management</p>
              <p className="mt-0.5 text-sm text-slate-500">A focused view of your customer relationships</p>
            </div>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <WorkspaceSwitcher />
              <ThemeCustomizer />
              <span className="hidden max-w-56 truncate rounded-full bg-crm-content px-3 py-2 text-sm font-medium text-crm-muted ring-1 ring-crm-border sm:block">{user.email}</span>
              <button className="crm-hover-danger-control inline-flex cursor-pointer items-center gap-2 rounded-xl border border-crm-border bg-crm-surface px-3 py-2 text-sm font-semibold text-crm-error transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-primary active:scale-[0.98]" onClick={logout}>
                <LogOut size={16} aria-hidden="true" /> <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>
        </header>
        <main className="mx-auto min-h-[calc(100vh-4rem)] w-full max-w-7xl bg-crm-content px-4 py-6 pb-24 sm:px-6 sm:py-8 lg:px-8 lg:pb-8"><div key={activeWorkspace.id}>{children}</div></main>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState(() => localStorage.getItem("token") ? "checking" : "logged-out");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      setStatus("logged-out");
      return undefined;
    }

    const controller = new AbortController();
    setStatus("checking");

    api.get("/dashboard/stats", { signal: controller.signal })
      .then(() => setStatus("authenticated"))
      .catch((error) => {
        if (controller.signal.aborted) return;

        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          localStorage.removeItem(ACTIVE_WORKSPACE_STORAGE_KEY);
          setStatus("logged-out");
          navigate("/login", { replace: true, state: { sessionExpired: true } });
          return;
        }

        if (error.response?.status === 403 && localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY)) {
          localStorage.removeItem(ACTIVE_WORKSPACE_STORAGE_KEY);
          setAttempt((value) => value + 1);
          return;
        }

        setStatus("error");
      });

    return () => controller.abort();
  }, [attempt, navigate]);

  if (!localStorage.getItem("token")) {
    return <Navigate to="/login" replace state={{ loggedOut: true, from: location.pathname }} />;
  }

  if (status === "checking") {
    return <Loader fullScreen message="Verifying your session..." />;
  }

  if (status === "error") {
    return (
      <main className="grid min-h-screen place-items-center bg-crm-app px-4">
        <section className="max-w-md rounded-2xl border border-crm-border bg-crm-surface p-7 text-center shadow-sm">
          <h1 className="text-lg font-bold text-crm-text">Can&apos;t verify your session</h1>
          <p className="mt-2 text-sm leading-6 text-crm-muted">The service could not be reached. Your sign-in has not been cleared. Check your connection and try again.</p>
          <button className="mt-5 rounded-xl bg-crm-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-crm-primary-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200" onClick={() => setAttempt((value) => value + 1)}>Try again</button>
        </section>
      </main>
    );
  }

  return status === "authenticated" ? <WorkspaceProvider><ProtectedLayout>{children}</ProtectedLayout></WorkspaceProvider> : <Loader fullScreen message="Signing out..." />;
}

export default function App() {
  return (
    <ThemeProvider>
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          classNames: {
            toast: "border border-crm-border border-l-4 bg-crm-surface text-crm-text shadow-lg shadow-slate-900/5",
            success: "border-l-crm-success",
            error: "border-l-crm-error",
            warning: "border-l-crm-warning",
            info: "border-l-crm-blue",
            description: "text-crm-muted",
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<><div className="fixed right-4 top-4 z-50"><ThemeCustomizer /></div><Login /></>} />
        <Route path="/register" element={<><div className="fixed right-4 top-4 z-50"><ThemeCustomizer /></div><Register /></>} />

        <Route
          path="/customers"
          element={
            <ProtectedRoute>
              <Customers />
            </ProtectedRoute>
          }
        />

        <Route
          path="/customers/:id"
          element={
            <ProtectedRoute>
              <CustomerDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          }
        />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
    </ThemeProvider>
  );
}
