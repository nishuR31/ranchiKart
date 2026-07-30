import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Heart, ShoppingCart, Zap } from "lucide-react";
import api, { extractError } from "../lib/api";
import { formatINR, discountPercent } from "../lib/money";
import StarRating from "../components/StarRating";
import ProductCard from "../components/ProductCard";
import useShopStore from "../store/useShopStore";
import useAuthStore from "../store/useAuthStore";
import useSEO from "../lib/useSEO";
import { PageLoader, ErrorBlock } from "../components/Loaders";

export default function ProductPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, body: "" });
  const [submittingReview, setSubmittingReview] = useState(false);

  useSEO({
    title: product ? product.name : "Loading Product…",
    description: product ? product.description : undefined,
    image: product?.imageUrl || undefined,
    type: "product",
  });

  const { addToCart, toggleWishlist, showToast } = useShopStore();
  const user = useAuthStore((s) => s.user);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/products/${slug}`);
      // data = { product: {...}, related: [...] }
      setProduct(data.product ?? data);
      setRelated(data.related ?? data.relatedProducts ?? []);
      setActiveImg(0);
      setQty(1);
    } catch (err) {
      setError(extractError(err, "Product not found"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    window.scrollTo(0, 0);
  }, [slug]);

  if (loading) return <PageLoader text="Loading product details…" />;
  if (error || !product) return <div className="product-page" style={{ padding: '60px 20px', display: 'flex', justifyContent: 'center' }}><ErrorBlock message={error || "Product not found"} retry={load} /></div>;

  const images = [product.imageUrl, ...(product.gallery || [])].filter(Boolean);
  const off = discountPercent(product.basePrice, product.specifications?.mrp);

  async function handleAdd() {
    if (!user) return navigate("/auth");
    // addToCart needs the product object (client-side cart)
    addToCart(product, qty);
  }

  async function handleBuyNow() {
    if (!user) return navigate("/auth");
    addToCart(product, qty);
    navigate("/cart");
  }

  async function handleWishlist() {
    if (!user) return navigate("/auth");
    await toggleWishlist(product.id);
  }

  async function submitReview(e) {
    e.preventDefault();
    if (!user) return navigate("/auth");
    setSubmittingReview(true);
    try {
      // Correct endpoint: POST /products/:slug/reviews
      // Required fields: rating (1-5), body (min 10 chars)
      await api.post(`/products/${slug}/reviews`, {
        rating: reviewForm.rating,
        body: reviewForm.body,
      });
      showToast("Review submitted!");
      setReviewForm({ rating: 5, body: "" });
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
            <img src={images[activeImg]} alt={product.name} />
          </div>
          <div className="gallery-thumbs">
            {images.map((img, i) => (
              <button key={i} className={i === activeImg ? "active" : ""} onClick={() => setActiveImg(i)}>
                <img src={img} alt="" />
              </button>
            ))}
          </div>
        </div>

        <div className="product-info">
          <div className="product-brand">{product.specifications?.brand || "RanchiKart"}</div>
          <h1>{product.name}</h1>
          <StarRating rating={product.rating} numReviews={product.reviewCount} size={16} />

          <div className="product-price-row large">
            <span className="price">{formatINR(product.basePrice)}</span>
            {off > 0 && (
              <>
                <span className="mrp">{formatINR(product.specifications?.mrp)}</span>
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

          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <div className="specs-table">
              <h3>Specifications</h3>
              <table>
                <tbody>
                  {Object.entries(product.specifications).map(([k, v]) => (
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
          <textarea
            placeholder="Share your experience... (min 10 characters)"
            value={reviewForm.body}
            onChange={(e) => setReviewForm((f) => ({ ...f, body: e.target.value }))}
            rows={3}
            minLength={10}
            required
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
              {/* API uses `body` field for review text */}
              {(r.body || r.comment) && <p>{r.body ?? r.comment}</p>}
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
