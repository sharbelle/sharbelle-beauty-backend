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
- `PAYSTACK_SECRET_KEY=<paystack-secret-key>`
- `PAYSTACK_BASE_URL=https://api.paystack.co`
- `PAYSTACK_CALLBACK_URL=http://localhost:8080/checkout/callback`

## Run

```bash
npm install
npm run dev
```

Make sure your MongoDB instance is reachable at `MONGODB_URI` before starting the server.

## Paystack Webhook

Point your Paystack webhook URL to:

- `POST /api/checkout/webhook`

## Seed Accounts

- User: `amara@example.com` / `Password123!`
- User: `nadia@example.com` / `Password123!`
- Admin: `admin@sharbelle.com` / `Password123!`
