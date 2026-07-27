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
      <h3>Account Deletion &amp; Data Retention</h3>
      <p>
        You have the right to request the deletion of your account at any time from your
        profile settings. Upon requesting account deletion, your account is immediately
        deactivated (soft deleted) and your profile becomes inaccessible. All associated
        personal data, saved addresses, and profile details will be permanently and
        irreversibly purged from our database after 90 days.
      </p>
      <h3>Account Restoration</h3>
      <p>
        If you change your mind within 90 days after deactivating your account, you can
        request account reactivation by emailing customer support. Account restoration is
        performed by an admin and takes up to 7 business days to process and reactivate your account.
      </p>
      <h3>Contact</h3>
      <p>Email: {import.meta.env.VITE_EMAIL} · Ranchi, Jharkhand 834001</p>
    </div>
  );
}
