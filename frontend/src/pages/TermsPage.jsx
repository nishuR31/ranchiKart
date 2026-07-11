export default function TermsPage() {
  return (
    <div className="terms-page">
      <h1>Terms &amp; Policies</h1>
      <h3>Delivery</h3>
      <p>
        RanchiKart delivers across all localities within Ranchi city, typically within
        1-2 business days, and across the rest of Jharkhand within 3-5 business days.
        Delivery fees and estimated timelines are shown at checkout based on your pincode.
        Orders above ₹499 qualify for free delivery.
      </p>
      <h3>Payments</h3>
      <p>
        We accept Cash on Delivery as well as UPI, debit/credit cards, and net banking
        through Razorpay's secure payment gateway.
      </p>
      <h3>Returns &amp; Replacement</h3>
      <p>
        Most products are eligible for a 7-day easy replacement if they arrive damaged,
        defective, or different from what was ordered. Contact support with your order
        number to initiate a replacement.
      </p>
      <h3>Contact</h3>
      <p>Email: {import.meta.env.VITE_EMAIL} · Ranchi, Jharkhand 834001</p>
    </div>
  );
}
