import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth.store";
import { SEOHead } from "../components/SEOHead";

function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const error = useAuthStore((s) => s.error);
  const status = useAuthStore((s) => s.status);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await register(name, email, password);
      navigate("/dashboard");
    } catch {
      // error is already surfaced via the store's `error` field
    }
  }

  return (
    <div className="min-h-screen bg-[#070A0F] text-slate-100 flex items-center justify-center px-4 selection:bg-white/20">
      <SEOHead
        title="Create Account | Knotrun Studio"
        description="Create your Knotrun Studio account to orchestrate high-performance DAG workflows and manage custom integrations."
        canonicalUrl="https://studio.knotrun.io/register"
      />
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono font-medium text-slate-300">
            <span>Knotrun STUDIO // REGISTER</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-['Space_Grotesk']">
            Create an Account
          </h1>
          <p className="text-xs text-slate-400">
            Set up your organization workspace on Knotrun Studio
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 bg-[#0B111E]/95 border border-white/15 rounded-2xl p-7 shadow-2xl backdrop-blur-xl"
        >
          {error && (
            <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-xl px-3.5 py-2.5 font-mono">
              {error}
            </p>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-300">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl bg-slate-900/90 border border-white/15 px-3.5 py-2.5 text-xs text-white outline-none focus:border-white/40 transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-300">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl bg-slate-900/90 border border-white/15 px-3.5 py-2.5 text-xs text-white outline-none focus:border-white/40 transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-300">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl bg-slate-900/90 border border-white/15 px-3.5 py-2.5 text-xs text-white outline-none focus:border-white/40 transition"
            />
          </div>

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full rounded-xl bg-white hover:bg-slate-200 text-slate-950 px-4 py-3 text-xs font-mono font-bold tracking-wider uppercase transition shadow-md disabled:opacity-50 mt-2"
          >
            {status === "loading" ? "Creating account..." : "Sign Up"}
          </button>

          <p className="text-xs text-center text-slate-400 pt-2 font-mono">
            Already have an account?{" "}
            <Link to="/login" className="text-white hover:underline font-semibold">
              Log in
            </Link>
          </p>
        </form>

        <div className="flex items-center justify-between text-xs font-mono text-slate-500">
          <a href="https://knotrun-landing.onrender.com" className="hover:text-slate-300 transition">
            &larr; 3D Site
          </a>
          <Link to="/privacy" className="hover:text-slate-300 transition">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
