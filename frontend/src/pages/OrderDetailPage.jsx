import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, PackageCheck, Truck, CreditCard, MapPin } from "lucide-react";
import api, { extractError } from "../lib/api";
import { formatINR } from "../lib/money";
import useShopStore from "../store/useShopStore";
import useSEO from "../lib/useSEO";
import { PageLoader } from "../components/Loaders";

const TIMELINE = ["PENDING_PAYMENT", "PAID", "PROCESSING", "SHIPPED", "DELIVERED"];
const COD_TIMELINE = ["PENDING_PAYMENT", "PROCESSING", "SHIPPED", "DELIVERED"];
const STATUS_LABEL = {
  PENDING_PAYMENT: "Pending Payment",
  PAID: "Paid",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export default function OrderDetailPage() {
  useSEO({ title: "Order Details", noindex: true });

  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const showToast = useShopStore((s) => s.showToast);

  async function load() {
    try {
      const { data } = await api.get(`/orders/${id}`);
      // data = { order: {...} } or the order directly
      setOrder(data.order ?? data);
    } catch (err) {
      console.error("Failed to load order", err);
    } finally {
      setLoading(false);
    }
  }

  // NOTE: The API does not have a /orders/:id/cancel endpoint.
  // Status is managed by admin via /admin/orders/:id/status

  useEffect(() => {
    load();
  }, [id]);

  if (loading || !order) return <PageLoader text="Loading order…" />;

  const isCod = order.paymentMethod?.toUpperCase() === "COD";
  const timelineSteps = isCod ? COD_TIMELINE : TIMELINE;
  const timelineLabel = (step) => (isCod && step === "PENDING_PAYMENT" ? "Order Placed" : STATUS_LABEL[step]);
  const stepIndex = timelineSteps.indexOf(order.status);
  const completedStep = stepIndex < 0 ? 0 : stepIndex;

  return (
    <div className="order-detail-page">
      <Link to="/orders" className="order-back-link"><ArrowLeft size={16} /> Back to orders</Link>
      <div className="order-detail-header">
        <div>
          <span className="order-detail-eyebrow">Order Details</span>
          <h1>{order.orderNumber ? `#${order.orderNumber}` : `#${order.id.slice(-8).toUpperCase()}`}</h1>
          <p>Placed on {new Date(order.createdAt).toLocaleString("en-IN")}</p>
        </div>
        <div className={`status-pill status-${order.status.toLowerCase()} large`}>
          {STATUS_LABEL[order.status] || order.status}
        </div>
      </div>

      {order.status === "CANCELLED" ? (
        <div className="status-pill status-cancelled large">Order Cancelled</div>
      ) : (
        <div className="tracking-timeline">
          {timelineSteps.map((step, i) => (
            <div key={step} className={`timeline-step ${i <= completedStep ? "done" : ""}`}>
              <div className="dot" />
              <span>{timelineLabel(step)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="order-detail-grid">
        <div className="order-items-box">
          <h3><PackageCheck size={18} /> Items</h3>
          {order.items.map((item) => (
            <div key={item.id} className="order-item-row">
              <img src={item.product?.imageUrl || "/assets/source.png"} alt={item.product?.name || "Product"} />
              <div className="order-item-info">
                <strong>{item.product?.name || "Product"}</strong>
                <span>Qty {item.quantity} · {formatINR(item.unitPrice)} each</span>
              </div>
              <strong>{formatINR(item.unitPrice * item.quantity)}</strong>
            </div>
          ))}
        </div>

        <div className="cart-summary order-summary-card">
          <h3><CreditCard size={18} /> Payment Summary</h3>
          <div className="summary-row"><span>Subtotal</span><span>{formatINR(order.subtotal)}</span></div>
          {order.discountAmount > 0 && <div className="summary-row"><span>Discount</span><span>-{formatINR(order.discountAmount)}</span></div>}
          <div className="summary-row"><span>Delivery Fee</span><span>{order.shippingFee === 0 ? "FREE" : formatINR(order.shippingFee)}</span></div>
          <div className="summary-row total"><span>Total</span><span>{formatINR(order.total)}</span></div>
          <div className="summary-row muted"><span>Payment</span><span>{order.paymentMethod}</span></div>
          {order.trackingId && <div className="summary-row muted"><span><Truck size={14} /> Tracking</span><span>{order.trackingId}</span></div>}
          <h4><MapPin size={16} /> Delivering to</h4>
          <p className="address-text">
            {order.address?.fullName}, {order.address?.line1}, {order.address?.city} - {order.address?.pincode}
            <br />Phone: {order.address?.phone}
          </p>
        </div>
      </div>
    </div>
  );
}
