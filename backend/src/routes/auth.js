// backend/src/routes/auth.js

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const auditLogger = require('../middleware/auditLogger');

// Create Express Router for routing auth endpoints
const router = express.Router();

// Initialize Prisma
const prisma = new PrismaClient();

// Pull JWT configuration variables
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

/**
 * @route   POST /api/auth/login
 * @desc    Authenticates user, verifies credentials, checks DPDP consent, signs session JWT.
 * @access  Public
 */
router.post('/login', auditLogger('AUTH'), async (req, res) => {
  const { email, password } = req.body;

  // Basic validation checks
  if (!email || !password) {
    return res.status(400).json({ error: 'Please enter both email and password.' });
  }

  try {
    // 1. Fetch user from database
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid authentication credentials.' });
    }

    // 2. Prevent login for anonymized accounts (DPDP Right to Erasure enforcement)
    if (user.isAnonymized) {
      return res.status(403).json({ 
        error: 'This account has been deleted and anonymized in compliance with the DPDP Right to Erasure.' 
      });
    }

    // 3. Verify bcrypt password hash match
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid authentication credentials.' });
    }

    // 4. Check DPDP Consent status
    // Under DPDP, we cannot process active user data if they withdraw consent.
    // If the flag is false, we inform the UI to display the consent form/modal before granting access.
    if (!user.hasConsented) {
      return res.status(202).json({
        needsConsent: true,
        userId: user.id,
        email: user.email,
        consentPurpose: 'IT Asset Inventory Tracking, Security logs retention for CERT-In (180 days), and System Login access verification.'
      });
    }

    // 5. Generate JSON Web Token (JWT)
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '12h' } // Limit session validity for safety
    );

    // 6. Respond with session details
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department
      }
    });

  } catch (error) {
    console.error('Login Endpoint Error:', error);
    res.status(500).json({ error: 'Internal system authentication failure.' });
  }
});

/**
 * @route   POST /api/auth/consent
 * @desc    Enables a user to record explicit consent under the DPDP Act 2023.
 * @access  Public (Used during first-time login or consent renewal)
 */
router.post('/consent', auditLogger('AUTH'), async (req, res) => {
  const { userId, hasConsented, consentPurpose } = req.body;

  if (!userId || hasConsented === undefined) {
    return res.status(400).json({ error: 'Missing parameters. userId and consent status are required.' });
  }

  try {
    // 1. Verify user existence
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    if (user.isAnonymized) {
      return res.status(403).json({ error: 'Anonymized accounts cannot grant consent.' });
    }

    // 2. Update user consent fields
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        hasConsented: !!hasConsented,
        consentTimestamp: hasConsented ? new Date() : null,
        consentPurpose: hasConsented ? (consentPurpose || 'Standard Asset & Identity Management') : null
      }
    });

    // 3. If consent is granted, issue a token immediately so they can log in
    if (hasConsented) {
      const token = jwt.sign(
        { userId: updatedUser.id, role: updatedUser.role },
        JWT_SECRET,
        { expiresIn: '12h' }
      );

      return res.json({
        token,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role,
          department: updatedUser.department
        }
      });
    }

    res.json({ message: 'Consent updated successfully. Consent denied.' });

  } catch (error) {
    console.error('Consent Grant Endpoint Error:', error);
    res.status(500).json({ error: 'Internal error updating consent logs.' });
  }
});

module.exports = router;
