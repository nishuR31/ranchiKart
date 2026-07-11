import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Heart, ShoppingCart, Zap } from "lucide-react";
import api, { extractError } from "../lib/api";
import { formatINR, discountPercent } from "../lib/money";
import StarRating from "../components/StarRating";
import ProductCard from "../components/ProductCard";
import useShopStore from "../store/useShopStore";
import useAuthStore from "../store/useAuthStore";

export default function ProductPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);

  const { addToCart, toggleWishlist, showToast } = useShopStore();
  const token = useAuthStore((s) => s.token);

  async function load() {
    setLoading(true);
    const { data } = await api.get(`/products/${slug}`);
    setProduct(data.product);
    setRelated(data.related);
    setActiveImg(0);
    setQty(1);
    setLoading(false);
  }

  useEffect(() => {
    load();
    window.scrollTo(0, 0);
  }, [slug]);

  if (loading || !product) return <div className="loading-block">Loading product…</div>;

  const off = discountPercent(product.price, product.mrp);

  async function handleAdd() {
    if (!token) return navigate("/auth");
    await addToCart(product.id, qty);
  }

  async function handleBuyNow() {
    if (!token) return navigate("/auth");
    await addToCart(product.id, qty);
    navigate("/cart");
  }

  async function handleWishlist() {
    if (!token) return navigate("/auth");
    await toggleWishlist(product.id);
  }

  async function submitReview(e) {
    e.preventDefault();
    if (!token) return navigate("/auth");
    setSubmittingReview(true);
    try {
      await api.post("/reviews", { productId: product.id, ...reviewForm });
      showToast("Review submitted");
      setReviewForm({ rating: 5, comment: "" });
      await load();
    } catch (err) {
      showToast(extractError(err, "Could not submit review"), "error");
    } finally {
      setSubmittingReview(false);
    }
  }

  return (
    <div className="product-page">
      <div className="product-detail">
        <div className="product-gallery">
          <div className="gallery-main">
            <img src={product.images[activeImg]} alt={product.title} />
          </div>
          <div className="gallery-thumbs">
            {product.images.map((img, i) => (
              <button key={i} className={i === activeImg ? "active" : ""} onClick={() => setActiveImg(i)}>
                <img src={img} alt="" />
              </button>
            ))}
          </div>
        </div>

        <div className="product-info">
          <div className="product-brand">{product.brand}</div>
          <h1>{product.title}</h1>
          <StarRating rating={product.rating} numReviews={product.numReviews} size={16} />

          <div className="product-price-row large">
            <span className="price">{formatINR(product.price)}</span>
            {off > 0 && (
              <>
                <span className="mrp">{formatINR(product.mrp)}</span>
                <span className="off">{off}% off</span>
              </>
            )}
          </div>

          <p className="product-description">{product.description}</p>

          <div className="stock-line">
            {product.stock > 0 ? (
              <span className="in-stock">In stock ({product.stock} available)</span>
            ) : (
              <span className="out-stock">Out of stock</span>
            )}
          </div>

          <div className="qty-row">
            <label>Qty</label>
            <div className="qty-stepper">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
              <span>{qty}</span>
              <button onClick={() => setQty((q) => Math.min(product.stock, q + 1))}>+</button>
            </div>
          </div>

          <div className="product-actions">
            <button className="btn btn-primary" disabled={product.stock === 0} onClick={handleAdd}>
              <ShoppingCart size={16} /> Add to Cart
            </button>
            <button className="btn btn-accent" disabled={product.stock === 0} onClick={handleBuyNow}>
              <Zap size={16} /> Buy Now
            </button>
            <button className="btn btn-outline icon-only" onClick={handleWishlist} title="Wishlist">
              <Heart size={18} />
            </button>
          </div>

          {product.specs && Object.keys(product.specs).length > 0 && (
            <div className="specs-table">
              <h3>Specifications</h3>
              <table>
                <tbody>
                  {Object.entries(product.specs).map(([k, v]) => (
                    <tr key={k}>
                      <td>{k}</td>
                      <td>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="policy-row">
            <span>✔ 7-day easy replacement</span>
            <span>✔ Cash on Delivery available</span>
            <span>✔ Delivered from Ranchi fulfilment centre</span>
          </div>
        </div>
      </div>

      <section className="reviews-section">
        <h2>Ratings &amp; Reviews</h2>
        <form className="review-form" onSubmit={submitReview}>
          <select
            value={reviewForm.rating}
            onChange={(e) => setReviewForm((f) => ({ ...f, rating: Number(e.target.value) }))}
          >
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>
                {r} Star{r > 1 ? "s" : ""}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Share your experience..."
            value={reviewForm.comment}
            onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
          />
          <button className="btn btn-outline btn-sm" type="submit" disabled={submittingReview}>
            {submittingReview ? "Posting…" : "Post Review"}
          </button>
        </form>
        <div className="review-list">
          {product.reviews?.length === 0 && <p>No reviews yet. Be the first to review this product.</p>}
          {product.reviews?.map((r) => (
            <div key={r.id} className="review-item">
              <div className="review-item-head">
                <StarRating rating={r.rating} />
                <span>{r.user?.name || "Anonymous"}</span>
              </div>
              {r.comment && <p>{r.comment}</p>}
            </div>
          ))}
        </div>
      </section>

      {related.length > 0 && (
        <section className="product-section">
          <div className="section-header">
            <h2>You may also like</h2>
          </div>
          <div className="product-grid">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
