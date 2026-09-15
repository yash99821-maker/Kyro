# KYRO — Smart Digital Payments & Money Management System

A full-stack digital payments and personal finance platform built as a BCA final-year project.

KYRO does everything a payment app is expected to do — send money, scan & pay, request money,
mobile recharge, bill payments and transaction history — and adds three features that a plain
UPI clone does not have:

| Feature | What it does |
| --- | --- |
| **Kyro Save** | Every payment is rounded up to the next ₹10 or ₹50 and the difference is automatically moved into a savings pot with a goal. |
| **Kyro Groups** | Create groups, log shared expenses with equal or custom splits, see who owes whom, and settle up. |
| **Kyro AI** | A rule-based spending intelligence engine that analyses your real transactions and generates personalised insights. |

> ### ⚠️ Important limitation
>
> **This is a college demonstration project. Payment transactions are simulated and do not
> transfer real money.** KYRO is not connected to any real UPI network, bank, payment gateway or
> SMS service.
>
> What *is* real is the software engineering: authentication, REST APIs, MongoDB persistence,
> server-side balance arithmetic, round-up savings, bill-splitting maths and spending analytics.
> Every number shown in the UI is read from the database — nothing is hardcoded in the frontend.

---

## Table of contents

1. [Project overview](#1-project-overview)
2. [Features](#2-features)
3. [Unique features explained](#3-unique-features-explained)
4. [Tech stack](#4-tech-stack)
5. [Project architecture](#5-project-architecture)
6. [Folder structure](#6-folder-structure)
7. [Environment variables](#7-environment-variables)
8. [MongoDB setup](#8-mongodb-setup)
8b. [Running on another machine](#8b-running-on-another-machine)
9. [Installation](#9-installation)
10. [Running the project](#10-running-the-project)
11. [Database seeding](#11-database-seeding)
12. [Demo credentials](#12-demo-credentials)
13. [API endpoints](#13-api-endpoints)
14. [Security](#14-security)
15. [Testing checklist](#15-testing-checklist)
16. [Limitations](#16-limitations)
17. [Viva questions and answers](#17-viva-questions-and-answers)

---

## 1. Project overview

KYRO is a MERN-style web application (MongoDB, Express, React, Node.js) written entirely in
TypeScript. It is a **payments + personal finance management platform**, not just a payment app.

The design goal was that every important piece of state — balances, transactions, savings,
groups, analytics — lives in MongoDB and is calculated on the server. The React frontend is a
presentation layer: it collects input, calls the REST API, and renders whatever the API returns.

**Responsive:** bottom navigation on phones, a sidebar on desktop, no horizontal scrolling at
any width down to 320px.

---

## 2. Features

### Payments
- **Send Money** — pick a KYRO contact or resolve a UPI ID, enter an amount, confirm with a PIN
- **Scan & Pay** — pay a KYRO QR code (merchant or person)
- **Request Money** — request from a contact, with pending / accepted / rejected tracking
- **My QR Code** — a scannable code so others can pay you
- **Mobile Recharge** — operator, plan selection and custom amounts
- **Bill Payments** — Electricity, Water, DTH, Gas, Broadband, FASTag, Insurance, Credit Card

### Money management
- **Kyro Save** — automatic round-up savings with a configurable goal
- **Kyro Groups** — group expenses, equal/custom splits, balances and settlements
- **Kyro AI** — category breakdown, weekly and monthly charts, and generated insights

### Account
- Passwordless login with mobile number + OTP
- Profile viewing and editing
- Settings: transaction PIN change, Kyro Save toggle, notification preferences, dark mode, language
- Notifications with read / mark-all-read
- Transaction history with search, category/type/status/date filters and sorting

### Engineering quality
- Loading skeletons on every API-driven screen
- Friendly error states with retry, including when the backend is offline
- Polished empty states — no blank screens
- Duplicate-payment protection (disabled buttons + a server-side duplicate check)
- Full keyboard accessibility, semantic HTML, ARIA labels, visible focus rings
- Light and dark themes

---

## 3. Unique features explained

### Kyro Save — automatic round-up savings

Whenever you make a payment, KYRO rounds the amount up to the next ₹10 or ₹50 and moves the
difference into your savings pot.

```
Payment ₹87   → rounded to ₹90   → ₹3 saved
Payment ₹126  → rounded to ₹130  → ₹4 saved     (nearest ₹10)
Payment ₹126  → rounded to ₹150  → ₹24 saved    (nearest ₹50)
Payment ₹100  → already round    → ₹0 saved
```

The calculation lives in [`server/src/services/savingsService.ts`](server/src/services/savingsService.ts):

```ts
export function calculateRoundUp(amount: number, roundTo: RoundUpType) {
  const roundedAmount = roundMoney(Math.ceil(amount / roundTo) * roundTo)
  const savedAmount = roundMoney(roundedAmount - amount)
  return { originalAmount: roundMoney(amount), roundedAmount, savedAmount }
}
```

Rules applied on every payment:
1. Skip if the user has Kyro Save turned off.
2. Skip if the round-up works out to ₹0 (an already-round amount is never charged extra).
3. Skip if the user cannot afford the extra amount — the balance can never go negative.
4. Otherwise move the money from `balance` to `savingsBalance` **and** write a `Saving` document,
   so the savings total is auditable rather than just a running counter.

### Kyro Groups — bill splitting

Balances are **never stored**. They are recomputed from the source collections on every read, so
they cannot drift out of sync:

```
net(member) = (what they paid)
            - (their share of every expense)
            + (settlements they have received)
            - (settlements they have paid)
```

A positive net means the group owes that member. A negative net means they owe the group.

Those net positions are then converted into a **minimal settlement plan** by repeatedly matching
the largest creditor with the largest debtor, producing at most `N-1` transfers for `N` people
instead of `N×(N-1)/2`.

Splits:
- **Equal** — the server divides the amount, distributing leftover paise so shares add up exactly
  (₹100 ÷ 3 → ₹33.34, ₹33.33, ₹33.33).
- **Custom** — the client supplies each share and the server **rejects the request** if the shares
  do not add up to the expense total.

### Kyro AI — rule-based spending intelligence

**This is not a machine-learning model.** It is a deterministic rule engine in
[`server/src/services/insightsService.ts`](server/src/services/insightsService.ts) that reads real
transactions from MongoDB, buckets spend by category and time window, compares one window against
the previous one, and emits an insight when a threshold is crossed.

| Rule | Condition | Example output |
| --- | --- | --- |
| R1 | A category rose ≥ 20% week-on-week | ⚠️ Your food spending increased 33% this week — ₹1,283 vs ₹963 last week. |
| R2 | A category fell ≥ 15% week-on-week | 💡 You spent 96% less on travel this week — ₹2,126 less than last week. |
| R3 | Largest category this month | 📊 Shopping accounts for 25% of your spending this month (₹1,899). |
| R4 | Total month-on-month change | 🎉 You have spent ₹10,943 less than last month so far. |
| R5 | Kyro Save goal progress | 🎯 1% towards Laptop Goal. ₹613 saved so far. |
| R6 | Savings rate this month | 🪙 7.35% of the money leaving your KYRO account went into savings. |

---

## 4. Tech stack

### Frontend (`/client`)
| Purpose | Technology |
| --- | --- |
| Framework | React 18 + TypeScript |
| Build tool | Vite 6 |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Routing | React Router 6 |
| HTTP | Axios (single instance with interceptors) |
| Charts | Recharts |
| Icons | Lucide React |
| QR codes | qrcode.react |

### Backend (`/server`)
| Purpose | Technology |
| --- | --- |
| Runtime | Node.js 20+ |
| Framework | Express 4 + TypeScript |
| Database | MongoDB with Mongoose 8 |
| Auth | JWT (`jsonwebtoken`) |
| Hashing | bcryptjs (transaction PINs and OTPs) |
| Validation | Zod |
| Logging | Morgan |
| Dev runner | tsx (watch mode) |

---

## 5. Project architecture

Nothing financial is decided in the browser. A payment travels through every layer:

```
  React component  (collects amount + PIN)
        ↓
  services/index.ts  →  Axios  →  POST /api/payments/send
        ↓
  Express route      (payment.routes.ts)
        ↓
  validate()         (Zod schema — rejects bad input)
        ↓
  requireAuth()      (JWT verified, user loaded from MongoDB)
        ↓
  paymentController  (shapes request/response)
        ↓
  paymentService     ── business logic ──────────────────┐
        │   1. verify PIN against its bcrypt hash        │
        │   2. re-validate the amount server-side        │
        │   3. check sufficient balance                  │
        │   4. debit the payer                           │
        │   5. credit the receiver (if a KYRO user)      │
        │   6. run the Kyro Save round-up                │
        │   7. write transaction + notifications         │
        └────────────────────────────────────────────────┘
        ↓
  Mongoose models    →  MongoDB
        ↓
  JSON response  →  success screen renders the stored values
```

The client never sends a balance or a savings amount — only the amount, the receiver and the PIN.

---

## 6. Folder structure

```
kyro/
├── client/                        # React frontend
│   ├── index.html
│   ├── vite.config.ts             # Vite config + /api proxy to the backend
│   ├── public/kyro-icon.svg       # KYRO favicon
│   └── src/
│       ├── main.tsx               # entry point, providers
│       ├── App.tsx                # routes + auth guard
│       ├── index.css              # KYRO design system (tokens, animations)
│       ├── assets/
│       ├── components/            # Logo, PinPad, PaymentSuccess, TransactionRow, ui.tsx …
│       ├── context/               # AuthContext, UiContext (toasts + theme)
│       ├── hooks/                 # useApiResource (loading / error / retry)
│       ├── layouts/               # AppLayout (bottom nav + sidebar), PageHeader
│       ├── pages/                 # one file per screen (20 pages)
│       ├── services/              # api.ts (axios) + index.ts (typed API calls)
│       ├── types/                 # shared TypeScript interfaces
│       └── utils/                 # formatting helpers
│
├── server/                        # Express + MongoDB backend
│   ├── .env.example
│   └── src/
│       ├── index.ts               # boots the server
│       ├── app.ts                 # Express app (CORS, JSON, routes, errors)
│       ├── config/                # env.ts, database.ts, constants.ts
│       ├── controllers/           # request/response handling
│       ├── models/                # Mongoose schemas
│       ├── routes/                # REST route definitions
│       ├── middleware/            # auth, validate, errorHandler
│       ├── services/              # business logic (payments, savings, groups, insights)
│       ├── utils/                 # ApiError, money, dates, reference ids
│       ├── validators/            # Zod schemas
│       └── seed/seed.ts           # demo data seeding script
│
├── package.json                   # root scripts (run both apps together)
└── README.md
```

### Database models

| Model | Purpose |
| --- | --- |
| `User` | name, mobileNumber, email, upiId, **transactionPinHash**, balance, savingsBalance, kyroSave settings |
| `Transaction` | userId, type, amount, category, sender, receiver, status, description, referenceId, roundUpAmount |
| `Saving` | userId, transactionId, originalAmount, roundedAmount, savedAmount, roundUpType |
| `Group` | name, description, emoji, createdBy, members[] |
| `Expense` | groupId, description, amount, paidBy, splitType, participants[] |
| `Settlement` | groupId, fromMemberId, toMemberId, amount, status, settledAt |
| `Notification` | userId, type, title, message, read, link |
| `MoneyRequest` | requesterId, payee, amount, note, status |
| `OtpToken` | mobileNumber, **codeHash**, attempts, expiresAt (TTL-indexed) |

---

## 7. Environment variables

Copy `server/.env.example` to `server/.env`:

```bash
cp server/.env.example server/.env
```

```env
# Leave empty to use the built-in embedded MongoDB (see section 8)
MONGODB_URI=

JWT_SECRET=change-this-to-a-long-random-secret
JWT_EXPIRES_IN=7d

PORT=5000
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

Generate a strong secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**Never commit your real `.env`** — it is already listed in `.gitignore`.

---

## 8. MongoDB setup

KYRO supports two modes.

### Option A — no installation needed (default)

**Leave `MONGODB_URI` empty.** KYRO automatically downloads and starts a real `mongod` process on
port **27018**, storing its data files in `server/.mongo-data/`.

This is a genuine MongoDB server with real data files on disk, so **your data survives restarts**.
It exists so the project runs on a machine with no MongoDB installation — useful for a lab
computer on demo day. The first run downloads the MongoDB binary (~100 MB) and needs internet;
after that it works offline.

### Option B — your own MongoDB

**Local install:**
```env
MONGODB_URI=mongodb://127.0.0.1:27017/kyro
```

**MongoDB Atlas (free tier):**
1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Database Access → add a user with a password.
3. Network Access → allow your IP (or `0.0.0.0/0` for a demo).
4. Connect → Drivers → copy the connection string:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/kyro?retryWrites=true&w=majority
```

---

## 8b. Running on another machine

Everything needed is in the project folder — but **`node_modules` is not included**, so the new
machine must install dependencies once.

### Requirements on the new machine
- **Node.js 20 or newer** (check with `node -v`; download from [nodejs.org](https://nodejs.org))
- **Internet for the first run only** — see the offline note below
- No MongoDB installation required

### Steps

```bash
# 1. Unzip the project, then open a terminal inside the KYRO folder
cd KYRO

# 2. Install dependencies (takes 1-2 minutes, needs internet)
npm run install:all

# 3. Create the environment file
copy server\.env.example server\.env      # Windows
# cp server/.env.example server/.env      # macOS / Linux

# 4. Load the demo data
npm run seed

# 5. Start the app
npm run dev
```

Then open **http://localhost:5173** and sign in with `9999999999` / OTP `123456` / PIN `1234`.

### First-run download

On the very first `npm run seed`, the embedded MongoDB downloads a `mongod` binary
(**about 62 MB**) into `<your home folder>/.cache/mongodb-binaries/`. This happens once per
machine. Everything after that works offline.

### If the machine has no internet (a college lab PC)

Pick whichever is easiest:

**Option 1 — carry the database binary with you (recommended)**

1. On a machine that has already run KYRO, find the binary in
   `C:\Users\<you>\.cache\mongodb-binaries\` (Windows) or `~/.cache/mongodb-binaries/` (macOS/Linux).
   It is named something like `mongod-x64-win32-7.0.24.exe`.
2. Copy it to a pen drive along with the project.
3. On the offline machine, copy it anywhere (e.g. `C:\kyro-db\mongod.exe`) and set this line in
   `server/.env`:

   ```env
   MONGOMS_SYSTEM_BINARY=C:/kyro-db/mongod.exe
   ```

   Use forward slashes. The binary is OS-specific — a Windows one only works on Windows.

**Option 2 — carry `node_modules` too**

Copy the whole project folder *including* the three `node_modules` directories (root, `server/`,
`client/`) after installing on your own machine. Then skip step 2 above entirely. This makes the
folder much larger (~400 MB) but removes the need for internet completely, apart from the mongod
binary in Option 1.

**Option 3 — install MongoDB on that machine** and set
`MONGODB_URI=mongodb://127.0.0.1:27017/kyro` in `server/.env`.

### Common problems

| Problem | Fix |
| --- | --- |
| `'npm' is not recognized` | Node.js is not installed, or the terminal was opened before installing it. Install Node 20+ and open a **new** terminal. |
| `Port 5000 is already in use` | Another app has the port. Change `PORT` in `server/.env`, or close the other app. |
| `Port 5173 is in use` | Vite automatically moves to 5174 — just use the URL it prints. |
| Seeding fails with `DBPathInUse` | An old KYRO server is still running. Close it, or just run `npm run seed` again — the seeder reuses a running instance. |
| Blank page / "Cannot reach the KYRO server" | The backend is not running. Make sure `npm run dev` shows both `[SERVER]` and `[CLIENT]` lines. |
| Download fails behind a college firewall | Use Option 1 or Option 3 above. |

---

## 9. Installation

**Requirements:** Node.js 20 or newer.

```bash
cd kyro

# install root, server and client dependencies in one command
npm run install:all

# create your environment file
cp server/.env.example server/.env
```

<details>
<summary>Or install each part manually</summary>

```bash
npm install                 # root (concurrently)
cd server && npm install    # backend
cd ../client && npm install # frontend
```
</details>

---

## 10. Running the project

### Run both together (recommended)

```bash
npm run dev
```

- Frontend → http://localhost:5173
- Backend  → http://localhost:5000/api

### Or run them in separate terminals

**Terminal 1 — backend:**
```bash
cd server
npm install
npm run dev
```

**Terminal 2 — frontend:**
```bash
cd client
npm install
npm run dev
```

The Vite dev server proxies `/api` to `http://localhost:5000`, so there is no CORS setup to do
and no API URL to configure in the frontend.

### Production build

```bash
npm run build     # compiles the server to dist/ and builds the client
npm start         # runs the compiled server
```

---

## 11. Database seeding

```bash
npm run seed
```

Safe to run while the dev server is running — the seeder reuses the already-running database
rather than starting a second one.

The seed script **wipes the KYRO collections** and creates:

- The demo user **Harish Sharma**, four friends and 13 merchant accounts
- **147 transactions** spread over 6 months, categorised so Kyro AI has real data to compare
- **134 Kyro Save round-up records** derived from those transactions
- **2 groups** (`Weekend Trip`, `College Friends`) with equal splits, a custom split and a settlement
- Money requests and notifications

Food spending is deliberately higher this week than last week, and travel lower, so the Kyro AI
warning and positive rules both fire during a demonstration.

> All seeded records are clearly demo data. No real person, account or payment is involved.

---

## 12. Demo credentials

| Field | Value |
| --- | --- |
| Mobile number | `9999999999` |
| OTP | `123456` |
| Transaction PIN | `1234` |
| Opening balance | ₹25,450 |

You can also sign in with **any other 10-digit number** to create a fresh account — it also gets
the ₹25,450 demo opening balance and PIN `1234`.

**Notes:**
- The OTP is not sent by SMS, but it is still **generated, hashed, stored with a 5-minute expiry
  and verified by the backend**. Entering the wrong code is rejected by the server.
- The PIN is never displayed in the UI and is stored only as a bcrypt hash.
- You can change the PIN in **Settings → Transaction PIN**.

---

## 13. API endpoints

All routes are prefixed with `/api`. Everything except `login` and `verify-otp` requires an
`Authorization: Bearer <token>` header.

### Authentication
| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/auth/login` | Issue an OTP challenge for a mobile number |
| POST | `/auth/verify-otp` | Verify the OTP, create/sign in the user, return a JWT |
| POST | `/auth/logout` | Log out |
| GET | `/auth/me` | Current signed-in user |

### Users
| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/users/me` | Profile |
| PUT | `/users/me` | Update name / email / picture |
| PUT | `/users/me/pin` | Change the transaction PIN |
| GET | `/users/directory` | Other KYRO users you can pay |
| GET | `/users/lookup?upiId=` | Resolve a UPI ID |

### Payments
| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/payments/send` | Person-to-person transfer |
| POST | `/payments/scan` | Pay a scanned KYRO QR code |
| POST | `/payments/recharge` | Simulated mobile recharge |
| POST | `/payments/bill` | Simulated bill payment |
| GET | `/payments/resolve-qr?payload=` | Resolve a QR payload to a payee |

### Transactions
| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/transactions` | Search, filter, sort and paginate |
| GET | `/transactions/summary` | Today's totals |
| GET | `/transactions/:id` | Single transaction |

### Kyro Save
| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/savings` | Totals, goal progress and recent round-ups |
| GET | `/savings/history` | Full round-up ledger |
| PUT | `/savings/settings` | Toggle on/off, round-up amount, goal |

### Kyro Groups
| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/groups` | Create a group |
| GET | `/groups` | Your groups with net positions |
| GET | `/groups/:id` | Members, expenses, settlements, balances |
| DELETE | `/groups/:id` | Delete a group (creator only) |
| POST | `/groups/:id/members` | Add a member |
| DELETE | `/groups/:id/members/:memberId` | Remove a member |
| POST | `/groups/:id/expenses` | Add an expense (equal or custom split) |
| DELETE | `/groups/:id/expenses/:expenseId` | Delete an expense |
| GET | `/groups/:id/balances` | Computed balances + settlement plan |
| POST | `/groups/:id/settle` | Record a settlement |

### Kyro AI
| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/insights` | Full report: totals, categories, charts, insights |
| GET | `/insights/weekly` | This week vs last week, day by day |
| GET | `/insights/monthly` | Last 6 months |
| GET | `/insights/categories?period=` | Category breakdown |

### Notifications & requests
| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/notifications` | List with unread count |
| PUT | `/notifications/:id/read` | Mark one as read |
| PUT | `/notifications/read-all` | Mark all as read |
| POST | `/requests` | Request money |
| GET | `/requests` | Requests sent and received |
| PUT | `/requests/:id/status` | Accept or reject |
| DELETE | `/requests/:id` | Cancel a request you sent |

### Health
`GET /api/health` → `{ "success": true, "status": "ok" }`

---

## 14. Security

- **Transaction PINs are never stored in plain text** — bcrypt hashed, and the field is
  `select: false` so it is never returned by an ordinary query.
- **OTPs are hashed too**, with a 5-minute TTL index and a 5-attempt limit.
- **JWT authentication middleware** protects every private route; a 401 clears the session.
- **All input validated with Zod** before it reaches a controller.
- **Amounts and balances are computed server-side.** The client cannot submit a balance.
- **Balances can never go negative** — insufficient funds is rejected before anything is written.
- **Duplicate payment protection** — identical payments within 10 seconds are rejected.
- **CORS** is restricted to the configured client origin.
- **Secrets live in `.env`**, which is gitignored. `.env.example` documents them with no real values.
- **Centralised error handling** returns a safe message and never leaks a stack trace in production.

---

## 15. Testing checklist

Every flow below was verified end to end against the running application.

- [x] **Auth** — login → OTP → dashboard; wrong OTP rejected by the server
- [x] **Send Money** — amount → PIN → success → transaction stored → balance updated → Kyro Save updated
- [x] **Wrong PIN** — rejected by the backend; balance unchanged
- [x] **Insufficient balance** — rejected; nothing written
- [x] **Scan & Pay** — QR resolved → amount → PIN → success
- [x] **Recharge / Bills** — simulated payment stored with provider metadata
- [x] **Kyro Save** — ₹126 → ₹4 saved (nearest ₹10); ₹126 → ₹24 saved (nearest ₹50); ₹100 → ₹0
- [x] **Kyro Save settings** — enable/disable and round-up size persist to the database
- [x] **Groups** — create → add members → equal split → custom split → balances → settle up
- [x] **Custom split validation** — a split that does not add up is rejected
- [x] **Over-settlement** — settling more than is owed is rejected
- [x] **Kyro AI** — insights generated from real transactions; charts render
- [x] **History** — search, filters, sorting, grouping, detail page
- [x] **Profile** — loads from the database; editing persists
- [x] **PIN change** — old PIN required; the new PIN then works for a payment
- [x] **Logout** — protected routes become inaccessible
- [x] **Backend offline** — a friendly error is shown and the app does not crash
- [x] **Responsive** — no horizontal scroll at 320px, 420px, 768px or 1440px

---

## 16. Limitations

This project intentionally **does not** connect to:

- Real UPI infrastructure or NPCI
- Real banks or bank accounts
- Real payment gateways
- A real SMS/OTP provider
- Any real money movement

Also out of scope:

- The device camera is not used for QR scanning — the Scan page offers sample KYRO QR codes and a
  paste field, which then go through the same backend endpoints a camera scan would use.
- Accepting a money request marks it as agreed; the payer still completes the payment through the
  normal Send Money flow with their PIN.
- A settlement records a repayment inside a group; it does not move money between KYRO balances.
- Only English is fully translated.

---

## 17. Viva questions and answers

**Q: Is this a real payment app?**
No. It is a functional simulation of one. The payment logic, database, APIs and financial
calculations are real; the money movement is simulated. No bank or UPI network is involved.

**Q: Is Kyro AI machine learning?**
No, and the project does not claim it is. Kyro AI is a *rule-based financial insight engine* that
analyses transaction patterns and generates personalised spending alerts. It reads real
transactions from MongoDB, aggregates them by category and time window, compares consecutive
windows, and emits an insight when a defined threshold is crossed. Every rule is in
`insightsService.ts` and can be explained line by line.

**Q: Where is the round-up calculated?**
On the server, in `savingsService.calculateRoundUp()`. The frontend shows a preview so the user
knows what to expect, but the amount that is actually saved is always the server's calculation.

**Q: How do you stop someone from tampering with the amount or balance?**
The client only ever sends the amount, the receiver and the PIN. The server verifies the PIN
against a bcrypt hash, re-validates the amount with Zod, reads the current balance from MongoDB,
and does all the arithmetic itself. A tampered request cannot produce a balance the server did
not compute.

**Q: How are group balances calculated?**
They are never stored. On every read the server sums what each member paid, subtracts their share
of every expense, and applies settlements. Those net positions are then reduced to a minimal set
of transfers by matching the largest creditor with the largest debtor.

**Q: Why MongoDB rather than SQL?**
The data is document-shaped — a transaction carries nested sender/receiver objects and free-form
metadata, and a group carries an array of members. Mongoose gives schema validation and typed
models, and the aggregation pipeline does the analytics work for Kyro AI directly in the database.

**Q: What happens if the backend is down?**
Axios interceptors turn the failure into a friendly message ("Cannot reach the KYRO server…"),
every data screen shows an error state with a Try Again button, and the app does not crash.

---

**KYRO** · Smart Digital Payments & Money Management
Built with React, Express and MongoDB · College demonstration project · Payments are simulated.
