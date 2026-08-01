/**
 * Reusable skeleton / loader components.
 *
 * <Skeleton />              — single shimmer block
 * <ProductCardSkeleton />   — mimics a product card
 * <ProductGridSkeleton n={8} /> — a grid of n card skeletons
 * <PageLoader />            — full-page centered spinner
 * <InlineLoader text="…" /> — small inline spinner with optional label
 * <ErrorBlock message retry /> — error state with retry button
 */

import { RefreshCw } from "lucide-react";

// ── Primitive shimmer block ────────────────────────────────────────────────
export function Skeleton({ width, height, className = "", style = {} }) {
  return (
    <div
      className={`sk ${className}`}
      style={{ width, height, borderRadius: 8, ...style }}
    />
  );
}

// ── Product card skeleton ──────────────────────────────────────────────────
export function ProductCardSkeleton() {
  return (
    <div className="product-card sk-card">
      <div className="sk sk-img" />
      <div className="sk-body">
        <div className="sk" style={{ height: 14, width: "80%", marginBottom: 8 }} />
        <div className="sk" style={{ height: 11, width: "50%", marginBottom: 12 }} />
        <div className="sk" style={{ height: 18, width: "40%" }} />
      </div>
    </div>
  );
}

// ── Grid of product card skeletons ─────────────────────────────────────────
export function ProductGridSkeleton({ n = 8 }) {
  return (
    <div className="product-grid">
      {Array.from({ length: n }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ── Table skeleton for Admin dashboard ─────────────────────────────────────
export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            <th><Skeleton height={14} width="40%" /></th>
            <th><Skeleton height={14} width="60%" /></th>
            <th><Skeleton height={14} width="30%" /></th>
            <th><Skeleton height={14} width="30%" /></th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              <td><Skeleton height={14} width="50%" /></td>
              <td><Skeleton height={14} width="80%" /></td>
              <td><Skeleton height={14} width="40%" /></td>
              <td><Skeleton height={28} width={60} style={{ borderRadius: 6 }} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Full-page spinner ──────────────────────────────────────────────────────
export function PageLoader({ text = "Loading…" }) {
  return (
    <div className="page-loader" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh", padding: "2rem" }}>
      <img src="/logo.png" alt="RanchiKart" style={{ width: 140, marginBottom: 24, animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
      <span className="spinner" />
      {text && <p style={{ marginTop: 12, color: "var(--text-muted)" }}>{text}</p>}
    </div>
  );
}

// ── Small inline spinner ───────────────────────────────────────────────────
export function InlineLoader({ text = "" }) {
  return (
    <span className="inline-loader">
      <span className="spinner spinner-sm" />
      {text && <span>{text}</span>}
    </span>
  );
}

// ── Error block with retry ─────────────────────────────────────────────────
export function ErrorBlock({ message = "Something went wrong", retry }) {
  return (
    <div className="error-block">
      <span className="error-icon">!</span>
      <p>{message}</p>
      {retry && (
        <button className="btn btn-outline btn-sm" onClick={retry}>
          <RefreshCw size={14} /> Try again
        </button>
      )}
    </div>
  );
}
