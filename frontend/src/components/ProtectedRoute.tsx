import { ReactNode, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/auth.store";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const loginAsGuest = useAuthStore((s) => s.loginAsGuest);

  useEffect(() => {
    async function initAuth() {
      if (status === "idle") {
        await fetchMe();
      }
    }
    initAuth();
  }, [status, fetchMe]);

  useEffect(() => {
    // If not authenticated, automatically initialize as guest user!
    if (status === "unauthenticated" && !user) {
      loginAsGuest().catch((err) => {
        console.error("Auto guest login error:", err);
      });
    }
  }, [status, user, loginAsGuest]);

  if (status === "idle" || status === "loading") {
    return (
      <div className="min-h-screen bg-[#070A0F] text-slate-400 flex items-center justify-center font-mono text-xs">
        Initializing studio...
      </div>
    );
  }

  // If status is still unauthenticated (e.g. backend failed), redirect to login
  if (status === "unauthenticated" && !user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
