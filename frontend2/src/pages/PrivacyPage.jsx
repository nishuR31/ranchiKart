import React from "react";

export default function PrivacyPage() {
  return (
    <div className="terms-page">
      <h1>Privacy Policy</h1>
      <p>Last updated: {new Date().toLocaleDateString()}</p>
      
      <h3>1. Information We Collect</h3>
      <p>
        When you use RanchiKart, we collect certain personal information to provide and improve our services.
        If you sign up or log in using Google OAuth, we collect your name, email address, and profile picture provided by Google.
        We also collect information you provide directly, such as your delivery addresses, phone numbers, and order history.
      </p>

      <h3>2. How We Use Your Information</h3>
      <p>
        Your information is used to:
      </p>
      <ul>
        <li>Create and securely manage your account.</li>
        <li>Process and fulfill your orders, including local delivery across Ranchi and Jharkhand.</li>
        <li>Send important notifications regarding your orders and account security.</li>
        <li>Personalize your shopping experience and display relevant local products.</li>
        <li>Authenticate you seamlessly using Google OAuth without requiring additional passwords.</li>
      </ul>

      <h3>3. Information Sharing & Third Parties</h3>
      <p>
        We respect your privacy and do not sell your personal data to third parties. We may share necessary information with trusted third-party service providers (like payment gateways such as Razorpay and our delivery partners) strictly for the purpose of completing your transactions and delivering your orders.
        When you log in via Google, we abide by the Google API Services User Data Policy, including the Limited Use requirements.
      </p>

      <h3>4. Data Security & Retention</h3>
      <p>
        We employ industry-standard security measures to protect your data. Your profile and order data are retained as long as your account is active. If you request account deletion, your personal data will be purged from our active databases after a 90-day grace period, subject to our legal obligations.
      </p>

      <h3>5. Your Rights & Data Deletion</h3>
      <p>
        You have the right to access, update, or delete your personal information. You can manage your profile details and request account deletion directly from the Profile section of our app. Upon receiving a deletion request, we will remove your Google OAuth link and delete your personal identifiable data within 30 days.
      </p>

      <h3>6. Changes to This Policy</h3>
      <p>
        We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated revision date.
      </p>

      <h3>7. Contact Us</h3>
      <p>
        If you have any questions or concerns about this Privacy Policy or our data practices, please contact us at <strong>{import.meta.env.VITE_EMAIL || 'support@ranchikart.in'}</strong>.
      </p>
    </div>
  );
}
