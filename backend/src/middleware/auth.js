// backend/src/middleware/auth.js

const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

// Initialize Prisma Client to verify the user exists in PostgreSQL.
const prisma = new PrismaClient();

// Retrieve JWT secret key from environment configurations.
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

/**
 * Authentication Middleware: Validates JWT token, extracts User context.
 * In compliance with access control guidelines, this protects API routes from unauthorized access.
 */
async function authenticate(req, res, next) {
  // 1. Extract the Authorization header
  const authHeader = req.headers['authorization'];
  
  // Format should be: "Bearer <token>"
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access Denied: No authentication token provided.' });
  }

  try {
    // 2. Verify token signature using our server secret key
    const decoded = jwt.verify(token, JWT_SECRET);

    // 3. Fetch active user details from PostgreSQL
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    // --- DPDP Act 2023 Enforcement ---
    // If a user has exercised their Right to Erasure, they are marked as 'isAnonymized'.
    // They are no longer allowed to log in or hold active asset bindings since their consent is revoked.
    if (user.isAnonymized) {
      return res.status(403).json({ error: 'Access Denied: This account has been anonymized and deleted under DPDP erasure guidelines.' });
    }

    // If the user has revoked consent but hasn't anonymized yet, restrict operations.
    if (!user.hasConsented) {
      return res.status(403).json({ error: 'Access Denied: Active personal data processing consent is required to access this system.' });
    }

    // 4. Attach user data payload to request object for access downstream
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department
    };

    next();
  } catch (error) {
    console.error('Auth Middleware Verification Error:', error.message);
    return res.status(403).json({ error: 'Access Denied: Invalid or expired authentication token.' });
  }
}

/**
 * Role-Based Access Control (RBAC) Middleware: Restricts access to specific role tiers.
 * Supports security standards by enforcing the Principle of Least Privilege.
 * 
 * @param {Array<string>} roles - List of allowed roles (e.g., ['ADMIN', 'ASSET_MANAGER'])
 * @returns {Function} Express middleware handler
 */
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    // Match logged-in user role against permitted endpoints roles list
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Permission Denied: Required role level [${roles.join(' or ')}] is higher than user role [${req.user.role}].` 
      });
    }

    next();
  };
}

module.exports = {
  authenticate,
  requireRole
};
