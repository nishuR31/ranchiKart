import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import { api } from "../api/client";
import { useShopStore } from "../store/useShopStore";
import ProductGrid from "../components/ProductGrid";

export default function WishlistPage() {
  const navigate = useNavigate();
  const { token, setWishlistIds } = useShopStore();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { navigate("/auth"); return; }
    api.getWishlist(token)
      .then((r) => {
        setItems(r.items);
        setWishlistIds(r.items.map((i: any) => i.productId));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-1.5">Account</p>
        <h1 className="flex items-center gap-3 text-3xl font-bold text-white">
          <Heart size={26} className="text-rose-400 fill-rose-400" />
          My Wishlist
        </h1>
        <p className="text-gray-500 text-sm mt-2">{items.length} item{items.length !== 1 ? "s" : ""} saved</p>
      </div>

      {!loading && items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4">
            <Heart size={24} className="text-gray-600" />
          </div>
          <p className="text-white font-semibold text-lg">Your wishlist is empty</p>
          <p className="text-gray-500 text-sm mt-1">Click the heart on any product to save it here</p>
          <Link to="/" className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-500 transition-colors">
            Browse Products
          </Link>
        </div>
      ) : (
        <ProductGrid products={items.map((i: any) => i.product)} loading={loading} skeletonCount={8} />
      )}
    </div>
  );
}
