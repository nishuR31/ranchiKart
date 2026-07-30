import { Link } from "react-router-dom";
import { Heart, ShoppingCart } from "lucide-react";
import StarRating from "./StarRating";
import { formatINR, discountPercent } from "../lib/money";
import useShopStore from "../store/useShopStore";
import useAuthStore from "../store/useAuthStore";
import { useNavigate } from "react-router-dom";

export default function ProductCard({ product }) {
  const addToCart = useShopStore((s) => s.addToCart);
  const toggleWishlist = useShopStore((s) => s.toggleWishlist);
  const wishlistItems = useShopStore((s) => s.wishlist.items);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const off = discountPercent(product.basePrice, product.specifications?.mrp);
  const inWishlist = wishlistItems?.some((i) => (i.productId ?? i.product?.id ?? i.id) === product.id);
  const outOfStock = product.stock === 0;

  function handleAdd(e) {
    e.preventDefault();
    if (!user) return navigate("/auth");
    addToCart(product, 1);
  }

  function handleWishlist(e) {
    e.preventDefault();
    if (!user) return navigate("/auth");
    toggleWishlist(product.id);
  }

  return (
    <Link to={`/product/${product.slug}`} className="product-card">
      <button
        className={`wishlist-btn${inWishlist ? " active" : ""}`}
        onClick={handleWishlist}
        aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
      >
        <Heart size={16} fill={inWishlist ? "currentColor" : "none"} />
      </button>
      {off > 0 && <span className="discount-ribbon">{off}% off</span>}
      <div className="product-card-image">
        <img src={product.imageUrl} alt={product.name} loading="lazy" />
        {outOfStock && <div className="oos-overlay">Out of stock</div>}
      </div>
      <div className="product-card-body">
        <div className="product-brand">{product.specifications?.brand || "RanchiKart"}</div>
        <div className="product-title" title={product.name}>{product.name}</div>
        <StarRating rating={product.rating} numReviews={product.reviewCount} />
        <div className="product-price-row">
          <span className="price">{formatINR(product.basePrice)}</span>
          {off > 0 && (
            <>
              <span className="mrp">{formatINR(product.specifications?.mrp)}</span>
              <span className="off">{off}% off</span>
            </>
          )}
        </div>
        <button className="btn btn-outline btn-sm add-btn" onClick={handleAdd} disabled={outOfStock}>
          <ShoppingCart size={14} /> {outOfStock ? "Notify me" : "Add to Cart"}
        </button>
      </div>
    </Link>
  );
}
