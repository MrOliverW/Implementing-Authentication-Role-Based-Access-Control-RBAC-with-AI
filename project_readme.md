# AuthN & RBAC Security Testbench

## 1. Project Title & Overview

**AuthN & RBAC Security Testbench** is a lightweight, full-stack Node.js and Express web application designed to demonstrate, audit, and verify secure **Authentication (AuthN)** and **Role-Based Access Control (AuthZ)** patterns. 

The application provides user registration and login flows supporting two distinct roles (`User` and `Admin`), paired with an interactive browser testbench to validate both positive authorization paths and negative security attack vectors (such as unauthenticated access, vertical privilege escalation, XSS token theft, and JWT tampering).

### Tech Stack
- **Backend Runtime & Framework:** Node.js, Express (`v4.19.2`)
- **Authentication & Cryptography:** 
  - `bcrypt` (`v5.1.1`) for salted password hashing (cost factor `12`)
  - `jsonwebtoken` (`v9.0.2`) for `HS256`-signed session tokens
  - `cookie-parser` (`v1.4.6`) for `HttpOnly` and `SameSite=Strict` cookie transport
- **Security & Configuration:** `helmet` (`v7.1.0`) for HTTP security headers, `dotenv` (`v16.4.5`) for environment variable management
- **Frontend:** Vanilla HTML5, CSS3, and JavaScript (`fetch` API)

---

## 2. Setup & Execution Guide

Follow these steps to install dependencies, configure environment secrets, and run the project locally.

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm` (included with Node.js)

### Step 1: Clone the Repository & Install Dependencies
```bash
git clone <your-repository-url>
cd Implementing-Authentication-Role-Based-Access-Control-RBAC-with-AI/auth-rbac-starter
npm install
```

### Step 2: Generate a Cryptographic Secret & Configure `.env`
Create a `.env` file inside the `auth-rbac-starter/` directory. Do **not** use a manually typed password or placeholder for `JWT_SECRET`. Generate a cryptographically random 64-byte hexadecimal string using Node's built-in `crypto` module:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the 128-character output and add the following variables to your `.env` file:

```env
PORT=3000
JWT_SECRET=<paste_your_generated_128_char_hex_secret_here>
NODE_ENV=development
```

*(Note: Ensure `.env` is listed in `.gitignore` so secrets are never committed to version control.)*

### Step 3: Start the Server
```bash
npm start
```
You should see the console output:
```text
Server running at http://localhost:3000
```
Open `http://localhost:3000` in your browser to interact with the testbench.

---

## 3. AI Disclosure & Prompt Appendix

### AI Tool Used
- **Google Gemini** (Web interface)

### Exact Prompts Submitted
1. **Initial Scaffolding Prompt:**
   > Act as a senior security engineer. Build a lightweight full-stack application (or REST API with a simple frontend) demonstrating basic Authentication and Role-Based Access Control (RBAC).
   >
   > The application must include:
   > 1. User Registration & Login with two roles: 'User' and 'Admin'.
   > 2. Password hashing using a modern, secure algorithm.
   > 3. Token-based (JWT) or Session-based authentication.
   > 4. Three distinct views or API endpoints:
   >    - Public: Accessible to anyone (e.g., home/landing page).
   >    - Protected (User): Accessible to any authenticated user (e.g., user profile or dashboard).
   >    - Restricted (Admin Only): Accessible ONLY to users with the 'Admin' role (e.g., user management list or system metrics).
   >
   > Provide the backend server code, route-guard middleware, and a minimal frontend or HTML/JS interface to test registration, login, logout, and role access.

2. **Follow-up Configuration & Troubleshooting Prompts:**
   > *"what is supposed to go in here just any 64 standard characters?"* (Regarding `JWT_SECRET` in `.env`)
   >
   > *(Terminal path troubleshooting & `package.json` script verification)*

### Audit Summary: AI Strengths vs. Manual Patches & Security Trade-offs

#### What the AI Produced Correctly
- **Salted, Slow Password Hashing:** Implemented `bcrypt.hash(password, 12)` rather than fast/broken hashes (MD5/SHA-256) or plaintext storage.
- **XSS-Resistant Token Storage:** Stored the JWT in an `HttpOnly`, `SameSite=Strict` cookie rather than `localStorage`, preventing client-side JavaScript from reading the session token.
- **Strict JWT Algorithm Enforcement:** Explicitly passed `{ algorithms: ['HS256'] }` to `jwt.verify()` to prevent `alg: none` or asymmetric key-confusion attacks.
- **True Server-Side RBAC:** Enforced `authenticateToken` and `authorizeRole('Admin')` middleware on backend routes while keeping frontend buttons visible to verify server-side rejection.
- **User Enumeration & Data Leakage Prevention:** Returned a generic `"Invalid credentials."` `401` error on login failures and stripped `passwordHash` fields from the `/api/admin/users` response payload.

#### Manual Configuration, Fixes & Known Trade-offs
- **Cryptographic Secret Generation:** Replaced the AI's placeholder `JWT_SECRET` string in `.env` with a high-entropy 64-byte random hex value generated locally via Node's `crypto.randomBytes(64)`.
- **File Structure & `.gitignore` Hygiene:** Reorganized misplaced root files (`server.js`, `.env`, `public/`) into the `auth-rbac-starter/` project directory and ensured `.env` and `node_modules/` are excluded from Git tracking.
- **Intentional Demo Trade-off (Open Role Registration):** The AI exposed a `Role` dropdown (`User` vs. `Admin`) on `POST /api/auth/register` so both roles can be created easily during QA testing. In a production environment, this must be patched to force `assignedRole = 'User'` on public signup, restricting `Admin` promotion to an authenticated Admin-only endpoint.
- **In-Memory Data Persistence:** User records are stored in an in-memory JavaScript array (`const users = []`), meaning accounts reset when the server restarts (acceptable for lightweight QA testing, requires a persistent database in production).

---

## 4. QA Test Summary

The following test suite was executed locally against `http://localhost:3000` to verify functional authentication flows and negative security controls.

| Test ID | Test Case / Attack Vector | User State / Role | Action / Endpoint Tested | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **QA-01** | Public Endpoint Access | Unauthenticated (Guest) | `GET /api/public` | `200 OK` with public welcome JSON | `200 OK` returned public payload | **PASS** |
| **QA-02** | Unauthenticated Protected Access | Unauthenticated (Guest) | `GET /api/profile` | `401 Unauthorized` (`Authentication required`) | `401 Unauthorized` returned | **PASS** |
| **QA-03** | Unauthenticated Admin Access | Unauthenticated (Guest) | `GET /api/admin/users` | `401 Unauthorized` (`Authentication required`) | `401 Unauthorized` returned | **PASS** |
| **QA-04** | User Registration & Hashing | Unauthenticated (Guest) | `POST /api/auth/register` (`alice`, `User`) | `201 Created`; password stored as `bcrypt` hash | `201 Created` returned without password hash | **PASS** |
| **QA-05** | Login & Generic Error Handling | Unauthenticated (Guest) | `POST /api/auth/login` with wrong password / unknown user | `401 Unauthorized` with identical generic error message | `401 Unauthorized` (`"Invalid credentials."`) for both | **PASS** |
| **QA-06** | Positive User Access | Authenticated (`User`) | `GET /api/profile` | `200 OK` with `alice`'s profile details | `200 OK` returned user profile JSON | **PASS** |
| **QA-07** | Vertical Privilege Escalation | Authenticated (`User`) | `GET /api/admin/users` | `403 Forbidden` (`Requires Admin role`) | `403 Forbidden` rejected request | **PASS** |
| **QA-08** | Positive Admin Access | Authenticated (`Admin`) | `GET /api/admin/users` | `200 OK` with user list (no `passwordHash` exposed) | `200 OK` returned sanitized user directory | **PASS** |
| **QA-09** | XSS Cookie Theft Prevention | Authenticated (`Admin`) | Run `document.cookie` in browser DevTools Console | Returns `""` (empty string) due to `HttpOnly` flag | Returned `""`; token inaccessible to JS | **PASS** |
| **QA-10** | JWT Signature Tampering | Authenticated (`Admin`) | Modify 1 character of `auth_token` cookie & call `GET /api/profile` | `401 Unauthorized` (`Invalid or expired session token`) | `401 Unauthorized` rejected tampered JWT | **PASS** |
| **QA-11** | Session Termination (Logout) | Authenticated (`Admin`) | `POST /api/auth/logout`, then `GET /api/profile` | Cookie cleared; subsequent protected call returns `401` | Cookie cleared; `GET /api/profile` returned `401` | **PASS** |