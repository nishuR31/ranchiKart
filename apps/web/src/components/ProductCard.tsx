import { memo, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, ShoppingCart, Star, Zap } from "lucide-react";
import { useShopStore } from "../store/useShopStore";
import { api } from "../api/client";
import type { Product } from "../types";

interface ProductCardProps {
  product: Product;
}

function fmtPrice(paisa: number) {
  return `₹${(paisa / 100).toLocaleString("en-IN")}`;
}

const ProductCard = memo(function ProductCard({ product }: ProductCardProps) {
  const { token, wishlistIds, toggleWishlistId, addToCart, showToast } = useShopStore();
  const [imgError, setImgError] = useState(false);
  const [isWishing, setIsWishing] = useState(false);
  const isWishlisted = wishlistIds.includes(product.id);

  async function handleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    if (!token) {
      showToast({ type: "info", title: "Login to save wishlist", message: "Create a free account to save products" });
      return;
    }
    setIsWishing(true);
    try {
      const r = await api.toggleWishlist(product.id, token);
      toggleWishlistId(product.id);
      showToast({
        type: "success",
        title: r.wishlisted ? "Added to wishlist ♥" : "Removed from wishlist",
      });
    } catch {
      showToast({ type: "error", title: "Failed to update wishlist" });
    } finally {
      setIsWishing(false);
    }
  }

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    addToCart({
      product,
      quantity: 1,
      customization: {}
    });
    showToast({ type: "success", title: "Added to cart!", message: product.name });
  }

  const hasVariants = product.variants?.length > 0;
  const minPrice = hasVariants
    ? Math.min(...product.variants.map((v) => product.basePrice + v.priceDelta))
    : product.basePrice;

  const dispatchLabel =
    product.dispatchDays <= 1
      ? "Ships today"
      : product.dispatchDays <= 2
      ? `Ships in ${product.dispatchDays} days`
      : `${product.dispatchDays}-day dispatch`;

  return (
    <Link
      to={`/product/${product.slug}`}
      className="group relative flex flex-col bg-[#16161e] border border-white/8 rounded-2xl overflow-hidden hover:border-indigo-500/40 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 hover:-translate-y-1"
    >
      {/* Image */}
      <div className="relative overflow-hidden bg-[#1c1c28] aspect-square">
        <img
          src={imgError ? "https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=600&q=80" : product.imageUrl}
          alt={product.name}
          loading="lazy"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.isFeatured && (
            <span className="flex items-center gap-1 bg-amber-500 text-black text-[10px] font-bold px-2 py-1 rounded-full">
              <Zap size={9} /> Featured
            </span>
          )}
          {product.dispatchDays <= 2 && (
            <span className="bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-1 rounded-full">
              ⚡ Fast
            </span>
          )}
        </div>

        {/* Wishlist button */}
        <button
          onClick={handleWishlist}
          disabled={isWishing}
          className={`absolute top-3 right-3 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 ${
            isWishlisted
              ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30"
              : "bg-black/40 backdrop-blur-sm text-white/60 opacity-0 group-hover:opacity-100 hover:bg-rose-500/80 hover:text-white"
          }`}
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart size={14} fill={isWishlisted ? "currentColor" : "none"} />
        </button>

        {/* Quick add to cart */}
        <button
          onClick={handleAddToCart}
          className="absolute bottom-3 left-3 right-3 flex items-center justify-center gap-2 bg-indigo-600/90 backdrop-blur-sm text-white text-xs font-semibold py-2.5 rounded-xl opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 hover:bg-indigo-500 shadow-lg"
        >
          <ShoppingCart size={13} />
          Quick Add
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4">
        {/* Category */}
        <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400 mb-1.5">
          {product.category?.name}
        </span>

        {/* Name */}
        <h3 className="text-sm font-semibold text-white leading-tight mb-2 line-clamp-2 group-hover:text-indigo-200 transition-colors">
          {product.name}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-1.5 mb-3">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={10}
                className={star <= Math.round(product.rating) ? "text-amber-400 fill-amber-400" : "text-gray-700 fill-gray-700"}
              />
            ))}
          </div>
          <span className="text-[10px] text-gray-500">
            {product.rating.toFixed(1)} ({product.reviewCount})
          </span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Price and dispatch */}
        <div className="flex items-end justify-between">
          <div>
            <div className="text-base font-bold text-white">
              {hasVariants && <span className="text-xs font-normal text-gray-500 mr-1">from</span>}
              {fmtPrice(minPrice)}
            </div>
            <div className="text-[10px] text-emerald-400 font-medium mt-0.5">
              {dispatchLabel}
            </div>
          </div>
          {product.returnEligible && (
            <span className="text-[9px] text-gray-600 bg-white/5 px-2 py-1 rounded-full">
              Returns OK
            </span>
          )}
        </div>
      </div>
    </Link>
  );
});

export default ProductCard;
