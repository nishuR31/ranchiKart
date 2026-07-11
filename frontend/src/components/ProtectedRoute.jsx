import { Navigate } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";

export function RequireAuth({ children }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/auth" replace />;
  return children;
}

export function RequireAdmin({ children }) {
  const { token, isAdmin } = useAuthStore();
  if (!token) return <Navigate to="/auth" replace />;
  if (!isAdmin()) return <Navigate to="/" replace />;
  return children;
}
