import { Star } from "lucide-react";

export default function StarRating({ rating = 0, numReviews, size = 14 }) {
  return (
    <span className="star-rating">
      <span className="star-badge">
        {rating.toFixed ? rating.toFixed(1) : rating} <Star size={size - 3} fill="#fff" stroke="none" />
      </span>
      {typeof numReviews === "number" && <span className="review-count">({numReviews.toLocaleString("en-IN")})</span>}
    </span>
  );
}
