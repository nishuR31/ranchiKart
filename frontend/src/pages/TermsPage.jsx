import React from "react";

export default function TermsPage() {
  return (
    <div className="terms-page">
      <h1>Terms of Service</h1>
      <p>Last updated: {new Date().toLocaleDateString()}</p>
      
      <h3>1. Acceptance of Terms</h3>
      <p>
        By accessing and using the UrbanRanchi application and website, you accept and agree to be bound by the terms and provision of this agreement.
      </p>

      <h3>2. Description of Service</h3>
      <p>
        UrbanRanchi is a local e-commerce and delivery platform that connects consumers with retail goods, fashion, and groceries within Ranchi and the state of Jharkhand. We provide the technology platform to browse, purchase, and track the delivery of these goods.
      </p>

      <h3>3. User Accounts and Security</h3>
      <p>
        To use certain features of the service, you must register for an account (e.g., via Google OAuth). You are responsible for maintaining the confidentiality of your account information and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
      </p>

      <h3>4. Purchases and Payments</h3>
      <p>
        All prices shown are in Indian Rupees (INR) and are inclusive of relevant taxes unless stated otherwise. We reserve the right to refuse or cancel any order for any reason, including limitations on quantities available for purchase, inaccuracies, or errors in product or pricing information. Payments are processed securely via third-party gateways (e.g. Razorpay).
      </p>

      <h3>5. Delivery and Risk of Loss</h3>
      <p>
        Delivery timelines provided are estimates. While we strive to meet these estimates, we are not liable for delays caused by factors outside our control. The risk of loss and title for items purchased pass to you upon delivery of the items to the carrier or to you directly.
      </p>

      <h3>6. Returns, Refunds, and Replacements</h3>
      <p>
        Our return and replacement policies are outlined in our FAQs. Generally, eligible products can be replaced within 7 days of delivery if they are defective, damaged, or incorrect. We reserve the right to deny returns that do not meet our criteria.
      </p>

      <h3>7. Intellectual Property</h3>
      <p>
        All content included on the UrbanRanchi platform, such as text, graphics, logos, images, and software, is the property of UrbanRanchi or its content suppliers and protected by copyright and intellectual property laws.
      </p>

      <h3>8. Limitation of Liability</h3>
      <p>
        UrbanRanchi shall not be liable for any indirect, incidental, special, consequential or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the services.
      </p>

      <h3>9. Changes to Terms</h3>
      <p>
        We reserve the right to modify these terms at any time. We will provide notice of these changes by updating the revised date at the top of this page. Your continued use of the platform after any such changes constitutes your acceptance of the new Terms of Service.
      </p>
    </div>
  );
}
