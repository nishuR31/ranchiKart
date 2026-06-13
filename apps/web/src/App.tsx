import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { useShopStore } from "./store/useShopStore";

// Eager load critical pages
import HomePage from "./pages/HomePage";
import AuthPage from "./pages/AuthPage";

// Lazy load all other pages for code splitting
const CartPage = lazy(() => import("./pages/CartPage"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const OrdersPage = lazy(() => import("./pages/OrdersPage"));
const ProductPage = lazy(() => import("./pages/ProductPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const WishlistPage = lazy(() => import("./pages/WishlistPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-[var(--text-muted)]">Loading…</p>
      </div>
    </div>
  );
}

function ThemeApplier() {
  const theme = useShopStore((s) => s.theme);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeApplier />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="auth" element={<AuthPage />} />
          <Route element={<Suspense fallback={<PageLoader />}><CategoryPage /></Suspense>} path="category/:slug" />
          <Route element={<Suspense fallback={<PageLoader />}><SearchPage /></Suspense>} path="search" />
          <Route element={<Suspense fallback={<PageLoader />}><ProductPage /></Suspense>} path="product/:slug" />
          <Route element={<Suspense fallback={<PageLoader />}><CartPage /></Suspense>} path="cart" />
          <Route element={<Suspense fallback={<PageLoader />}><CheckoutPage /></Suspense>} path="checkout" />
          <Route element={<Suspense fallback={<PageLoader />}><OrdersPage /></Suspense>} path="orders" />
          <Route element={<Suspense fallback={<PageLoader />}><WishlistPage /></Suspense>} path="wishlist" />
          <Route element={<Suspense fallback={<PageLoader />}><ProfilePage /></Suspense>} path="profile" />
          <Route element={<Suspense fallback={<PageLoader />}><AdminPage /></Suspense>} path="admin" />
          <Route element={<Suspense fallback={<PageLoader />}><TermsPage /></Suspense>} path="terms" />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
