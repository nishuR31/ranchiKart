import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  ArrowRight, BadgeCheck, Package, RefreshCcw,
  Search, ShieldCheck, Star, Truck, Zap, ChevronRight, Sparkles
} from "lucide-react";
import { api } from "../api/client";
import ProductGrid from "../components/ProductGrid";
import type { Category, Product } from "../types";

const TRUST_ITEMS = [
  { icon: BadgeCheck, text: "Verified Manufacturers" },
  { icon: ShieldCheck, text: "100% Secure Payments" },
  { icon: Truck, text: "Fast Pan-India Dispatch" },
  { icon: RefreshCcw, text: "Replacement on Defects" },
  { icon: Star, text: "4.8★ Average Rating" },
  { icon: Zap, text: "Custom Sizes Available" },
  { icon: Package, text: "Bulk Orders Welcome" },
  { icon: BadgeCheck, text: "Digital Proof Before Production" }
];

const STATS = [
  { value: "12K+", label: "Orders Delivered" },
  { value: "500+", label: "Products" },
  { value: "4.8★", label: "Avg Rating" },
  { value: "3 Days", label: "Avg Dispatch" }
];

const HOW_IT_WORKS = [
  { step: "01", title: "Browse & Choose", desc: "Pick from 500+ products across stamps, boards, and stationery.", icon: Search },
  { step: "02", title: "Customize", desc: "Set exact dimensions, upload text, and choose material or variant.", icon: Zap },
  { step: "03", title: "Pay Securely", desc: "100% prepaid via UPI, Card, or Net Banking through Razorpay.", icon: ShieldCheck },
  { step: "04", title: "Receive Fast", desc: "Dispatched within 3–5 days. Tracking info sent by email.", icon: Truck }
];

export default function HomePage() {
  const { categories } = useOutletContext<{ categories: Category[] }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getProducts({ limit: 10 })
      .then((r) => setProducts(r.products))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const roots = useMemo(() => categories.filter((c) => !c.parentId), [categories]);
  const subTypes = useMemo(() => categories.filter((c) => c.parentId).slice(0, 14), [categories]);

  return (
    <div>
      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-violet-600/15 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left content */}
            <div>
              <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold px-4 py-2 rounded-full mb-6">
                <Sparkles size={12} className="animate-pulse" />
                Custom Commerce for Offices & Institutions
              </div>

              <h1 className="font-display font-black text-5xl lg:text-6xl xl:text-7xl text-white leading-[1.05] mb-6">
                Stamps, Boards{" "}
                <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                  & Stationery
                </span>
                <br />
                Made to Order
              </h1>

              <p className="text-gray-400 text-lg leading-relaxed mb-8 max-w-lg">
                Browse ready categories, choose exact dimensions, upload your design, and place fully
                prepaid orders with lightning-fast dispatch across India.
              </p>

              <div className="flex flex-wrap gap-4 mb-10">
                <Link
                  to="/search"
                  className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl hover:from-indigo-500 hover:to-violet-500 transition-all shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5"
                >
                  <Search size={16} /> Explore All Products
                </Link>
                <Link
                  to="/category/stamps"
                  className="flex items-center gap-2 px-6 py-3.5 bg-white/5 border border-white/15 text-white font-semibold rounded-xl hover:bg-white/10 hover:border-white/25 transition-all"
                >
                  Custom Stamps <ChevronRight size={16} />
                </Link>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4">
                {STATS.map(({ value, label }) => (
                  <div key={label} className="text-center">
                    <div className="font-display font-black text-xl text-white">{value}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right card */}
            <div className="hidden lg:block">
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-sm font-semibold text-[var(--text-1)]">Why MudraKart?</span>
                </div>
                <div className="space-y-5">
                  {[
                    { icon: ShieldCheck, title: "No Cash on Delivery", desc: "All orders are prepaid for quality assurance and faster processing.", color: "text-emerald-400" },
                    { icon: BadgeCheck, title: "Custom Manufacturing", desc: "Set exact width, height, material, ink colour, and text for every item.", color: "text-indigo-400" },
                    { icon: Truck, title: "Dispatch Guarantee", desc: "Every product shows its dispatch timeline upfront — no surprises.", color: "text-violet-400" },
                    { icon: RefreshCcw, title: "Defect Replacement", desc: "Manufacturing defects replaced at no extra cost — guaranteed.", color: "text-amber-400" }
                  ].map(({ icon: Icon, title, desc, color }) => (
                    <div key={title} className="flex gap-4 p-4 rounded-2xl bg-white/3 border border-white/5 hover:border-white/10 transition-colors">
                      <div className={`shrink-0 mt-0.5 ${color}`}>
                        <Icon size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white mb-1">{title}</p>
                        <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust Marquee ────────────────────────────────────────── */}
      <div className="border-y border-white/5 bg-white/2 overflow-hidden py-3.5">
        <div className="flex animate-[marquee_30s_linear_infinite] whitespace-nowrap">
          {[...TRUST_ITEMS, ...TRUST_ITEMS].map((item, i) => (
            <span key={i} className="inline-flex items-center gap-2 text-xs text-gray-500 font-medium mx-8">
              <item.icon size={13} className="text-indigo-400" />
              {item.text}
              <span className="text-gray-700 ml-6">·</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Shop by Category ─────────────────────────────────────── */}
      {roots.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2">Browse</p>
              <h2 className="font-display font-black text-3xl text-white">Shop by Category</h2>
            </div>
            <Link
              to="/search"
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              All products <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {roots.map((c) => (
              <Link
                key={c.id}
                to={`/category/${c.slug}`}
                className="group relative overflow-hidden rounded-2xl aspect-[4/3] border border-white/8 hover:border-indigo-500/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/10"
              >
                <img
                  src={c.imageUrl}
                  alt={c.name}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=600&q=80";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3 className="font-display font-bold text-xl text-white mb-1">{c.name}</h3>
                  <p className="text-xs text-gray-300 line-clamp-2">{c.description}</p>
                  <div className="flex items-center gap-1 mt-3 text-indigo-300 text-xs font-semibold group-hover:text-indigo-200 transition-colors">
                    Shop now <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Popular Types ─────────────────────────────────────────── */}
      {subTypes.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-600 mb-4">Quick Filter</p>
          <div className="flex flex-wrap gap-2">
            {subTypes.map((c) => (
              <Link
                key={c.id}
                to={`/category/${c.slug}`}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-400 hover:text-white hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-all"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Recommended Products ──────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2">Explore</p>
            <h2 className="font-display font-black text-3xl text-white">Recommended Products</h2>
          </div>
          <Link
            to="/search"
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <ProductGrid products={products} loading={loading} skeletonCount={10} />
      </section>

      {/* ── How It Works ──────────────────────────────────────────── */}
      <section className="border-t border-white/5 bg-white/2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-3">Simple Process</p>
            <h2 className="font-display font-black text-4xl text-white">How It Works</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">
              From browsing to delivery — a seamless 4-step journey designed for offices and institutions.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map(({ step, title, desc, icon: Icon }) => (
              <div
                key={step}
                className="relative p-6 bg-[#16161e] border border-white/8 rounded-2xl hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between mb-5">
                  <span className="font-display font-black text-3xl text-indigo-500/30 group-hover:text-indigo-400/50 transition-colors">
                    {step}
                  </span>
                  <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center">
                    <Icon size={18} className="text-indigo-400" />
                  </div>
                </div>
                <h3 className="font-display font-bold text-base text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ─────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 rounded-3xl p-10 text-center">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          </div>
          <div className="relative">
            <h2 className="font-display font-black text-4xl text-white mb-4">
              Ready to Order Something Custom?
            </h2>
            <p className="text-indigo-100 text-lg mb-8 max-w-xl mx-auto">
              Browse 500+ products, set your exact dimensions, and get it delivered in days.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/search"
                className="flex items-center gap-2 px-8 py-4 bg-white text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-all shadow-2xl"
              >
                <Search size={16} /> Browse Products
              </Link>
              <Link
                to="/auth"
                className="flex items-center gap-2 px-8 py-4 bg-white/20 border border-white/30 text-white font-bold rounded-xl hover:bg-white/30 transition-all"
              >
                Create Free Account <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
