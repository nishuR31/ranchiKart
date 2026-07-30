import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { formatINR } from "../lib/money";
import useSEO from "../lib/useSEO";
import { PageLoader } from "../components/Loaders";

const STATUS_LABEL = {
  PENDING_PAYMENT: "Pending Payment",
  PAID: "Paid",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export default function OrdersPage() {
  useSEO({ title: "My Orders", noindex: true });

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/orders")
      .then(({ data }) => {
        // data = { orders: [...], total, page } after envelope unwrap
        setOrders(Array.isArray(data) ? data : data.orders ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader text="Loading your orders…" />;
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
