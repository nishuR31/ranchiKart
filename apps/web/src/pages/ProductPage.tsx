import { Suspense, lazy, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  CheckCircle2, ChevronLeft, ChevronRight, Heart, RefreshCcw,
  RotateCcw, ShieldAlert, ShieldCheck, Star, Truck, Zap
} from "lucide-react";
import { api } from "../api/client";
import { money } from "../lib/money";
import { useShopStore } from "../store/useShopStore";
import type { Product, Review } from "../types";

const ProductCustomizer = lazy(() => import("../components/ProductCustomizer"));
const ProductGrid = lazy(() => import("../components/ProductGrid"));

function StarRow({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {[1,2,3,4,5].map((s) => (
          <Star key={s} size={14}
            className={s <= Math.round(rating) ? "text-amber-400 fill-amber-400" : "text-gray-700 fill-gray-700"} />
        ))}
      </div>
      <span className="text-sm text-white font-semibold">{rating.toFixed(1)}</span>
      <span className="text-sm text-gray-500">({count} reviews)</span>
    </div>
  );
}

function GalleryImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [err, setErr] = useState(false);
  return (
    <img src={err ? "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=600&q=80" : src}
      alt={alt} className={className} onError={() => setErr(true)} />
  );
}

export default function ProductPage() {
  const { slug = "" } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const { token, wishlistIds, toggleWishlistId, showToast } = useShopStore();

  useEffect(() => {
    setLoading(true);
    setActiveImg(0);
    api.getProduct(slug).then((r) => {
      setProduct(r.product);
      setRelated(r.related);
      setIsWishlisted(wishlistIds.includes(r.product.id));
    }).catch(console.error).finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!product) return;
    api.getReviews(product.slug).then((r) => setReviews(r.reviews)).catch(console.error);
    setIsWishlisted(wishlistIds.includes(product.id));
  }, [product, wishlistIds]);

  async function handleWishlist() {
    if (!product) return;
    if (!token) { showToast({ type: "info", title: "Login to save wishlist" }); return; }
    const r = await api.toggleWishlist(product.id, token).catch((e) => {
      showToast({ type: "error", title: e.message }); return null;
    });
    if (r) { toggleWishlistId(product.id); setIsWishlisted(r.wishlisted); }
  }

  const allImages = product ? [product.imageUrl, ...product.gallery.filter(Boolean)].slice(0, 6) : [];

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid lg:grid-cols-[1fr_1fr_380px] gap-8 animate-pulse">
      <div className="lg:col-span-1 aspect-square bg-white/5 rounded-2xl" />
      <div className="space-y-4">
        <div className="h-4 bg-white/5 rounded w-1/4" />
        <div className="h-8 bg-white/8 rounded w-3/4" />
        <div className="h-4 bg-white/5 rounded" />
        <div className="h-4 bg-white/5 rounded w-5/6" />
      </div>
      <div className="h-96 bg-white/5 rounded-2xl" />
    </div>
  );

  if (!product) return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <p className="text-gray-400 text-lg font-semibold">Product not found</p>
      <Link to="/search" className="mt-4 text-indigo-400 hover:text-indigo-300 transition-colors">Browse all products →</Link>
    </div>
  );

  return (
    <div>
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-2">
        <nav className="flex items-center gap-1.5 text-xs text-gray-500">
          <Link to="/" className="hover:text-white transition-colors">Home</Link>
          <ChevronRight size={12} />
          <Link to={`/category/${product.category.slug}`} className="hover:text-white transition-colors">{product.category.name}</Link>
          <ChevronRight size={12} />
          <span className="text-gray-400 truncate max-w-[200px]">{product.name}</span>
        </nav>
      </div>

      {/* Main product layout */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid lg:grid-cols-[1fr_1fr_380px] gap-8 lg:gap-10 items-start">

          {/* ── Gallery ── */}
          <div className="lg:sticky lg:top-20">
            {/* Main image */}
            <div className="relative bg-[#16161e] border border-white/8 rounded-2xl overflow-hidden aspect-square mb-3">
              <GalleryImage src={allImages[activeImg] ?? ""} alt={product.name}
                className="w-full h-full object-cover" />
              {product.isFeatured && (
                <span className="absolute top-3 left-3 flex items-center gap-1 bg-amber-500 text-black text-[10px] font-bold px-2.5 py-1 rounded-full">
                  <Zap size={9} /> Featured
                </span>
              )}
              {/* Nav arrows */}
              {allImages.length > 1 && (
                <>
                  <button onClick={() => setActiveImg((i) => (i - 1 + allImages.length) % allImages.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 backdrop-blur-sm text-white rounded-xl flex items-center justify-center hover:bg-black/60 transition-colors">
                    <ChevronLeft size={16} />
                  </button>
                  <button onClick={() => setActiveImg((i) => (i + 1) % allImages.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 backdrop-blur-sm text-white rounded-xl flex items-center justify-center hover:bg-black/60 transition-colors">
                    <ChevronRight size={16} />
                  </button>
                </>
              )}
            </div>
            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {allImages.map((img, i) => (
                  <button key={i} onClick={() => setActiveImg(i)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors shrink-0 ${i === activeImg ? "border-indigo-500" : "border-white/10 hover:border-white/30"}`}>
                    <GalleryImage src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Product details ── */}
          <div className="space-y-6">
            {/* Category + name */}
            <div>
              <Link to={`/category/${product.category.slug}`}
                className="inline-block text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-2 hover:text-indigo-300 transition-colors">
                {product.category.name}
              </Link>
              <h1 className="text-2xl lg:text-3xl font-bold text-white leading-tight">{product.name}</h1>
              <p className="text-gray-400 text-sm leading-relaxed mt-2">{product.description}</p>
            </div>

            {/* Rating + wishlist */}
            <div className="flex items-center justify-between">
              <StarRow rating={product.rating} count={product.reviewCount} />
              <button onClick={handleWishlist}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                  isWishlisted ? "bg-rose-500/15 border-rose-500/40 text-rose-400" : "bg-white/5 border-white/10 text-gray-400 hover:border-rose-500/40 hover:text-rose-400"
                }`}>
                <Heart size={13} fill={isWishlisted ? "currentColor" : "none"} />
                {isWishlisted ? "Saved" : "Save"}
              </button>
            </div>

            {/* Price */}
            <div className="p-4 bg-white/3 border border-white/8 rounded-2xl">
              <p className="text-3xl font-bold text-white">{money(product.basePrice)}</p>
              <p className="text-xs text-gray-500 mt-0.5">Base price · final price shown at checkout</p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-xs text-emerald-400 font-semibold">
                  {product.dispatchDays <= 1 ? "Ships today" : `Dispatches in ${product.dispatchDays} days`}
                </span>
                <span className="text-gray-700">·</span>
                <span className="text-xs text-gray-500">{product.stock} in stock</span>
              </div>
            </div>

            {/* Policy grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: RotateCcw, label: `${product.replacementDays}-Day Replacement`, sub: "For manufacturing defects", color: "text-emerald-400" },
                { icon: ShieldAlert, label: "No Returns", sub: "Customized goods non-returnable", color: "text-amber-400" },
                { icon: Truck, label: `${product.dispatchDays}-Day Dispatch`, sub: "After artwork approval", color: "text-indigo-400" },
                { icon: ShieldCheck, label: "Warranty", sub: product.warrantyText, color: "text-violet-400" }
              ].map(({ icon: Icon, label, sub, color }) => (
                <div key={label} className="flex gap-3 p-3 bg-white/3 border border-white/8 rounded-xl">
                  <Icon size={16} className={`shrink-0 mt-0.5 ${color}`} />
                  <div>
                    <p className="text-xs font-semibold text-white">{label}</p>
                    <p className="text-[10px] text-gray-500 leading-relaxed mt-0.5">{sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Highlights */}
            {product.highlights.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-3">Highlights</h2>
                <ul className="space-y-2">
                  {product.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2.5 text-sm text-gray-300">
                      <CheckCircle2 size={14} className="text-indigo-400 shrink-0 mt-0.5" />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Specifications */}
            {Object.keys(product.specifications).length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-3">Specifications</h2>
                <div className="bg-white/3 border border-white/8 rounded-xl overflow-hidden">
                  {Object.entries(product.specifications).map(([k, v], i) => (
                    <div key={k} className={`flex items-start gap-4 px-4 py-3 ${i > 0 ? "border-t border-white/5" : ""}`}>
                      <span className="text-xs text-gray-500 w-28 shrink-0 pt-0.5">{k}</span>
                      <span className="text-sm text-white font-medium flex-1">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {product.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <span key={tag} className="text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ── Customizer ── */}
          <div className="lg:sticky lg:top-20">
            <Suspense fallback={<div className="h-80 bg-white/5 rounded-2xl animate-pulse" />}>
              <ProductCustomizer product={product} />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Reviews */}
      {reviews.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 border-t border-white/5">
          <h2 className="text-xl font-bold text-white mb-6">Customer Reviews</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reviews.slice(0, 6).map((r) => (
              <div key={r.id} className="p-5 bg-[#16161e] border border-white/8 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-500/20 border border-indigo-500/30 rounded-full flex items-center justify-center text-indigo-400 font-bold text-sm">
                      {r.user.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{r.user.name}</p>
                      {r.isVerified && <p className="text-[10px] text-emerald-400">✓ Verified Purchase</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map((s) => (
                      <Star key={s} size={11} className={s <= r.rating ? "text-amber-400 fill-amber-400" : "text-gray-700"} />
                    ))}
                  </div>
                </div>
                {r.title && <p className="text-sm font-semibold text-white mb-1">{r.title}</p>}
                <p className="text-sm text-gray-400 leading-relaxed">{r.body}</p>
                <p className="text-[10px] text-gray-600 mt-2">{new Date(r.createdAt).toLocaleDateString("en-IN")}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Related Products */}
      {related.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 border-t border-white/5">
          <div className="flex items-end justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Related Products</h2>
            <Link to={`/category/${product.category.slug}`}
              className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">See all →</Link>
          </div>
          <Suspense fallback={<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="aspect-square bg-white/5 rounded-2xl animate-pulse" />)}</div>}>
            <ProductGrid products={related.slice(0, 4)} />
          </Suspense>
        </section>
      )}
    </div>
  );
}
