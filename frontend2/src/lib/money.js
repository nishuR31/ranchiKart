export function formatINR(amount) {
  return "₹" + (Number(amount || 0) / 100).toLocaleString("en-IN");
}

export function discountPercent(price, mrp) {
  if (!mrp || mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}
