# Changelog — feature/r2-uploads

## Changes since `develop`

1. **Recurring job generation** — added logic to automatically create recurring jobs from a `RecurringRule`

2. **File uploads via R2 (Cloudflare)** — full integration to upload and manage files through Cloudflare R2

3. **Invoice discount: percentage or fixed amount** — the `discount` field now supports two modes: percentage (e.g. 10%) or fixed value (e.g. $100); calculations are handled by the frontend

4. **Invoice item: `no_price` type** — added `no_price` option for invoice items to support descriptive lines with no monetary value (qty, unit price and total are set to 0)
