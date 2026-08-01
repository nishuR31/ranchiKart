import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PackageSearch } from "lucide-react";
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

function formatOrderDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function buildProductPreview(items = []) {
  if (!items.length) return "No items";
  const first = items[0]?.product?.name || items[0]?.name || "Item";
  const rest = items.length - 1;
  return rest > 0 ? `${first} +${rest} more` : first;
}

function orderImages(items = []) {
  return items
    .map((item) => item.product?.imageUrl || item.imageUrl)
    .filter(Boolean)
    .slice(0, 3);
}

export default function OrdersPage() {
  useSEO({ title: "My Orders", noindex: true });

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/orders")
      .then(({ data }) => {
        setOrders(Array.isArray(data) ? data : data.orders ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader text="Loading your orders…" />;
  if (orders.length === 0) {
    return (
      <div className="empty-block">
        <PackageSearch size={48} />
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
            <div className="order-row-images">
              {orderImages(o.items).map((src, index) => (
                <img key={`${src}-${index}`} src={src} alt="" loading="lazy" />
              ))}
            </div>
            <div className="order-row-main">
              <div className="order-row-number">
                {o.orderNumber ? (
                  <strong>#{o.orderNumber}</strong>
                ) : (
                  <strong className="muted">Order</strong>
                )}
                <span className="order-row-date">{formatOrderDate(o.createdAt)}</span>
              </div>
              <div className="order-row-preview">
                {buildProductPreview(o.items)}
              </div>
            </div>
            <div className="order-row-meta">
              <span className="order-row-count">{o.items?.length ?? 0} item(s)</span>
              <div className={`status-pill status-${o.status.toLowerCase()}`}>
                {STATUS_LABEL[o.status] || o.status}
              </div>
              <div className="order-total">{formatINR(o.total)}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
