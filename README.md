# NextStep Talent (MERN)

Complete MERN prototype for a structured international career pathway platform.

## Stack
- Frontend: React + Vite + Tailwind CSS + React Router
- Backend: Node.js + Express + MongoDB + Mongoose
- Auth: JWT
- Uploads: Multer (Cloudinary-ready architecture placeholder)
- Payments: Stripe-style placeholder endpoints
- Email: Nodemailer placeholder utility
- PDF: PDFKit placeholder generation
- Signing: Simulated DocuSign-style signature UI

## Project Structure
- `frontend/` React application with all required pages, routes, components, and protected flows.
- `backend/` Express API with models, controllers, middleware, and route modules.

## Setup

### 1) Backend
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

### 2) Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` and expects backend at `http://localhost:5001` by default.

## Admin Access

### 1) Open admin page
- Go to `http://localhost:5173/admin`
- The page shows an admin login form directly.

### 2) Default admin credentials
- Set these in `backend/.env`:
  - `ADMIN_EMAIL`
  - `ADMIN_PASSWORD`
  - optional `ADMIN_NAME`
- Admin auth is validated directly from environment variables and is not stored in MongoDB.

### 3) Optional custom admin creation
Not required for default admin access. Use `.env` credentials instead.

### 4) Review and approve candidates
In `/admin`:
- `Candidates` section shows candidate list and current status
- Use buttons:
  - `Accept Candidate`
  - `Reject Candidate`
  - `Mark Selected`
  - `Mark Not Selected`
  - `Sent to Hiring Partners`
- `Add Interview` section allows creating interview records
- `Mark Document Status` lets admin set document verification state

## Key API Routes
- Auth: `/api/auth/signup`, `/api/auth/login`, `/api/auth/verify-email`, `/api/auth/send-phone-otp`, `/api/auth/verify-phone`
- Eligibility: `/api/eligibility/check`, `/api/eligibility/:id`
- Profile: `/api/profile`, `/api/profile/me`, `/api/profile/generate-pdf`
- Payments: `/api/payments/create`, `/api/payments/confirm`, `/api/payments/me`
- Documents: `/api/documents/upload`, `/api/documents/me`, `/api/documents/:id/status`
- Dashboard: `/api/dashboard/me`
- Interviews: `/api/interviews/me`, `/api/interviews`
- Testimonials: `/api/testimonials`
- Admin: `/api/admin/candidates`, `/api/admin/candidates/:id/status`

## API Docs (Swagger)
- Swagger UI: `/api/docs` (redirects to `/api/docs/`)
- OpenAPI JSON: `/api/docs.json`

Local example:
- `http://localhost:5001/api/docs`

## Stripe Checkout Setup
- Backend env variables required:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `FRONTEND_URL`
- Frontend env variable required:
  - `VITE_STRIPE_PUBLISHABLE_KEY`
- Checkout flow:
  - Frontend calls `POST /api/payments/create`
  - Backend creates Stripe Checkout Session and returns `checkoutUrl`
  - Frontend redirects to Stripe hosted checkout
  - On success redirect, frontend calls `POST /api/payments/confirm` with `session_id`
- Webhook endpoint for Stripe:
  - `POST /api/payments/webhook`
  - Configure this endpoint in Stripe with `checkout.session.completed` events

## Notes
- Payment, OTP, email delivery, and Stripe interactions are simulated placeholders suitable for prototype/demo flow.
- Uploaded files and generated PDFs are saved under `backend/uploads/`.
- `/admin` includes built-in admin login and review controls.
