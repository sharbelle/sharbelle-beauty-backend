# Sharbelle Backend

Express backend for auth + user order center APIs.

## Environment

Copy `.env.example` to `.env` and update values:

- `PORT=4000`
- `NODE_ENV=development`
- `JWT_SECRET=<strong-secret>`
- `JWT_EXPIRES_IN=7d`
- `FRONTEND_ORIGIN=http://localhost:8080`
- `MONGODB_URI=mongodb://127.0.0.1:27017/sharbelle-beauty`
- `FLUTTERWAVE_SECRET_KEY=<flutterwave-secret-key>` (starts with `FLWSECK`)
- `FLUTTERWAVE_SECRET_HASH=<flutterwave-webhook-secret-hash>`
- `FLUTTERWAVE_BASE_URL=https://api.flutterwave.com/v3`
- `FLUTTERWAVE_REDIRECT_URL=http://localhost:8080/checkout/callback`
- `FLUTTERWAVE_DEBUG=false` (set `true` temporarily to log outbound Flutterwave request/response metadata for debugging)

## Run

```bash
npm install
npm run dev
```

Make sure your MongoDB instance is reachable at `MONGODB_URI` before starting the server.

## Flutterwave Webhook

Point your Flutterwave webhook URL to:

- `POST /api/checkout/webhook`

## Delivery Pricing By Area/LGA

Checkout delivery fee is dynamic and resolved by shipping `areaLga`.

- Pricing is stored in MongoDB inside `store_settings.deliveryPricing`
- Update pricing via `PATCH /api/admin/settings` with:
  - `deliveryPricing.origin`
  - `deliveryPricing.defaultFee`
  - `deliveryPricing.areas` (`[{ areaLga, fee }]`)
- The checkout defaults endpoint (`GET /api/checkout/defaults`) returns the same delivery pricing config used to compute fees
- If an `areaLga` is not matched, the configured `defaultFee` is used
- On first run, defaults are auto-seeded from `src/config/delivery-zones.js`

## Waitlist

Public waitlist signup endpoint:

- `POST /api/waitlist`

Admin waitlist endpoints:

- `GET /api/admin/waitlist` (supports `search`, `page`, `limit`)
- `GET /api/admin/waitlist/export` (CSV download, supports `search`)

The frontend now stores waitlist signups from the landing page and admin users can view and export emails in the admin panel at `/admin/waitlist`.

## Seed Accounts

- User: `amara@example.com` / `Password123!`
- User: `nadia@example.com` / `Password123!`
- Admin: `admin@sharbelle.com` / `Password123!`
