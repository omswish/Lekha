// backend/src/routes/tasks.js

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireRole } = require('../middleware/auth');
const auditLogger = require('../middleware/auditLogger');

// Create Express Router for Compliance Tasks & Non-Conformances
const router = express.Router();

// Initialize Prisma Client
const prisma = new PrismaClient();

/**
 * Helper utility to calculate the next due date of a task based on its check frequency.
 * @param {string} frequency - DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY
 * @returns {Date} Calculated next due date
 */
function calculateNextDueDate(frequency) {
  const now = new Date();
  switch (frequency) {
    case 'DAILY':
      now.setDate(now.getDate() + 1);
      break;
    case 'WEEKLY':
      now.setDate(now.getDate() + 7);
      break;
    case 'MONTHLY':
      now.setMonth(now.getMonth() + 1);
      break;
    case 'QUARTERLY':
      now.setMonth(now.getMonth() + 3);
      break;
    case 'YEARLY':
      now.setFullYear(now.getFullYear() + 1);
      break;
    default:
      now.setDate(now.getDate() + 30); // Default to monthly
  }
  return now;
}

// ==========================================
// COMPLIANCE TASKS ENDPOINTS (PRO 10)
// ==========================================

/**
 * @route   GET /api/tasks
 * @desc    Retrieves all recurring compliance tasks, sorted by urgency.
 * @access  Private (Authenticated users)
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const tasks = await prisma.complianceTask.findMany({
      include: {
        nonConformances: {
          where: { status: 'OPEN' }
        }
      },
      orderBy: { nextDueDate: 'asc' }
    });
    res.json(tasks);
  } catch (error) {
    console.error('Fetch Compliance Tasks Error:', error);
    res.status(500).json({ error: 'Failed to retrieve compliance checklist.' });
  }
});

/**
 * @route   GET /api/tasks/:id
 * @desc    Retrieves detailed task records, historical logs, and conformances.
 * @access  Private (Authenticated users)
 */
router.get('/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    const task = await prisma.complianceTask.findUnique({
      where: { id },
      include: {
        logs: {
          orderBy: { timestamp: 'desc' }
        },
        nonConformances: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!task) {
      return res.status(404).json({ error: 'Compliance task record not found.' });
    }

    res.json(task);
  } catch (error) {
    console.error('Fetch Task Details Error:', error);
    res.status(500).json({ error: 'Failed to retrieve task details.' });
  }
});

/**
 * @route   POST /api/tasks/:id/check
 * @desc    Submits verification audit check log, renewing the task's compliant status (PRO 10).
 * @access  Private (Admins and Asset Managers only)
 */
router.post(
  '/:id/check',
  authenticate,
  requireRole(['ADMIN', 'ASSET_MANAGER']),
  auditLogger('COMPLIANCE'),
  async (req, res) => {
    const { id } = req.params;
    const { status, notes, evidenceUrl } = req.body;

    if (!status || !notes) {
      return res.status(400).json({ error: 'Missing audit details. Status and notes are mandatory.' });
    }

    try {
      // 1. Verify task existence
      const task = await prisma.complianceTask.findUnique({
        where: { id }
      });

      if (!task) {
        return res.status(404).json({ error: 'Compliance task not found.' });
      }

      // 2. Perform check-off and calculate new dates inside a Transaction
      const result = await prisma.$transaction(async (tx) => {
        // Record task log evidence
        const newLog = await tx.complianceTaskLog.create({
          data: {
            taskId: id,
            checkedBy: req.user.email,
            status,
            notes,
            evidenceUrl: evidenceUrl || null
          }
        });

        // Determine new task status
        // If status is COMPLIANT, clear status to COMPLIANT. Otherwise ACTION_REQUIRED.
        const taskStatus = status === 'COMPLIANT' ? 'COMPLIANT' : 'ACTION_REQUIRED';
        const nextDue = calculateNextDueDate(task.frequency);

        // Update task schedule parameters
        const updatedTask = await tx.complianceTask.update({
          where: { id },
          data: {
            status: taskStatus,
            lastChecked: new Date(),
            nextDueDate: nextDue
          }
        });

        return { updatedTask, newLog };
      });

      res.status(201).json(result);

    } catch (error) {
      console.error('Submit Compliance Check Error:', error);
      res.status(500).json({ error: 'Failed to submit compliance check.' });
    }
  }
);

// ==========================================
// NON-CONFORMANCE ENDPOINTS (PRO 03)
// ==========================================

/**
 * @route   GET /api/nonconformances
 * @desc    Retrieves all logged Non-Conformances (FMT 13).
 * @access  Private (Authenticated users)
 */
router.get('/nonconformances/all', authenticate, async (req, res) => {
  try {
    const list = await prisma.nonConformance.findMany({
      include: {
        task: {
          select: { code: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(list);
  } catch (error) {
    console.error('Fetch Non-Conformances Error:', error);
    res.status(500).json({ error: 'Failed to retrieve Non-Conformance ledger.' });
  }
});

/**
 * @route   POST /api/nonconformances
 * @desc    Records a new Non-Conformance deviation and requests corrective actions (FMT 13/14).
 * @access  Private (Admins and Asset Managers only)
 */
router.post(
  '/nonconformances/log',
  authenticate,
  requireRole(['ADMIN', 'ASSET_MANAGER']),
  auditLogger('COMPLIANCE'),
  async (req, res) => {
    const { source, description, severity, correctiveAction, targetClosureDate, taskId } = req.body;

    if (!source || !description || !severity || !targetClosureDate) {
      return res.status(400).json({ error: 'Missing mandatory fields for logging non-conformance.' });
    }

    try {
      // Auto-generate NC tag: NC-2026-nnnn
      const count = await prisma.nonConformance.count();
      const paddedCount = String(count + 1).padStart(4, '0');
      const code = `NC-2026-${paddedCount}`;

      const nc = await prisma.nonConformance.create({
        data: {
          code,
          source,
          description,
          severity,
          status: 'OPEN',
          correctiveAction: correctiveAction || null,
          targetClosureDate: new Date(targetClosureDate),
          taskId: taskId || null
        }
      });

      res.status(201).json(nc);

    } catch (error) {
      console.error('Log Non-Conformance Error:', error);
      res.status(500).json({ error: 'Failed to record Non-Conformance.' });
    }
  }
);

/**
 * @route   PUT /api/nonconformances/:id/close
 * @desc    Closes an open Non-Conformance following verification of corrective actions (PRO 03).
 * @access  Private (Admins only)
 */
router.put(
  '/nonconformances/:id/close',
  authenticate,
  requireRole(['ADMIN']),
  auditLogger('COMPLIANCE'),
  async (req, res) => {
    const { id } = req.params;

    try {
      const nc = await prisma.nonConformance.findUnique({
        where: { id }
      });

      if (!nc) {
        return res.status(404).json({ error: 'Non-Conformance record not found.' });
      }

      if (nc.status === 'CLOSED') {
        return res.status(400).json({ error: 'This Non-Conformance record is already closed.' });
      }

      const closedNc = await prisma.nonConformance.update({
        where: { id },
        data: {
          status: 'CLOSED',
          closedDate: new Date(),
          closedBy: req.user.email
        }
      });

      res.json(closedNc);

    } catch (error) {
      console.error('Close Non-Conformance Error:', error);
      res.status(500).json({ error: 'Failed to close Non-Conformance record.' });
    }
  }
);

module.exports = router;
