import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";
import useShopStore from "../store/useShopStore";
import api, { extractError } from "../lib/api";
import useSEO from "../lib/useSEO";
import { Mail, Fingerprint } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";

// ─────────────────────────────────────────────────────────────────────────────
// API contract (from backend routes):
//   POST /api/v1/auth/register  → { email, name, password, phone? }
//   POST /api/v1/auth/login     → { emailOrUsername, password }
//   POST /api/v1/auth/magic-link → { email }
//   GET  /api/v1/auth/google/login → redirects to Google OAuth
//   GET  /api/v1/auth/me        → returns current user (via cookie/token)
//   POST /api/v1/auth/logout    → clears session
// ─────────────────────────────────────────────────────────────────────────────

// ── Google G SVG icon ────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20" height="20" style={{ display: "block", flexShrink: 0 }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      <path fill="none" d="M0 0h48v48H0z"/>
    </svg>
  );
}

// ── Password strength helper ─────────────────────────────────────────────────
function passwordStrength(pw) {
  if (!pw) return { label: "", color: "transparent", width: 0 };
  const strong = pw.length >= 8 && /[A-Z]/.test(pw) && /[0-9]/.test(pw);
  const medium = pw.length >= 6;
  if (strong) return { label: "Strong", color: "#388e3c", width: 100 };
  if (medium) return { label: "Fair", color: "#f57c00", width: 55 };
  return { label: "Weak", color: "#d32f2f", width: 25 };
}

// ── Eye icon (show/hide password) ───────────────────────────────────────────
function EyeIcon({ open }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

export default function AuthPage() {
  useSEO({ title: "Login or Sign Up", description: "Sign in to your RanchiKart account." });

  const [mode, setMode] = useState("login");   // "login" | "register" | "magic"
  const [form, setForm] = useState({ name: "", emailOrUsername: "", password: "", phone: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  
  // Multi-factor Auth
  const [requireTotp, setRequireTotp] = useState(false);
  const [totpToken, setTotpToken] = useState("");

  const { login, register, fetchUser } = useAuthStore();
  const showToast = useShopStore((s) => s.showToast);
  const navigate = useNavigate();
  const location = useLocation();

  // Handle OAuth redirect back (Google puts token in ?token= or #token=)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    let token = params.get("token");
    let refreshToken = params.get("refreshToken");
    const error = params.get("error");

    if (!token && location.hash) {
      const hashParams = new URLSearchParams(location.hash.substring(1));
      token = hashParams.get("token");
      refreshToken = hashParams.get("refreshToken");
    }

    if (token) {
      useAuthStore.setState({ token, refreshToken });
      fetchUser().then(() => {
        showToast("Logged in with Google!");
        navigate(location.state?.from || "/", { replace: true });
      }).catch(() => showToast("Google login failed", "error"));
    } else if (error) {
      showToast(decodeURIComponent(error), "error");
    }
  }, []);

  // Reset to "login" mode whenever the user explicitly navigates to /auth
  useEffect(() => {
    if (location.pathname === "/auth") {
      setMode("login");
      setMagicSent(false);
    }
  }, [location.key]);

  function setField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const pw = form.password;
  const pwStr = mode === "register" ? passwordStrength(pw) : null;

  // ── Google OAuth ────────────────────────────────────────────────────────
  function handleGoogleLogin() {
    window.location.href = `/api/v1/auth/google/login`;
  }

  // ── Magic Link ───────────────────────────────────────────────────────────
  async function handleMagicLink(e) {
    e.preventDefault();
    if (!form.emailOrUsername) return showToast("Enter your email or username first", "error");
    setLoading(true);
    try {
      await api.post("/auth/magic-link", { emailOrUsername: form.emailOrUsername });
      setMagicSent(true);
    } catch (err) {
      showToast(extractError(err, "Failed to send magic link"), "error");
    } finally {
      setLoading(false);
    }
  }

  // ── Login / Register ─────────────────────────────────────────────────────
  // Backend:
  //   Login:    { emailOrUsername, password }
  //   Register: { email, name, password, phone? }
  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const result = await login(form.emailOrUsername, form.password, requireTotp ? totpToken : undefined);
        if (result?.requireTotp) {
          setRequireTotp(true);
          showToast("Please enter your Authenticator App code", "info");
          return; // Don't navigate yet
        }
        showToast("Welcome back!");
      } else {
        await register({
          email: form.emailOrUsername,
          name: form.name,
          password: form.password,
          phone: form.phone || undefined,
        });
        showToast("Account created! Welcome to RanchiKart");
      }
      navigate(location.state?.from || "/");
    } catch (err) {
      showToast(extractError(err, "Authentication failed"), "error");
    } finally {
      setLoading(false);
    }
  }

  // ── Passkey Login ────────────────────────────────────────────────────────
  async function handlePasskeyLogin() {
    if (!form.emailOrUsername) return showToast("Enter your email or username first", "error");
    setLoading(true);
    try {
      // 1. Get options from server
      const { data: options } = await api.post("/auth/passkey/login", { emailOrUsername: form.emailOrUsername });
      // 2. Call browser WebAuthn API
      const assertion = await startAuthentication(options);
      // 3. Verify assertion with server
      const { data: result } = await api.post("/auth/passkey/login/verify", assertion);
      // 4. Save session manually (since we bypassed useAuthStore.login)
      useAuthStore.setState({
        token: result.tokens?.accessToken,
        refreshToken: result.tokens?.refreshToken,
        user: result.user,
      });
      showToast("Signed in with Passkey!");
      navigate(location.state?.from || "/");
    } catch (err) {
      showToast(extractError(err, "Passkey login failed or cancelled"), "error");
    } finally {
      setLoading(false);
    }
  }

  const isMagicMode = mode === "magic";
  const isRegister = mode === "register";

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* ── Logo ── */}
        <Link to="/" className="auth-logo">
          Ranchi<span>Kart</span>
        </Link>

        {/* ── Mode heading ── */}
        <h1>
          {isMagicMode
            ? "Sign in with Magic Link"
            : isRegister
            ? "Create your account"
            : "Sign in to RanchiKart"}
        </h1>

        {/* ── Social / Passkey buttons ── */}
        {!isMagicMode && (
          <div style={{ display: "flex", gap: "10px", flexDirection: "column" }}>
            <button className="btn-google" type="button" onClick={handleGoogleLogin}>
              <GoogleIcon />
              Continue with Google
            </button>
            {mode === "login" && (
              <>
                <button className="btn-google" style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }} type="button" onClick={handlePasskeyLogin}>
                  <Fingerprint size={20} />
                  Sign in with Passkey
                </button>
                <button className="btn-google" style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }} type="button" onClick={() => setMode("magic")}>
                  <Mail size={20} strokeWidth={1.5} />
                  Sign in with Magic Link
                </button>
              </>
            )}
          </div>
        )}

        {/* ── OR divider ── */}
        {!isMagicMode && (
          <div className="auth-divider">
            <span>or</span>
          </div>
        )}

        {/* ── Magic Link sent state ── */}
        {isMagicMode && magicSent ? (
          <div className="magic-sent">
            <div className="magic-sent-icon"><Mail size={40} strokeWidth={1} /></div>
            <h3>Check your inbox!</h3>
            <p>We sent a login link to <strong>{form.emailOrUsername}</strong></p>
            <button className="btn btn-outline btn-sm" onClick={() => { setMagicSent(false); setMode("login"); }}>
              Back to login
            </button>
          </div>
        ) : (
          /* ── Form ── */
          <form onSubmit={isMagicMode ? handleMagicLink : handleSubmit} autoComplete="on">
            {isRegister && (
              <div className="auth-field">
                <label htmlFor="auth-name">Full Name</label>
                <input
                  id="auth-name"
                  required
                  autoComplete="name"
                  placeholder="Aarav Sharma"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                />
              </div>
            )}

            <div className="auth-field">
              <label htmlFor="auth-email">
                {isRegister ? "Email address" : "Email or Username"}
              </label>
              <input
                id="auth-email"
                required
                type={isRegister ? "email" : "text"}
                autoComplete={isRegister ? "email" : "username email"}
                placeholder={isRegister ? "you@example.com" : "email or @username"}
                value={form.emailOrUsername}
                onChange={(e) => setField("emailOrUsername", e.target.value)}
              />
            </div>

            {isRegister && (
              <div className="auth-field">
                <label htmlFor="auth-phone">Phone <span className="optional-label">(optional)</span></label>
                <input
                  id="auth-phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                />
              </div>
            )}

            {!isMagicMode && !requireTotp && (
              <div className="auth-field">
                <div className="auth-field-row">
                  <label htmlFor="auth-pw">Password</label>
                  {mode === "login" && (
                    <button
                      type="button"
                      className="forgot-link"
                      onClick={() => setMode("magic")}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="pw-wrapper">
                  <input
                    id="auth-pw"
                    required
                    type={showPw ? "text" : "password"}
                    autoComplete={isRegister ? "new-password" : "current-password"}
                    placeholder={isRegister ? "Min 8 chars, include a number" : "••••••••"}
                    minLength={isRegister ? 8 : undefined}
                    value={form.password}
                    onChange={(e) => setField("password", e.target.value)}
                  />
                  <button type="button" className="pw-eye" onClick={() => setShowPw((v) => !v)} tabIndex={-1}>
                    <EyeIcon open={showPw} />
                  </button>
                </div>
                {isRegister && pw && (
                  <div className="pw-strength">
                    <div
                      className="pw-strength-bar"
                      style={{ width: `${pwStr.width}%`, background: pwStr.color }}
                    />
                    <span style={{ color: pwStr.color }}>{pwStr.label}</span>
                  </div>
                )}
              </div>
            )}

            {requireTotp && (
              <div className="auth-field">
                <label htmlFor="auth-totp">Authenticator Code (2FA)</label>
                <input
                  id="auth-totp"
                  required
                  type="text"
                  maxLength={6}
                  autoComplete="one-time-code"
                  placeholder="000000"
                  value={totpToken}
                  onChange={(e) => setTotpToken(e.target.value)}
                  style={{ letterSpacing: "4px", fontSize: "1.2rem", textAlign: "center" }}
                />
              </div>
            )}

            <button
              id="auth-submit"
              className="btn btn-primary btn-full auth-submit"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Please wait…"
                : isMagicMode
                ? "Send Magic Link"
                : requireTotp
                ? "Verify Code"
                : isRegister
                ? "Create Account"
                : "Sign In"}
            </button>
          </form>
        )}

        {/* ── Switch mode ── */}
        <div className="auth-footer">
          {isMagicMode || requireTotp ? (
            <button type="button" className="auth-link" onClick={() => { setMode("login"); setMagicSent(false); setRequireTotp(false); }}>
              ← Back to password login
            </button>
          ) : isRegister ? (
            <p>
              Already have an account?{" "}
              <button className="auth-link" onClick={() => setMode("login")}>Sign in</button>
            </p>
          ) : (
            <p>
              New to RanchiKart?{" "}
              <button className="auth-link" onClick={() => setMode("register")}>Create account</button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
