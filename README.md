# Gym Trainer

Gym Trainer is a subscription-based fitness web application built with Next.js 14, React 18, Firebase, Tailwind CSS, and Razorpay. It supports member registration, paid plan activation, BMI-based content access, transaction history, and a trainer-only admin panel for managing day-wise fitness content.

## Stack

- Next.js 14 App Router
- React 18
- TypeScript
- Tailwind CSS
- Firebase Auth
- Cloud Firestore
- Firebase Admin SDK
- Razorpay
- Nodemailer

## Core Features

- Email/password registration and login with Firebase Authentication
- User profile storage in Firestore
- BMI calculation from weight and height
- Subscription plans with upgrade, downgrade, renewal, and expiry handling
- Razorpay order creation and payment verification
- Day-wise workout, diet, and tip content
- Content filtering by plan level and BMI category
- Transaction history with unsubscribe flow protected by OTP
- Trainer/admin dashboard for content and user management
- Reminder email endpoint for non-subscribed users
- Light/dark theme support

## Plans

The app currently defines three plans in [src/lib/plans.ts](/C:/Users/s14ay/Desktop/gym-trainer/src/lib/plans.ts:1):

- `plan_100`: Basic Plan, level 1, INR 100
- `plan_200`: Pro Plan, level 2, INR 200
- `plan_500`: Premium Plan, level 3, INR 500

Subscription duration is 30 days. Upgrades are immediate, renewals are allowed near expiry, and downgrades are scheduled for the next cycle when applicable.

## User Flow

1. A guest lands on `/` and is redirected to register or login.
2. On registration, the app stores profile fields, BMI, BMI category, role, and an inactive subscription document in Firestore.
3. Authenticated users without an active plan are redirected to `/plans`.
4. Plan purchase starts a Razorpay order via `/api/create-order`.
5. Successful checkout is verified through `/api/verify-payment`.
6. The verified payment updates the user subscription and creates a transaction record.
7. Active subscribers access `/dashboard`, where content is unlocked by:
   - current subscription day
   - plan level
   - BMI category

## Admin Flow

Admin access is controlled by the trainer email and/or a Firestore `role` of `admin`.

Key admin routes:

- `/admin/login`: trainer-only login
- `/admin`: admin overview
- `/admin/add-content`: add day-wise content
- `/admin/manage-content`: edit or delete content
- `/admin/users`: review users and send reminder emails

The trainer email is read from `NEXT_PUBLIC_TRAINER_EMAIL` and falls back to `trainer@gmail.com`.

## Main Routes

Public or auth-entry routes:

- `/`
- `/register`
- `/login`
- `/admin/login`

Authenticated user routes:

- `/plans`
- `/dashboard`
- `/profile`
- `/history`
- `/settings`
- `/help`
- `/about`
- `/privacy`
- `/terms`

Admin routes:

- `/admin`
- `/admin/add-content`
- `/admin/manage-content`
- `/admin/users`

## API Routes

- `/api/create-order`
  Creates a Razorpay order for a selected plan.

- `/api/verify-payment`
  Verifies the Razorpay signature, updates the subscription in Firestore, and writes a transaction record.

- `/api/auth/send-otp`
  Sends an OTP email for unsubscribe verification. If SMTP is not configured, it returns a simulated OTP response.

- `/api/auth/unsubscribe`
  Sends an email notification after unsubscribing.

- `/api/admin/send-reminders`
  Sends reminder emails to users without an active subscription. If SMTP is not configured, it simulates the run.

## Firestore Data Model

### `users`

Stores user profile and subscription state.

Typical fields:

- `uid`
- `name`
- `email`
- `phoneNumber`
- `weight`
- `height`
- `bmi`
- `bmiCategory`
- `role`
- `subscription`
- `createdAt`
- `updatedAt`

### `content`

Stores day-wise fitness content.

Typical fields:

- `title`
- `description`
- `content`
- `type` (`workout`, `diet`, `tip`)
- `planLevel`
- `dayNumber`
- `bmiCategory`
- `createdAt`

### `transactions`

Stores successful plan payments.

Typical fields:

- `userId`
- `planId`
- `amount`
- `paymentId`
- `status`
- `createdAt`

### `otp_verifications`

Stores unsubscribe OTP records.

Typical fields:

- `userId`
- `otp`
- `expiresAt`
- `verified`

## Environment Variables

Create a `.env.local` file with the variables used by the app:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

NEXT_PUBLIC_TRAINER_EMAIL=

NEXT_PUBLIC_RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

Notes:

- `FIREBASE_ADMIN_PRIVATE_KEY` must preserve newlines correctly. The server code already converts escaped `\n` sequences.
- `SMTP_*` variables are optional for local development. Without them, OTP and reminder flows fall back to simulated behavior.
- Do not commit real credentials to source control.

## Local Development

Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run dev
```

Open `http://localhost:3000`.

Other scripts:

```bash
npm run build
npm run start
npm run lint
```

## Security Rules

Firestore rules are defined in [firestore.rules](/C:/Users/s14ay/Desktop/gym-trainer/firestore.rules:1).

At a high level:

- users can read and update their own profile
- admins can manage all users
- signed-in users can read content
- only admins can write content
- users can access only their own transactions unless admin
- signed-in users can manage OTP verification documents

## Project Structure

```text
src/
  app/
    admin/
    api/
    dashboard/
    history/
    login/
    plans/
    profile/
    register/
    settings/
  components/
  hooks/
  lib/
  types/
```

Important files:

- [src/lib/auth.ts](/C:/Users/s14ay/Desktop/gym-trainer/src/lib/auth.ts:1): subscription state and upgrade/renewal logic
- [src/lib/plans.ts](/C:/Users/s14ay/Desktop/gym-trainer/src/lib/plans.ts:1): static plan definitions
- [src/lib/content.ts](/C:/Users/s14ay/Desktop/gym-trainer/src/lib/content.ts:1): content typing and visibility helpers
- [src/lib/firebase.ts](/C:/Users/s14ay/Desktop/gym-trainer/src/lib/firebase.ts:1): client Firebase initialization
- [src/lib/firebaseAdmin.ts](/C:/Users/s14ay/Desktop/gym-trainer/src/lib/firebaseAdmin.ts:1): server Firebase Admin initialization

## Current Behavior Notes

- The home route is only a redirect layer and does not render a standalone landing page.
- Dashboard content is limited to content published within 30 days.
- History shows the last 60 days of transactions and deletes older records client-side during refresh.
- Unsubscribe requires OTP verification and then clears the subscription state in Firestore.
- The app loads Razorpay checkout globally in the root layout.

## Recommendation

The repository currently has a real `.env.local` file in the project root. If those credentials are active, rotate them and replace the file contents with local-only values that are not shared or committed.
