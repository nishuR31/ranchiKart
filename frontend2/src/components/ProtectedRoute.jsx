import { Navigate } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";
import { PageLoader } from "./Loaders";

export function RequireAuth({ children }) {
  const { user, isCheckingAuth } = useAuthStore();
  
  if (isCheckingAuth) return <PageLoader text="Verifying your session…" />;
  if (!user) return <Navigate to="/auth" replace />;
  
  return children;
}

export function RequireAdmin({ children }) {
  const { user, isCheckingAuth, isAdmin } = useAuthStore();
  
  if (isCheckingAuth) return <PageLoader text="Verifying admin access…" />;
  
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin()) return <Navigate to="/" replace />;
  
  return children;
}
