# Neuron Bank

Neuron Bank is a digital banking application. A customer signs up online, which
creates both a user profile and a savings account in a single step. The account
starts in a `pending` state and stays unusable until a bank admin approves it.
Once approved, the customer can add money to their account, send money to any
other Neuron Bank account, and apply for a loan.

The project is split into three parts:

| Folder                                     | What it is                             | Status         |
| ------------------------------------------ | -------------------------------------- | -------------- |
| [backend/](backend/)                       | REST API — Node.js, Express, MongoDB   | In progress    |
| [customer_frontend/](customer_frontend/)   | Customer-facing web app                | Not started    |
| [admin_frontend/](admin_frontend/)         | Admin console for bank staff           | Not started    |

## How it works

1. **Verify email** — a customer asks for a 6-digit code, receives it by email,
   and submits it back. Only a verified email can go on to register.
2. **Register** — a customer signs up. A `User` (status `pending`) and an
   `Account` (status `pending`) are created together in one transaction, and a
   savings account number is generated (`SAV` + timestamp + random digits).
3. **Admin approval** — an admin approves the account. The account becomes
   `active`, and the owner is promoted from `pending` to `active`.
4. **Banking** — an active customer can deposit money, transfer money to
   another active account, and submit a loan request.

Logging in is also two steps: the password is checked first, then a one-time
code is emailed and must be submitted before any token is issued.

Every money movement is written to the `Transaction` collection as a
double-entry pair (a `debit` row on the sender's account and a `credit` row on
the receiver's), inside a MongoDB transaction so a partial transfer can never
be committed.

### Roles

- **customer** — default role on registration. Can deposit, transfer, and
  request loans.
- **admin** — can approve pending accounts. Admin users are created directly in
  the database; there is no signup route for them.

### Statuses

- **User**: `pending`, `active`, `suspended`, `rejected`
- **Account**: `pending`, `active`, `rejected`, `closed`
- **Transaction**: `completed`, `failed`, `reversed`
- **Loan request**: `pending`, `approved`, `rejected`

## Tech stack

- **Runtime**: Node.js
- **Framework**: Express 5
- **Database**: MongoDB with Mongoose 9 (replica set required — the code uses
  multi-document transactions)
- **Auth**: JWT access + refresh tokens (`jsonwebtoken`)
- **Password hashing**: `bcryptjs`
- **Validation**: `express-validator`
- **Email**: `nodemailer` over SMTP, with HTML/text bodies in
  [backend/templates/](backend/templates/)

## Getting started

```bash
cd backend
npm install
cp .env.example .env    # then fill in real values
npm start               # runs app.js with nodemon
```

### Environment variables

| Variable                 | Meaning                                        |
| ------------------------ | ---------------------------------------------- |
| `MONGODB_URI`            | MongoDB connection string                      |
| `PORT`                   | Server port (defaults to `3000`)               |
| `JWT_ACCESS_SECRET`      | Secret for signing access tokens               |
| `JWT_ACCESS_EXPIRES_IN`  | Access token lifetime, e.g. `15m`              |
| `JWT_REFRESH_SECRET`     | Secret for signing refresh tokens (must differ)|
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime, e.g. `7d`              |
| `BCRYPT_SALT_ROUNDS`     | bcrypt cost factor (defaults to `12`)          |
| `CLIENT_ORIGINS`         | Comma-separated origins allowed by CORS        |
| `SMTP_HOST`              | SMTP server, e.g. `smtp.gmail.com`             |
| `SMTP_PORT`              | SMTP port, e.g. `465`                          |
| `SMTP_SECURE`            | `false` for STARTTLS ports; otherwise TLS      |
| `SMTP_USER`              | SMTP username (the full email address)         |
| `SMTP_PASS`              | SMTP password — for Gmail, an **App Password** |
| `MAIL_FROM`              | From header (defaults to `SMTP_USER`)          |

> Gmail rejects normal account passwords over SMTP. Turn on 2-Step Verification
> on the sending account, then generate a 16-character App Password and use that
> as `SMTP_PASS`.

---

# API Reference

Base URL: `http://localhost:3000`

All request and response bodies are JSON. Protected routes need an access token
in the header:

```
Authorization: Bearer <accessToken>
```

## Endpoint summary

| Method  | Endpoint                                | Auth           | Purpose                          |
| ------- | --------------------------------------- | -------------- | -------------------------------- |
| `GET`   | `/`                                     | Public         | Health check / welcome message   |
| `POST`  | `/send-verification-code`               | Public         | Email a 6-digit code             |
| `POST`  | `/verify-email-code`                    | Public         | Confirm the code                 |
| `POST`  | `/register`                             | Public         | Create a customer + account      |
| `POST`  | `/login`                                | Public         | Check password, email a code     |
| `POST`  | `/verify-login-code`                    | Public         | Confirm the code, get tokens     |
| `POST`  | `/refresh-token`                        | Refresh token  | Get a new access token           |
| `POST`  | `/deposit`                              | Customer       | Add money to own account         |
| `POST`  | `/transfer`                             | Customer       | Send money to another account    |
| `POST`  | `/loan-requests`                        | Customer       | Submit a loan request            |
| `PATCH` | `/admin/accounts/:accountId/approve`    | Admin          | Approve a pending account        |

---

## 1. Health check

**`GET /`** — public.

**200 OK**

```json
{
  "success": true,
  "message": "Welcome to Neuron Banking API"
}
```

---

## 2. Send verification code

**`POST /send-verification-code`** — public. First step of signing up: emails a
6-digit code to the address and stores only its hash. Asking again replaces the
previous code.

**Request body**

| Field   | Type   | Rules                                       |
| ------- | ------ | ------------------------------------------- |
| `email` | string | Required, valid email, normalized           |

```json
{ "email": "nitish@example.com" }
```

**200 OK**

```json
{
  "success": true,
  "message": "verification code sent to your email",
  "data": {
    "email": "nitish@example.com",
    "expiresInMinutes": 10
  }
}
```

**Errors** — `400` validation failed · `409` an account with this email already
exists · `500` SMTP is not configured or the send failed.

---

## 3. Verify email code

**`POST /verify-email-code`** — public. Second step: confirms the code and opens a
30-minute window to finish registering.

**Request body**

| Field   | Type   | Rules                             |
| ------- | ------ | --------------------------------- |
| `email` | string | Required, same address as above   |
| `code`  | string | Required, exactly 6 digits        |

```json
{ "email": "nitish@example.com", "code": "482913" }
```

**200 OK**

```json
{
  "success": true,
  "message": "email verified successfully",
  "data": {
    "email": "nitish@example.com",
    "verified": true,
    "expiresInMinutes": 30
  }
}
```

**Errors** — `400` validation failed, or the code is wrong or expired · `429`
five wrong attempts, which destroys the code so a new one must be requested.

Wrong and expired share one message so a caller cannot tell which address has a
code pending.

---

## 4. Register

**`POST /register`** — public. Creates the user and their savings account in one
transaction, and returns a token pair so the customer is logged in immediately.

**The email must be verified first** via the two endpoints above. The verification
is consumed (deleted) inside the same transaction, so it can never back a second
registration.

**Request body**

| Field         | Type   | Rules                                                                 |
| ------------- | ------ | --------------------------------------------------------------------- |
| `name`        | string | Required, 2–100 characters                                            |
| `email`       | string | Required, valid email, normalized, must be unique                     |
| `phoneNumber` | string | Required, 10–15 digits, optional leading `+`, must be unique          |
| `dateOfBirth` | string | Required, `YYYY-MM-DD`, cannot be in the future                       |
| `password`    | string | Required, 8–128 chars, needs upper + lower + number + symbol          |

```json
{
  "name": "Nitish Kumar",
  "email": "nitish@example.com",
  "phoneNumber": "+919876543210",
  "dateOfBirth": "1998-04-21",
  "password": "Str0ng@Pass"
}
```

**201 Created**

```json
{
  "success": true,
  "message": "account request successfully created",
  "token": "<accessToken>",
  "refreshToken": "<refreshToken>",
  "data": {
    "name": "Nitish Kumar",
    "email": "nitish@example.com",
    "phoneNumber": "+919876543210",
    "role": "customer",
    "status": "pending"
  }
}
```

**Errors** — `400` validation failed · `403` email not verified, or the 30-minute
window expired · `409` email or phone number already registered.

---

## 5. Login

**`POST /login`** — public. **Step 1 of 2.** Checks the password and, if it is
correct, emails a 6-digit login code. It does **not** return tokens — call
`/verify-login-code` with the code to finish signing in.

**Request body**

| Field      | Type   | Rules                    |
| ---------- | ------ | ------------------------ |
| `email`    | string | Required, valid email    |
| `password` | string | Required                 |

```json
{
  "email": "nitish@example.com",
  "password": "Str0ng@Pass"
}
```

**200 OK**

```json
{
  "success": true,
  "message": "login code sent to your email",
  "data": {
    "email": "nitish@example.com",
    "verificationRequired": true,
    "expiresInMinutes": 10
  }
}
```

**Errors** — `400` validation failed · `401` invalid email or password · `500`
SMTP is not configured or the send failed.

---

## 6. Verify login code

**`POST /verify-login-code`** — public. **Step 2 of 2.** Confirms the code and
issues the token pair. The code is deleted on success, so it cannot start a
second session.

A code only exists if step 1 already accepted the password, so this endpoint
does not ask for it again.

**Request body**

| Field   | Type   | Rules                            |
| ------- | ------ | -------------------------------- |
| `email` | string | Required, same address as step 1 |
| `code`  | string | Required, exactly 6 digits       |

```json
{ "email": "nitish@example.com", "code": "482913" }
```

**200 OK** — issues a new token pair and stores a hash of the refresh token on
the user record.

```json
{
  "success": true,
  "message": "login successful",
  "token": "<accessToken>",
  "refreshToken": "<refreshToken>",
  "data": {
    "id": "665f1c...",
    "name": "Nitish Kumar",
    "email": "nitish@example.com",
    "phoneNumber": "+919876543210",
    "role": "customer",
    "status": "active",
    "accountStatus": "active",
    "accountNumber": "SAV12345678901234",
    "balance": 5000
  }
}
```

**Errors** — `400` validation failed, or the code is wrong or expired · `429`
five wrong attempts, which destroys the code so you must log in again · `401`
the user no longer exists.

---

## 7. Refresh access token

**`POST /refresh-token`** — send the refresh token either in the body as
`refreshToken` or as a `Bearer` token in the `Authorization` header.

```json
{ "refreshToken": "<refreshToken>" }
```

The stored SHA-256 hash is compared in constant time and the stored expiry is
checked, so a revoked or expired refresh token is rejected even if its
signature is still valid.

**200 OK**

```json
{
  "success": true,
  "message": "access token refreshed successfully",
  "token": "<newAccessToken>"
}
```

**Errors** — `400` refresh token missing · `401` refresh token invalid or
expired.

---

## 8. Deposit

**`POST /deposit`** — customer, requires `Authorization: Bearer`. Adds money to
the logged-in user's own account and records a `credit` transaction.

**Request body**

| Field         | Type   | Rules                                                        |
| ------------- | ------ | ------------------------------------------------------------ |
| `amount`      | number | Required, > 0, max 2 decimal places, max `1000000` per call  |
| `description` | string | Optional, max 140 characters                                 |

```json
{
  "amount": 2500.5,
  "description": "Salary credit"
}
```

**201 Created**

```json
{
  "success": true,
  "message": "money added successfully",
  "data": {
    "balance": 7500.5,
    "transaction": {
      "id": "665f2a...",
      "type": "credit",
      "amount": 2500.5,
      "currency": "INR",
      "balanceAfter": 7500.5,
      "reference": "TXN12345678123456",
      "description": "Salary credit",
      "status": "completed",
      "dateTime": "2026-08-15T09:30:00.000Z",
      "senderAccountNumber": "SAV12345678901234",
      "receiverAccountNumber": "SAV12345678901234"
    }
  }
}
```

**Errors** — `400` validation failed · `401` missing or invalid access token ·
`403` account is not active, or user is suspended/rejected · `404` no account
found for the logged-in user.

---

## 9. Transfer

**`POST /transfer`** — customer, requires `Authorization: Bearer`. Moves money
from the logged-in user's account to another account. The debit is applied with
a conditional update (`balance >= amount`) so two concurrent transfers cannot
overdraw the account, and both ledger rows plus both balance updates run inside
one MongoDB transaction.

**Request body**

| Field                   | Type   | Rules                                                       |
| ----------------------- | ------ | ----------------------------------------------------------- |
| `receiverAccountNumber` | string | Required, 6–32 alphanumeric characters, uppercased          |
| `amount`                | number | Required, > 0, max 2 decimal places, max `1000000` per call |
| `description`           | string | Optional, max 140 characters                                |

```json
{
  "receiverAccountNumber": "SAV98765432109876",
  "amount": 1200,
  "description": "Rent for August"
}
```

**201 Created** — returns the sender's new balance and the sender's `debit`
row.

```json
{
  "success": true,
  "message": "transfer completed successfully",
  "data": {
    "balance": 6300.5,
    "transaction": {
      "id": "665f3b...",
      "type": "debit",
      "amount": 1200,
      "currency": "INR",
      "balanceAfter": 6300.5,
      "reference": "TXN12345678654321",
      "description": "Rent for August",
      "status": "completed",
      "dateTime": "2026-08-15T10:00:00.000Z",
      "senderAccountNumber": "SAV12345678901234",
      "receiverAccountNumber": "SAV98765432109876"
    }
  }
}
```

**Errors**

| Code  | When                                                                    |
| ----- | ----------------------------------------------------------------------- |
| `400` | Validation failed, transfer to self, or insufficient balance            |
| `401` | Missing or invalid access token                                         |
| `403` | Sender's account is not active                                          |
| `404` | Sender has no account, receiver account not found, or receiver's owner is gone |
| `409` | Balance changed mid-transfer and no longer covers the amount            |
| `422` | Receiver account inactive, receiver owner blocked, or currency mismatch |

---

## 10. Create loan request

**`POST /loan-requests`** — customer, requires `Authorization: Bearer`. Submits
a loan application for review. A customer may have only one `pending` request
at a time (enforced by a partial unique index as well as an explicit check).

**Request body**

| Field           | Type   | Rules                                                  |
| --------------- | ------ | ------------------------------------------------------ |
| `amount`        | number | Required, 1000–10000000, max 2 decimal places          |
| `purpose`       | string | Required, 3–200 characters                             |
| `tenureMonths`  | number | Required, whole number, 1–360                          |
| `monthlyIncome` | number | Required, 0–10000000                                   |

```json
{
  "amount": 250000,
  "purpose": "Home renovation",
  "tenureMonths": 36,
  "monthlyIncome": 65000
}
```

**201 Created**

```json
{
  "success": true,
  "message": "loan request submitted successfully",
  "data": {
    "id": "665f4c...",
    "amount": 250000,
    "currency": "INR",
    "purpose": "Home renovation",
    "tenureMonths": 36,
    "monthlyIncome": 65000,
    "status": "pending",
    "accountNumber": "SAV12345678901234",
    "createdAt": "2026-08-15T10:15:00.000Z"
  }
}
```

**Errors** — `400` validation failed · `401` missing or invalid access token ·
`403` account is not active · `404` no account found for the logged-in user ·
`409` a loan request is already awaiting approval.

---

## 11. Approve account (admin)

**`PATCH /admin/accounts/:accountId/approve`** — admin only, requires
`Authorization: Bearer`. Activates a pending account and, if the owner is still
`pending`, activates the owner too.

**Path parameter**

| Parameter   | Type   | Rules                          |
| ----------- | ------ | ------------------------------ |
| `accountId` | string | Required, valid MongoDB ObjectId |

**200 OK**

```json
{
  "success": true,
  "message": "account approved successfully",
  "data": {
    "id": "665f5d...",
    "accountNumber": "SAV12345678901234",
    "status": "active",
    "balance": 0,
    "currency": "INR",
    "approvedBy": "665f0a...",
    "approvedAt": "2026-08-15T10:20:00.000Z",
    "ownerName": "Nitish Kumar",
    "ownerEmail": "nitish@example.com",
    "ownerStatus": "active"
  }
}
```

**Errors** — `400` invalid account id · `401` missing or invalid access token ·
`403` caller is not an admin · `404` account or owner not found · `409` account
is not pending · `422` owner is suspended or rejected.

---

## Error format

Every error goes through a single error handler and comes back in the same
shape:

```json
{
  "success": false,
  "message": "Insufficient balance to complete this transfer"
}
```

Validation failures add a per-field breakdown:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Please provide a valid email" },
    { "field": "amount", "message": "Amount must be greater than zero" }
  ]
}
```

Unexpected failures are logged on the server and returned as a generic
`500 An unexpected server error occurred`, so internal details are never
exposed to the client.

---

## Data models

**User** — `name`, `email` (unique), `phoneNumber` (unique), `dateOfBirth`,
`passwordHash` (hidden), `role`, `status`, `refreshTokenHash` (hidden),
`refreshTokenExpiresAt` (hidden), timestamps.

**Account** — `user` (unique, one account per user), `accountNumber` (unique),
`balance` (min 0), `currency` (default `INR`), `status`, `approvedBy`,
`approvedAt`, `rejectionReason`, timestamps.

**Transaction** — `account`, `sender`, `receiver`, `senderAccountNumber`,
`receiverAccountNumber`, `type` (`debit`/`credit`), `amount`, `currency`,
`balanceAfter`, `reference`, `description`, `status`, `dateTime`, timestamps.

**LoanRequest** — `user`, `account`, `amount`, `currency`, `purpose`,
`tenureMonths`, `monthlyIncome`, `status`, `approvedBy`, `approvedAt`,
`rejectionReason`, timestamps.

## Project structure

```
backend/
├── app.js                  # Express app, DB connection, server bootstrap
├── database/db.js          # MongoDB connection
├── routes/                 # route.js mounts auth, transaction, admin, loan routes
├── controllers/            # auth, transaction, admin, loan handlers
├── middleware/             # authentication, role check, validators, error handler
├── models/                 # User, Account, Transaction, LoanRequest schemas
└── utils/                  # JWT helpers, account number + reference generators
```

## Not built yet

- Fetch account details / balance
- Transaction history and statements
- Account rejection, suspension, and closure
- Loan approval, rejection, and disbursal
- Admin listing of pending accounts and loan requests
- Logout / refresh token revocation
- Both frontends
