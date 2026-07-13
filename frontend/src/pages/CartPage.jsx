import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trash2, ShoppingBag } from "lucide-react";
import useShopStore from "../store/useShopStore";
import useAuthStore from "../store/useAuthStore";
import { formatINR } from "../lib/money";

export default function CartPage() {
  const { cart, fetchCart, updateCartItem, removeCartItem } = useShopStore();
  const token = useAuthStore((s) => s.token);
  const navigate = useNavigate();

  useEffect(() => {
    if (token) fetchCart();
  }, [token]);

  if (!token) {
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
              <img src={item.product.imageUrl} alt={item.product.name} />
              <div className="cart-item-info">
                <Link to={`/product/${item.product.slug}`}>{item.product.name}</Link>
                <div className="cart-item-price">{formatINR(item.product.basePrice)}</div>
                <div className="qty-stepper">
                  <button onClick={() => updateCartItem(item.id, Math.max(1, item.quantity - 1))}>−</button>
                  <span>{item.quantity}</span>
                  <button
                    onClick={() =>
                      updateCartItem(item.id, Math.min(item.product.stock, item.quantity + 1))
                    }
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="cart-item-total">{formatINR(item.product.basePrice * item.quantity)}</div>
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
