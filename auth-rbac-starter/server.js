require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not defined in .env');
  process.exit(1);
}

// Security & Parsing Middleware
app.use(helmet({ contentSecurityPolicy: false })); // CSP disabled only for inline script in demo HTML
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory user store (Replace with PostgreSQL/MongoDB in production)
// Schema: { id, username, passwordHash, role }
const users = [];
const VALID_ROLES = ['User', 'Admin'];
const SALT_ROUNDS = 12;

// ==========================================
// MIDDLEWARE: Authentication & Authorization
// ==========================================

/**
 * AuthN Guard: Verifies the JWT stored in the HttpOnly cookie.
 */
function authenticateToken(req, res, next) {
  const token = req.cookies.auth_token;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  try {
    // Explicitly enforce HS256 to prevent 'alg: none' or key-confusion attacks
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    req.user = decoded; // { id, username, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }
}

/**
 * AuthZ Guard: Enforces Role-Based Access Control (RBAC) server-side.
 */
function authorizeRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden: Requires one of the following roles: [${allowedRoles.join(', ')}]`
      });
    }
    next();
  };
}

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

// Register a new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    // Input validation
    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters.' });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    // Default to 'User' if invalid or omitted; strictly whitelist roles
    // Note: In production, Admin creation should be restricted, not open on public signup.
    const assignedRole = VALID_ROLES.includes(role) ? role : 'User';

    const existingUser = users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());
    if (existingUser) {
      return res.status(409).json({ error: 'Username already taken.' });
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const newUser = {
      id: users.length + 1,
      username: username.trim(),
      passwordHash,
      role: assignedRole
    };
    users.push(newUser);

    res.status(201).json({
      message: 'User registered successfully.',
      user: { id: newUser.id, username: newUser.username, role: newUser.role }
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// Login and issue HttpOnly JWT cookie
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const user = users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());

    // Generic error message prevents username enumeration
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Sign minimal payload (never put sensitive data in JWT)
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '1h' }
    );

    // Store JWT in a secure HttpOnly cookie
    res.cookie('auth_token', token, {
      httpOnly: true, // Prevents JavaScript access (XSS mitigation)
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict', // CSRF mitigation
      maxAge: 3600 * 1000 // 1 hour
    });

    res.json({
      message: 'Logged in successfully.',
      user: { id: user.id, username: user.username, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// Logout by clearing the cookie
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  res.json({ message: 'Logged out successfully.' });
});

// ==========================================
// APPLICATION ENDPOINTS (Public, User, Admin)
// ==========================================

// 1. PUBLIC ENDPOINT: Accessible to anyone
app.get('/api/public', (req, res) => {
  res.json({
    access: 'Public',
    message: 'Welcome to the public landing endpoint. No authentication required.',
    timestamp: new Date().toISOString()
  });
});

// 2. PROTECTED ENDPOINT (User & Admin): Requires valid authentication
app.get('/api/profile', authenticateToken, authorizeRole('User', 'Admin'), (req, res) => {
  res.json({
    access: 'Protected (Authenticated Users)',
    message: `Hello, ${req.user.username}! You have passed AuthN checks.`,
    profile: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role
    }
  });
});

// 3. RESTRICTED ENDPOINT (Admin Only): Requires authentication + 'Admin' role
app.get('/api/admin/users', authenticateToken, authorizeRole('Admin'), (req, res) => {
  // Never return passwordHashes even to admins
  const sanitizedUsers = users.map(({ id, username, role }) => ({ id, username, role }));
  res.json({
    access: 'Restricted (Admin Only)',
    message: 'Sensitive user directory retrieved.',
    totalUsers: sanitizedUsers.length,
    users: sanitizedUsers
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});