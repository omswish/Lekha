// backend/src/routes/compliance.js

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireRole } = require('../middleware/auth');
const auditLogger = require('../middleware/auditLogger');

// Create Express Router for compliance reporting
const router = express.Router();

// Initialize Prisma Client
const prisma = new PrismaClient();

/**
 * @route   GET /api/compliance/ropa
 * @desc    Retrieves all records in the Record of Processing Activities (RoPA) register.
 *          Implements the transparency obligation under Section 4 and 6 of the DPDP Act 2023.
 *          Allows all employees to see what data category is processed and how it is secured.
 * @access  Private (All authenticated users)
 */
router.get('/ropa', authenticate, async (req, res) => {
  try {
    const registers = await prisma.roPARecord.findMany({
      orderBy: { dataCategory: 'asc' }
    });
    res.json(registers);
  } catch (error) {
    console.error('Fetch RoPA Records Error:', error);
    res.status(500).json({ error: 'Failed to retrieve Record of Processing Activities register.' });
  }
});

/**
 * @route   POST /api/compliance/ropa
 * @desc    Adds or updates a Record of Processing Activities (RoPA) item.
 *          Enables the Compliance Officer/Admin to maintain an updated processing inventory.
 * @access  Private (Admins only)
 */
router.post(
  '/ropa',
  authenticate,
  requireRole(['ADMIN']),
  auditLogger('COMPLIANCE'),
  async (req, res) => {
    const { id, dataCategory, purpose, processingActivity, sharingScope, retentionPeriod, securitySafeguards } = req.body;

    if (!dataCategory || !purpose || !processingActivity || !sharingScope || !retentionPeriod || !securitySafeguards) {
      return res.status(400).json({ error: 'Missing required fields in the RoPA record.' });
    }

    try {
      if (id) {
        // Update existing RoPA item
        const updated = await prisma.roPARecord.update({
          where: { id },
          data: {
            dataCategory,
            purpose,
            processingActivity,
            sharingScope,
            retentionPeriod,
            securitySafeguards
          }
        });
        return res.json(updated);
      } else {
        // Create new RoPA item
        const created = await prisma.roPARecord.create({
          data: {
            dataCategory,
            purpose,
            processingActivity,
            sharingScope,
            retentionPeriod,
            securitySafeguards
          }
        });
        return res.status(201).json(created);
      }
    } catch (error) {
      console.error('Save RoPA Record Error:', error);
      res.status(500).json({ error: 'Failed to save Record of Processing Activities.' });
    }
  }
);

/**
 * @route   GET /api/compliance/logs
 * @desc    Retrieves paginated audit logs for system monitoring.
 *          Fulfills CERT-In logging audit inspection.
 * @access  Private (Admins only)
 */
router.get(
  '/logs',
  authenticate,
  requireRole(['ADMIN']),
  async (req, res) => {
    // Parse query search metrics
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const moduleFilter = req.query.module || undefined;
    const statusFilter = req.query.status || undefined;

    const skip = (page - 1) * limit;

    try {
      // Build search filter conditions
      const where = {};
      if (moduleFilter) where.module = moduleFilter;
      if (statusFilter) where.status = statusFilter;

      // Run parallel query to optimize load performance
      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { timestamp: 'desc' },
          skip,
          take: limit
        }),
        prisma.auditLog.count({ where })
      ]);

      res.json({
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Fetch Audit Logs Error:', error);
      res.status(500).json({ error: 'Failed to retrieve CERT-In audit logs.' });
    }
  }
);

/**
 * @route   GET /api/compliance/logs/export
 * @desc    Generates audit logs backup payload (formatted as JSON).
 *          Designed for incident audits and compliance reports submission to CERT-In.
 * @access  Private (Admins only)
 */
router.get(
  '/logs/export',
  authenticate,
  requireRole(['ADMIN']),
  auditLogger('COMPLIANCE'),
  async (req, res) => {
    try {
      // Fetch the last 180 days logs (CERT-In mandate)
      // For testing, we export all logs present in the local database.
      const logs = await prisma.auditLog.findMany({
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: { timestamp: 'desc' }
      });

      // Send JSON file response with custom attachment header
      res.setHeader('Content-disposition', `attachment; filename=cert_in_audit_logs_${Date.now()}.json`);
      res.setHeader('Content-type', 'application/json');
      res.write(JSON.stringify(logs, null, 2));
      res.end();

    } catch (error) {
      console.error('Export Logs Error:', error);
      res.status(500).json({ error: 'Failed to generate audit log export file.' });
    }
  }
);

module.exports = router;
