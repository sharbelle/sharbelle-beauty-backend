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

Checkout delivery fee is now dynamic and resolved by the shipping `areaLga`.

- Configure origin, fallback fee, and area fees in `src/config/delivery-zones.js`
- The current delivery origin is `Yaba, Lagos`
- If an `areaLga` is not found in the map, the configured default delivery fee is used

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
