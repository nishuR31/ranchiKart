import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info);
  }

  handleReset = () => {
    // Clear all potentially corrupted persisted state
    try {
      localStorage.removeItem("ranchikart-auth");
      localStorage.removeItem("rk_cart");
    } catch {
      // ignore
    }
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", minHeight: "100vh", padding: 24,
          fontFamily: "system-ui, sans-serif", textAlign: "center",
          background: "#0f172a", color: "#e2e8f0",
        }}>
          <h1 style={{ fontSize: 28, marginBottom: 12 }}>Something went wrong</h1>
          <p style={{ color: "#94a3b8", maxWidth: 480, marginBottom: 24 }}>
            RanchiKart encountered an unexpected error. This is often caused by
            stale data in your browser. Click the button below to clear it and reload.
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: "10px 28px", border: "none", borderRadius: 8,
              background: "#6366f1", color: "#fff", fontSize: 16,
              cursor: "pointer", fontWeight: 600,
            }}
          >
            Clear Data &amp; Reload
          </button>
          <details style={{ marginTop: 24, color: "#64748b", fontSize: 13, maxWidth: 600 }}>
            <summary style={{ cursor: "pointer" }}>Error details</summary>
            <pre style={{ whiteSpace: "pre-wrap", marginTop: 8, textAlign: "left" }}>
              {this.state.error?.toString()}
            </pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}
