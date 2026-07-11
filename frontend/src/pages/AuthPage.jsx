import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";
import useShopStore from "../store/useShopStore";
import { extractError } from "../lib/api";

export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuthStore();
  const showToast = useShopStore((s) => s.showToast);
  const navigate = useNavigate();
  const location = useLocation();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else {
        await register(form);
      }
      showToast(mode === "login" ? "Welcome back!" : "Account created!");
      const redirectTo = location.state?.from || "/";
      navigate(redirectTo);
    } catch (err) {
      showToast(extractError(err, "Authentication failed"), "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>{mode === "login" ? "Login to RanchiKart" : "Create your account"}</h1>
        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <input
              required
              placeholder="Full Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          )}
          <input
            required
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          {mode === "register" && (
            <input
              placeholder="Phone Number"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          )}
          <input
            required
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? "Please wait…" : mode === "login" ? "Login" : "Create Account"}
          </button>
        </form>
        <p className="auth-switch">
          {mode === "login" ? (
            <>Don't have an account? <button onClick={() => setMode("register")}>Sign up</button></>
          ) : (
            <>Already have an account? <button onClick={() => setMode("login")}>Login</button></>
          )}
        </p>
        {mode === "login" && (
          <p className="auth-hint">Demo: demo@ranchikart.in / Demo@1234 · Admin: admin@ranchikart.in / Admin@1234</p>
        )}
      </div>
    </div>
  );
}
