// backend/src/routes/users.js

const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireRole } = require('../middleware/auth');
const auditLogger = require('../middleware/auditLogger');
const { anonymizeUser } = require('../utils/compliance');

// Create Express Router for users
const router = express.Router();

// Initialize Prisma Client
const prisma = new PrismaClient();

/**
 * @route   GET /api/users
 * @desc    Retrieves a list of all active users. Essential for asset allocation dropdowns.
 *          Filters out anonymized records to maintain data privacy compliance.
 * @access  Private (Admins and Asset Managers only)
 */
router.get('/', authenticate, requireRole(['ADMIN', 'ASSET_MANAGER']), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        isAnonymized: false
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        hasConsented: true,
        consentTimestamp: true
      },
      orderBy: { name: 'asc' }
    });

    res.json(users);
  } catch (error) {
    console.error('Fetch Users List Error:', error);
    res.status(500).json({ error: 'Failed to retrieve user registry.' });
  }
});

/**
 * @route   GET /api/users/profile
 * @desc    Retrieves profile information and assigned assets for the logged-in user.
 * @access  Private (All authenticated users)
 */
router.get('/profile', authenticate, async (req, res) => {
  try {
    const profile = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        assets: {
          select: {
            id: true,
            assetTag: true,
            name: true,
            type: true,
            classification: true,
            status: true,
            acceptableUseSigned: true
          }
        }
      }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found.' });
    }

    // Exclude security sensitive password hashes before responding
    const { passwordHash, ...safeProfile } = profile;
    res.json(safeProfile);

  } catch (error) {
    console.error('Fetch Profile Error:', error);
    res.status(500).json({ error: 'Failed to load user profile.' });
  }
});

/**
 * @route   POST /api/users
 * @desc    Registers a new employee user in the system.
 * @access  Private (Admins only)
 */
router.post(
  '/',
  authenticate,
  requireRole(['ADMIN']),
  auditLogger('USER_MANAGEMENT'),
  async (req, res) => {
    const { name, email, password, role, department } = req.body;

    if (!name || !email || !password || !department) {
      return res.status(400).json({ error: 'Missing required user details.' });
    }

    try {
      // 1. Verify email uniqueness
      const existing = await prisma.user.findUnique({
        where: { email }
      });

      if (existing) {
        return res.status(400).json({ error: 'A user with this email address already exists.' });
      }

      // 2. Hash plain text password using bcryptjs (standard security safeguard)
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // 3. Insert user record (by default hasConsented is false, user must consent on first login)
      const user = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: role || 'EMPLOYEE',
          department,
          hasConsented: false
        }
      });

      // Exclude password hash from response payload
      const { passwordHash: _, ...safeUser } = user;
      res.status(201).json(safeUser);

    } catch (error) {
      console.error('User Registration Error:', error);
      res.status(500).json({ error: 'Failed to create user account.' });
    }
  }
);

/**
 * @route   PUT /api/users/profile
 * @desc    Updates profile information (DPDP Section 11 - Right to Correction/Correction).
 * @access  Private (All authenticated users)
 */
router.put(
  '/profile',
  authenticate,
  auditLogger('USER_MANAGEMENT'),
  async (req, res) => {
    const { name, department } = req.body;

    try {
      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: {
          name: name || undefined,
          department: department || undefined
        }
      });

      const { passwordHash, ...safeUser } = updatedUser;
      res.json(safeUser);

    } catch (error) {
      console.error('Update Profile Error:', error);
      res.status(500).json({ error: 'Failed to update user profile.' });
    }
  }
);

/**
 * @route   POST /api/users/:id/erasure
 * @desc    Executes DPDP Right to Erasure. Wipes personal Identifiers while preserving audit data.
 * @access  Private (Admin or Self account holder only)
 */
router.post(
  '/:id/erasure',
  authenticate,
  auditLogger('COMPLIANCE'),
  async (req, res) => {
    const { id } = req.params;

    // Security Gate: An employee can only delete their own profile. Admin can delete anyone.
    if (req.user.role !== 'ADMIN' && req.user.id !== id) {
      return res.status(403).json({ error: 'Access Denied: You are not authorized to request erasure for this account.' });
    }

    try {
      // Capture environment details for the compliance audit log
      const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';

      // Call our anonymization transaction utility
      const anonymized = await anonymizeUser(id, req.user.email, ipAddress, userAgent);

      res.json({ 
        message: 'Right to Erasure compliance request executed successfully. Account has been anonymized and all PII purged.',
        anonymizedUserId: anonymized.id 
      });

    } catch (error) {
      console.error('DPDP Erasure Request Error:', error.message);
      res.status(400).json({ error: error.message || 'Failed to complete the erasure request.' });
    }
  }
);

module.exports = router;
