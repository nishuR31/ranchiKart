import React from "react";
import { Link } from "react-router-dom";

export default function FAQPage() {
  return (
    <div className="terms-page">
      <h1>Frequently Asked Questions</h1>
      
      <h3>How does delivery work?</h3>
      <p>
        UrbanRanchi offers fast, local delivery across all localities in Ranchi. Most orders in central Ranchi are delivered on the same day or the next business day. For other areas in Jharkhand, delivery typically takes 3-5 business days. Delivery is free for orders above ₹499!
      </p>

      <h3>What payment methods do you accept?</h3>
      <p>
        We accept a wide variety of payment methods to make your shopping experience convenient. You can pay using UPI, major credit/debit cards, net banking, or choose Cash on Delivery (COD) for eligible orders. All digital payments are securely processed by Razorpay.
      </p>

      <h3>How can I track my order?</h3>
      <p>
        Once you've placed an order, you can track its status by logging into your account and visiting the <Link to="/orders" style={{color: 'var(--brand)', textDecoration: 'underline'}}>Orders</Link> page. You will also receive email notifications as your order progresses from processing to dispatch and delivery.
      </p>

      <h3>What is your return policy?</h3>
      <p>
        We offer a hassle-free 7-day replacement policy. If your product arrives damaged, defective, or is incorrect, please contact our support team immediately. We will arrange a pickup and send a replacement as quickly as possible.
      </p>

      <h3>How is my personal data handled?</h3>
      <p>
        Your privacy is our top priority. We only collect the necessary information required to fulfill your orders and improve your experience. If you log in via Google, we use your basic profile information securely. We never sell your data to third parties. For more details, read our <Link to="/privacy" style={{color: 'var(--brand)', textDecoration: 'underline'}}>Privacy Policy</Link>.
      </p>

      <h3>How can I delete my account?</h3>
      <p>
        You can easily request account deletion from your <Link to="/profile" style={{color: 'var(--brand)', textDecoration: 'underline'}}>Profile</Link> page. Once requested, your account is immediately deactivated and your data is permanently purged after 90 days.
      </p>

      <h3>I have another question. How do I contact you?</h3>
      <p>
        We'd love to help! Please email us at <strong>{import.meta.env.VITE_EMAIL || 'support@urbanranchi.in'}</strong> and our support team will get back to you shortly.
      </p>
    </div>
  );
}
