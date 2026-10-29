import React from "react";
import { Link } from "react-router-dom";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { SEOHead } from "../components/SEOHead";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#070A0F] text-slate-100 flex flex-col justify-between selection:bg-white/20">
      <SEOHead
        title="404 — Page Not Found | Knotrun Studio"
        description="The requested workspace, workflow, or studio route does not exist in the Knotrun DAG pipeline registry."
        canonicalUrl="https://studio.knotrun.io/404"
      />

      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6 my-auto">
        <div className="flex justify-center">
          <Breadcrumbs items={[{ label: "404 Not Found" }]} />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
          <span>ROUTING ERROR 404</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            404 — Page Not Found
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-mono">
            The requested workflow editor route or workspace identifier was not found in the registry.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#0B111E] border border-white/10 text-left font-mono text-xs text-slate-400 space-y-1.5">
          <div className="text-slate-500">// Node diagnostic output</div>
          <div className="text-red-400">STATUS: 404 ROUTE_NOT_FOUND</div>
          <div className="text-slate-300">TARGET: {typeof window !== "undefined" ? window.location.pathname : "/unknown"}</div>
          <div className="text-emerald-400">RESOLUTION: Navigate back to the active Workspaces dashboard</div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            to="/dashboard"
            className="px-5 py-2.5 rounded-xl bg-white text-slate-950 font-mono text-xs font-bold uppercase transition hover:bg-slate-200"
          >
            Go to Workspaces
          </Link>
          <a
            href="http://localhost:3000"
            className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-300 font-mono text-xs font-medium uppercase transition"
          >
            Return to 3D Site
          </a>
        </div>
      </div>

      <footer className="border-t border-white/10 py-6 text-center text-xs font-mono text-slate-500">
        <div className="flex items-center justify-center gap-4">
          <Link to="/dashboard" className="hover:text-slate-300 transition">Workspaces</Link>
          <Link to="/login" className="hover:text-slate-300 transition">Login</Link>
          <Link to="/privacy" className="hover:text-slate-300 transition">Privacy Policy</Link>
        </div>
      </footer>
    </div>
  );
}
