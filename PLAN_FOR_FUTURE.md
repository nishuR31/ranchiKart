# RanchiKart - Future Technical Roadmap & Testing Expansion Plan

## Production-Grade E-Commerce End-to-End Testing Gaps

The current backend test suite has strong coverage for Authentication, Authorization, User Management, and Core API Security. To make the test suite fully representative of a production-grade e-commerce system, the following end-to-end flows are planned for implementation:

1. **Complete Successful Order Lifecycle**
   - End-to-end integration flow: Cart item addition → Order creation → Payment initiation → Payment verification → Order status updates.

2. **Razorpay Integration & Signature Verification**
   - Unit and integration tests for Razorpay order generation.
   - HMAC SHA256 signature verification tests (valid signature vs spoofed signature rejection).

3. **Payment Webhook Handling**
   - Asynchronous payment event processing via Webhooks (`payment.captured`, `payment.failed`, `refund.processed`).
   - Webhook signature validation & idempotency checks.

4. **Product Reviews & Anti-Abuse**
   - Verified buyer review creation validation.
   - Duplicate review prevention per user per product.

5. **Inventory & Stock Management**
   - Automatic stock reduction upon successful order placement & payment confirmation.
   - Restocking / inventory restoration on order cancellation or payment failure.

6. **Concurrent Purchase & Race Condition Scenarios**
   - Simulating high-concurrency purchase attempts when stock is low (atomicity checks with database locks/transactions).

7. **File Upload Endpoints**
   - Testing image/asset upload endpoints (S3/Cloudinary/Local) with mime-type checking, file size validation, and malicious payload filtering.

8. **Session & Refresh Token Edge Cases**
   - Refresh token reuse detection & automatic revocation of compromised token families.
   - Concurrent device logins, explicit logout token blacklisting in Redis.
