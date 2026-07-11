import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { formatINR } from "../lib/money";

const STATUS_LABEL = {
  PLACED: "Placed",
  CONFIRMED: "Confirmed",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/orders").then(({ data }) => {
      setOrders(data.orders);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="loading-block">Loading your orders…</div>;
  if (orders.length === 0) {
    return (
      <div className="empty-block">
        <p>You haven't placed any orders yet.</p>
        <Link to="/" className="btn btn-primary">Start Shopping</Link>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <h1>My Orders</h1>
      <div className="orders-list">
        {orders.map((o) => (
          <Link to={`/orders/${o.id}`} key={o.id} className="order-row">
            <div>
              <strong>{o.orderNumber}</strong>
              <p>{new Date(o.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}</p>
            </div>
            <div>{o.items.length} item(s)</div>
            <div className={`status-pill status-${o.status.toLowerCase()}`}>{STATUS_LABEL[o.status] || o.status}</div>
            <div className="order-total">{formatINR(o.total)}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
