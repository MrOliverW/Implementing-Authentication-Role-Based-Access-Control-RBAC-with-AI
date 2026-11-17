# AuthN & RBAC Security Testbench

A lightweight full-stack Node.js and Express application demonstrating secure **Authentication (AuthN)** and **Role-Based Access Control (AuthZ)**, built and audited to evaluate AI-generated security patterns against industry standards.

## Tech Stack

- **Backend:** Node.js, Express
- **Security & Auth:** `bcrypt` (password hashing), `jsonwebtoken` (HS256 JWTs), `cookie-parser` (`HttpOnly` & `SameSite=Strict` cookies), `helmet` (HTTP security headers), `dotenv`
- **Frontend:** Vanilla HTML5, CSS3, and JavaScript (`fetch` API testbench)

## Project Structure

```text
auth-rbac-starter/
├── package.json
├── .env                 # Environment secrets (excluded from Git via .gitignore)
├── server.js            # Express server, AuthN/AuthZ middleware, and API routes
└── public/
    └── index.html       # Interactive UI for registration, login, logout, and RBAC testing