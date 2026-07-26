import { Navigate } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";

export function RequireAuth({ children }) {
  const { user, isCheckingAuth } = useAuthStore();
  
  if (isCheckingAuth) {
    return (
      <div className="flex justify-center items-center h-screen">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }
  
  if (!user) return <Navigate to="/auth" replace />;
  
  return children;
}

export function RequireAdmin({ children }) {
  const { user, isCheckingAuth, isAdmin } = useAuthStore();
  
  if (isCheckingAuth) {
    return (
      <div className="flex justify-center items-center h-screen">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }
  
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin()) return <Navigate to="/" replace />;
  
  return children;
}
