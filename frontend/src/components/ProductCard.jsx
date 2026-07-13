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
  const token = useAuthStore((s) => s.token);
  const navigate = useNavigate();
  const off = discountPercent(product.basePrice, product.specifications?.mrp);

  function handleAdd(e) {
    e.preventDefault();
    if (!token) return navigate("/auth");
    addToCart(product.id, 1);
  }

  function handleWishlist(e) {
    e.preventDefault();
    if (!token) return navigate("/auth");
    toggleWishlist(product.id);
  }

  return (
    <Link to={`/product/${product.slug}`} className="product-card">
      <button className="wishlist-btn" onClick={handleWishlist} aria-label="Add to wishlist">
        <Heart size={16} />
      </button>
      <div className="product-card-image">
        <img src={product.imageUrl} alt={product.name} loading="lazy" />
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
        <button className="btn btn-outline btn-sm add-btn" onClick={handleAdd}>
          <ShoppingCart size={14} /> Add to Cart
        </button>
      </div>
    </Link>
  );
}
