import { Link, useNavigate } from "react-router-dom";
import { Trash2, ShoppingBag } from "lucide-react";
import useShopStore from "../store/useShopStore";
import useAuthStore from "../store/useAuthStore";
import { formatINR } from "../lib/money";
import useSEO from "../lib/useSEO";

// Cart is client-side (localStorage) — items have flat structure:
// { id, name, slug, imageUrl, basePrice, stock, quantity }

export default function CartPage() {
  useSEO({
    title: "My Cart",
    description: "View your shopping cart and proceed to checkout at RanchiKart.",
    noindex: true,
  });

  const { cart, updateCartItem, removeCartItem } = useShopStore();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="empty-block">
        <ShoppingBag size={40} />
        <p>Please log in to view your cart.</p>
        <Link to="/auth" className="btn btn-primary">Login</Link>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="empty-block">
        <ShoppingBag size={40} />
        <p>Your cart is empty.</p>
        <Link to="/" className="btn btn-primary">Continue Shopping</Link>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <h1>My Cart ({cart.count} items)</h1>
      <div className="cart-layout">
        <div className="cart-items">
          {cart.items.map((item) => (
            <div key={item.id} className="cart-item">
              <img src={item.imageUrl} alt={item.name} />
              <div className="cart-item-info">
                <Link to={`/product/${item.slug}`}>{item.name}</Link>
                <div className="cart-item-price">{formatINR(item.basePrice)}</div>
                <div className="qty-stepper">
                  <button onClick={() => updateCartItem(item.id, Math.max(1, item.quantity - 1))}>−</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateCartItem(item.id, Math.min(item.stock ?? 99, item.quantity + 1))}>+</button>
                </div>
              </div>
              <div className="cart-item-total">{formatINR(item.basePrice * item.quantity)}</div>
              <button className="icon-btn" onClick={() => removeCartItem(item.id)} title="Remove">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>

        <div className="cart-summary">
          <h3>Price Details</h3>
          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatINR(cart.subtotal)}</span>
          </div>
          <div className="summary-row muted">
            <span>Delivery, discounts &amp; coupons</span>
            <span>Calculated at checkout</span>
          </div>
          <button className="btn btn-primary btn-full" onClick={() => navigate("/checkout")}>
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
