# UrbanRanchi Backend Features

This document provides a catalogue of the major features implemented in the UrbanRanchi backend.

## 1. Authentication & Authorization
* **Email & Password Login:** Secure registration and login with bcrypt hashing.
* **Google OAuth:** Fastify-based OAuth flow using Google token exchange.
* **Magic Links:** Passwordless login via email tokens.
* **Two-Factor Authentication (TOTP):** App-based (Google Authenticator) 2FA support with QR codes.
* **Passkeys (WebAuthn):** Biometric login using device passkeys.
* **Role-Based Access Control:** Configurable `ADMIN` and `USER` roles via `requireRole` middleware.
* **JWT Management:** Access and refresh token rotation with Redis blacklisting.

## 2. Product Catalog
* **Products & Variants:** Support for base products and specific variants (e.g., sizes, colors) with stock tracking.
* **Category Tree:** Hierarchical categories for products.
* **Customization:** Dynamic validation of custom dimensions (width, height, text) via `pricing.ts`.
* **Search & Filters:** Search by query string, price range, categories, featured status, and minimum rating.
* **Caching:** Heavy caching of catalog responses via Redis.

## 3. Order & Checkout
* **Cart to Order:** Converts checkout data (products, variants, customizations, quantities) to strict order schema.
* **Coupons:** Support for `PERCENT` and `FIXED` discount codes, max uses, category restrictions, and minimum order requirements.
* **Shipping Fees:** Dynamic free shipping calculations (e.g., Free above ₹999).
* **PDF Invoices:** Generates clean, printer-friendly A4 PDF invoices upon payment completion.

## 4. Payment Integration (Razorpay)
* **Order Creation:** Generates a Razorpay order or a mock order (for development).
* **Verification:** Cryptographic signature verification using HMAC-SHA256.
* **Webhooks:** (If implemented) Secure event capture for payment completion.

## 5. Email Notifications
* **Smart Transports:** Supports both Gmail API (to bypass Render SMTP blocks) and standard SMTP transports.
* **Order Flow Emails:** Welcome emails, passwordless links, OTP verification, and order confirmation.
* **Invoice Delivery:** Attaches auto-generated PDF invoices directly to payment confirmation emails.

## 6. Admin & Analytics
* **Dashboard Stats:** Rich metrics including total revenue, order counts, new users, and 30-day revenue charts.
* **Top Products:** Analyzes best-selling items.
* **User & Order Management:** Soft-delete users, ban/unban logic, update order status.
* **Cron Jobs:** Background tasks (e.g., purging 90-day expired soft-deleted users).

## 7. Security & Infrastructure
* **Image Uploads:** Streams multipart uploads, optimizes to WebP using `sharp`, and uploads to ImgBB.
* **Rate Limiting:** Protects endpoints from brute force and DDoS.
* **Error Handling:** Standardized error mapping and stack trace suppression in production.
* **Swagger Documentation:** Auto-generated Swagger/OpenAPI docs for easy API consumption.
