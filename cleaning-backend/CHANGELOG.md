# Changelog — feature/r2-uploads

## 2026-05-10

5. **Email service — full redesign with multilingual HTML templates** — `email.service.js` completely rewritten using Resend; all emails share a branded `baseLayout` (gradient header, card body, footer); three languages supported throughout: `en`, `es`, `it`
   - **Welcome email** (`sendWelcomeEmail`) — sent after registration; includes business name, feature list, and dashboard CTA
   - **Reset password email** (`sendResetPasswordEmail`) — includes a 1-hour expiry link, warning block, and plain-text URL fallback
   - **Email verification** (`sendVerificationEmail`) — sent after sign-up; 24-hour expiry link with confirmation note
   - **Invoice email** (`sendInvoiceEmail`) — full invoice rendered in HTML (line items, subtotal, discount, tax, total); supports `no_price` item type (displays "—" for qty/price/total); PDF attached via `generateInvoicePdfBuffer`; CTA links to the invoice page
   - Italian language implemented

---

## Changes since `develop`

1. **Recurring job generation** — added logic to automatically create recurring jobs from a `RecurringRule`

2. **File uploads via R2 (Cloudflare)** — full integration to upload and manage files through Cloudflare R2

3. **Invoice discount: percentage or fixed amount** — the `discount` field now supports two modes: percentage (e.g. 10%) or fixed value (e.g. $100); calculations are handled by the frontend

4. **Invoice item: `no_price` type** — added `no_price` option for invoice items to support descriptive lines with no monetary value (qty, unit price and total are set to 0)
