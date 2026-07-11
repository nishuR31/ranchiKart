import { useEffect } from "react";
import { Link } from "react-router-dom";
import useShopStore from "../store/useShopStore";
import ProductCard from "../components/ProductCard";

export default function WishlistPage() {
  const { wishlist, fetchWishlist } = useShopStore();

  useEffect(() => {
    fetchWishlist();
  }, []);

  if (wishlist.items.length === 0) {
    return (
      <div className="empty-block">
        <p>Your wishlist is empty.</p>
        <Link to="/" className="btn btn-primary">Discover Products</Link>
      </div>
    );
  }

  return (
    <div className="category-page">
      <h1>My Wishlist</h1>
      <div className="product-grid">
        {wishlist.items.map((i) => (
          <ProductCard key={i.id} product={i.product} />
        ))}
      </div>
    </div>
  );
}
