// backend/src/routes/registers.js

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireRole } = require('../middleware/auth');
const auditLogger = require('../middleware/auditLogger');

// Create Express Router for digitized registers
const router = express.Router();

// Initialize Prisma
const prisma = new PrismaClient();

// ==========================================
// 1. CONTROLLED DOCUMENTS (FMT 01/02/04)
// ==========================================

/**
 * @route   GET /api/registers/documents
 * @desc    Retrieves all controlled policies, procedures, and formats (FMT 01).
 * @access  Private (Authenticated users)
 */
router.get('/documents', authenticate, async (req, res) => {
  try {
    const docs = await prisma.controlledDocument.findMany({
      orderBy: { docCode: 'asc' }
    });
    res.json(docs);
  } catch (error) {
    console.error('Fetch Controlled Documents Error:', error);
    res.status(500).json({ error: 'Failed to load controlled documents registry.' });
  }
});

/**
 * @route   POST /api/registers/documents
 * @desc    Registers a new document or updates a version with change notes (FMT 04).
 * @access  Private (Admins only)
 */
router.post(
  '/documents',
  authenticate,
  requireRole(['ADMIN']),
  auditLogger('COMPLIANCE'),
  async (req, res) => {
    const { docCode, title, type, version, owner, approvedBy, effectiveDate, reviewCycleMonths, changeSummary } = req.body;

    if (!docCode || !title || !type || !version || !owner || !effectiveDate) {
      return res.status(400).json({ error: 'Missing mandatory document details.' });
    }

    try {
      const effDate = new Date(effectiveDate);
      const cycle = parseInt(reviewCycleMonths) || 12;
      const nextReview = new Date(effDate);
      nextReview.setMonth(nextReview.getMonth() + cycle);

      const payload = {
        title,
        type,
        version,
        status: 'APPROVED',
        owner,
        approvedBy: approvedBy || 'IT Head',
        effectiveDate: effDate,
        reviewCycleMonths: cycle,
        nextReviewDate: nextReview,
        changeSummary: changeSummary || null
      };

      // Upsert document record
      const doc = await prisma.controlledDocument.upsert({
        where: { docCode },
        update: payload,
        create: {
          docCode,
          ...payload
        }
      });

      res.status(201).json(doc);
    } catch (error) {
      console.error('Save Controlled Document Error:', error);
      res.status(500).json({ error: 'Failed to record controlled document.' });
    }
  }
);

// ==========================================
// 2. RISK REGISTER (FMT 06/07)
// ==========================================

/**
 * @route   GET /api/registers/risks
 * @desc    Retrieves all risk evaluation and treatment records (FMT 06).
 * @access  Private (Authenticated users)
 */
router.get('/risks', authenticate, async (req, res) => {
  try {
    const risks = await prisma.riskRecord.findMany({
      orderBy: { riskScore: 'desc' } // Prioritize by risk severity
    });
    res.json(risks);
  } catch (error) {
    console.error('Fetch Risks Error:', error);
    res.status(500).json({ error: 'Failed to load risk register.' });
  }
});

/**
 * @route   POST /api/registers/risks
 * @desc    Logs a new risk assessment and treatment plan (FMT 06).
 * @access  Private (Admins and Asset Managers only)
 */
router.post(
  '/risks',
  authenticate,
  requireRole(['ADMIN', 'ASSET_MANAGER']),
  auditLogger('COMPLIANCE'),
  async (req, res) => {
    const { assetOrProcess, threat, vulnerability, impactScore, likelihoodScore, treatmentStrategy, treatmentPlan, targetDate, owner } = req.body;

    if (!assetOrProcess || !threat || !vulnerability || !impactScore || !likelihoodScore || !treatmentStrategy || !targetDate || !owner) {
      return res.status(400).json({ error: 'Missing required risk assessment parameters.' });
    }

    try {
      const count = await prisma.riskRecord.count();
      const paddedCount = String(count + 1).padStart(4, '0');
      const riskCode = `RISK-2026-${paddedCount}`;

      const riskScore = parseInt(impactScore) * parseInt(likelihoodScore);

      const risk = await prisma.riskRecord.create({
        data: {
          riskCode,
          assetOrProcess,
          threat,
          vulnerability,
          impactScore: parseInt(impactScore),
          likelihoodScore: parseInt(likelihoodScore),
          riskScore,
          treatmentStrategy,
          treatmentPlan: treatmentPlan || 'None',
          targetDate: new Date(targetDate),
          owner,
          status: 'OPEN'
        }
      });

      res.status(201).json(risk);
    } catch (error) {
      console.error('Save Risk Error:', error);
      res.status(500).json({ error: 'Failed to record risk assessment.' });
    }
  }
);

// ==========================================
// 3. ACCESS REQUESTS (FMT 08/32)
// ==========================================

/**
 * @route   GET /api/registers/access-requests
 * @desc    Retrieves access requests. Admins see all, employees see their own.
 * @access  Private (Authenticated users)
 */
router.get('/access-requests', authenticate, async (req, res) => {
  try {
    const where = req.user.role === 'EMPLOYEE' ? { requestedBy: req.user.email } : {};
    const requests = await prisma.accessRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    res.json(requests);
  } catch (error) {
    console.error('Fetch Access Requests Error:', error);
    res.status(500).json({ error: 'Failed to load access request logs.' });
  }
});

/**
 * @route   POST /api/registers/access-requests
 * @desc    Submits a new access request form (FMT 08).
 * @access  Private (Authenticated users)
 */
router.post(
  '/access-requests',
  authenticate,
  auditLogger('COMPLIANCE'),
  async (req, res) => {
    const { systemName, accessType, justification } = req.body;

    if (!systemName || !accessType || !justification) {
      return res.status(400).json({ error: 'Missing access request requirements.' });
    }

    try {
      const count = await prisma.accessRequest.count();
      const paddedCount = String(count + 1).padStart(4, '0');
      const requestCode = `AR-2026-${paddedCount}`;

      const request = await prisma.accessRequest.create({
        data: {
          requestCode,
          requestedBy: req.user.email,
          systemName,
          accessType,
          justification,
          status: 'PENDING'
        }
      });

      res.status(201).json(request);
    } catch (error) {
      console.error('Create Access Request Error:', error);
      res.status(500).json({ error: 'Failed to submit access request.' });
    }
  }
);

/**
 * @route   PUT /api/registers/access-requests/:id/approve
 * @desc    Approves or Rejects a user access request (FMT 32 action taken logging).
 * @access  Private (Admins only)
 */
router.put(
  '/access-requests/:id/approve',
  authenticate,
  requireRole(['ADMIN']),
  auditLogger('COMPLIANCE'),
  async (req, res) => {
    const { id } = req.params;
    const { status, actionTaken } = req.body; // status: APPROVED or REJECTED

    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid approval status.' });
    }

    try {
      const request = await prisma.accessRequest.findUnique({
        where: { id }
      });

      if (!request) {
        return res.status(404).json({ error: 'Request not found.' });
      }

      const updated = await prisma.accessRequest.update({
        where: { id },
        data: {
          status,
          approvedBy: req.user.email,
          approvalDate: new Date(),
          actionTaken: status === 'APPROVED' ? (actionTaken || 'PERMISSIONS_GRANTED') : 'REQUEST_DENIED',
          actionDate: new Date()
        }
      });

      res.json(updated);
    } catch (error) {
      console.error('Approve Access Request Error:', error);
      res.status(500).json({ error: 'Failed to update access request.' });
    }
  }
);

// ==========================================
// 4. INCIDENT LOGS (FMT 20/21)
// ==========================================

/**
 * @route   GET /api/registers/incidents
 * @desc    Retrieves all security incidents (FMT 20).
 * @access  Private (Authenticated users)
 */
router.get('/incidents', authenticate, async (req, res) => {
  try {
    const incidents = await prisma.securityIncident.findMany({
      orderBy: { dateOccurred: 'desc' }
    });
    res.json(incidents);
  } catch (error) {
    console.error('Fetch Incidents Error:', error);
    res.status(500).json({ error: 'Failed to retrieve incident register.' });
  }
});

/**
 * @route   POST /api/registers/incidents
 * @desc    Logs a security incident report (FMT 20).
 * @access  Private (Authenticated users)
 */
router.post(
  '/incidents',
  authenticate,
  auditLogger('COMPLIANCE'),
  async (req, res) => {
    const { dateOccurred, location, description, severity, containmentAction } = req.body;

    if (!dateOccurred || !location || !description || !severity || !containmentAction) {
      return res.status(400).json({ error: 'Missing mandatory incident report fields.' });
    }

    try {
      const count = await prisma.securityIncident.count();
      const paddedCount = String(count + 1).padStart(4, '0');
      const incidentCode = `INC-2026-${paddedCount}`;

      const incident = await prisma.securityIncident.create({
        data: {
          incidentCode,
          dateOccurred: new Date(dateOccurred),
          location,
          description,
          severity,
          containmentAction,
          status: 'OPEN'
        }
      });

      res.status(201).json(incident);
    } catch (error) {
      console.error('Log Incident Error:', error);
      res.status(500).json({ error: 'Failed to record incident report.' });
    }
  }
);

/**
 * @route   PUT /api/registers/incidents/:id/close
 * @desc    Closes an incident after root cause and action plan evaluation (FMT 21).
 * @access  Private (Admins only)
 */
router.put(
  '/incidents/:id/close',
  authenticate,
  requireRole(['ADMIN']),
  auditLogger('COMPLIANCE'),
  async (req, res) => {
    const { id } = req.params;
    const { rootCause, correctiveAction } = req.body;

    if (!rootCause || !correctiveAction) {
      return res.status(400).json({ error: 'Root cause and corrective action evaluations are required for closure.' });
    }

    try {
      const updated = await prisma.securityIncident.update({
        where: { id },
        data: {
          rootCause,
          correctiveAction,
          status: 'CLOSED',
          closedBy: req.user.email,
          closedDate: new Date()
        }
      });
      res.json(updated);
    } catch (error) {
      console.error('Close Incident Error:', error);
      res.status(500).json({ error: 'Failed to evaluate and close incident.' });
    }
  }
);

// ==========================================
// 5. VISITOR LOGS (FMT 22/23)
// ==========================================

router.get('/visitors', authenticate, async (req, res) => {
  try {
    const logs = await prisma.visitorLog.findMany({
      orderBy: { timeIn: 'desc' }
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load visitor register.' });
  }
});

router.post(
  '/visitors',
  authenticate,
  requireRole(['ADMIN', 'ASSET_MANAGER']),
  auditLogger('COMPLIANCE'),
  async (req, res) => {
    const { visitorName, organization, purpose, areaAccessed, badgeNumber } = req.body;

    if (!visitorName || !organization || !purpose || !areaAccessed) {
      return res.status(400).json({ error: 'Missing visitor details.' });
    }

    try {
      const log = await prisma.visitorLog.create({
        data: {
          visitorName,
          organization,
          purpose,
          areaAccessed,
          badgeNumber: badgeNumber || null,
          timeIn: new Date(),
          escortedBy: req.user.email
        }
      });
      res.status(201).json(log);
    } catch (error) {
      res.status(500).json({ error: 'Failed to log visitor.' });
    }
  }
);

router.put(
  '/visitors/:id/signout',
  authenticate,
  requireRole(['ADMIN', 'ASSET_MANAGER']),
  auditLogger('COMPLIANCE'),
  async (req, res) => {
    const { id } = req.params;
    try {
      const updated = await prisma.visitorLog.update({
        where: { id },
        data: { timeOut: new Date() }
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Failed to record visitor exit.' });
    }
  }
);

// ==========================================
// 6. BACKUP REGISTERS (FMT 34/35/36)
// ==========================================

router.get('/backups', authenticate, async (req, res) => {
  try {
    const logs = await prisma.backupRegister.findMany({
      orderBy: { backupDate: 'desc' }
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve backup logs.' });
  }
});

router.post(
  '/backups',
  authenticate,
  requireRole(['ADMIN', 'ASSET_MANAGER']),
  auditLogger('COMPLIANCE'),
  async (req, res) => {
    const { systemName, backupType, status, storageLocation } = req.body;

    if (!systemName || !backupType || !status || !storageLocation) {
      return res.status(400).json({ error: 'Missing backup log parameters.' });
    }

    try {
      const log = await prisma.backupRegister.create({
        data: {
          systemName,
          backupType,
          status,
          storageLocation,
          performedBy: req.user.email,
          backupDate: new Date()
        }
      });
      res.status(201).json(log);
    } catch (error) {
      res.status(500).json({ error: 'Failed to record backup log.' });
    }
  }
);

router.put(
  '/backups/:id/test',
  authenticate,
  requireRole(['ADMIN', 'ASSET_MANAGER']),
  auditLogger('COMPLIANCE'),
  async (req, res) => {
    const { id } = req.params;
    const { restorationStatus, restorationNotes } = req.body;

    if (!restorationStatus || !restorationNotes) {
      return res.status(400).json({ error: 'Restoration status and notes are required for test verification.' });
    }

    try {
      const updated = await prisma.backupRegister.update({
        where: { id },
        data: {
          restorationTested: true,
          restorationTestDate: new Date(),
          restorationStatus,
          restorationNotes
        }
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Failed to record restoration test.' });
    }
  }
);

// ==========================================
// 7. PATCHING REGISTERS (FMT 26)
// ==========================================

router.get('/patches', authenticate, async (req, res) => {
  try {
    const logs = await prisma.patchAuditLog.findMany({
      orderBy: { auditDate: 'desc' }
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve patch audits.' });
  }
});

router.post(
  '/patches',
  authenticate,
  requireRole(['ADMIN', 'ASSET_MANAGER']),
  auditLogger('COMPLIANCE'),
  async (req, res) => {
    const { serverName, patchId, criticality, status, remediationPlan } = req.body;

    if (!serverName || !patchId || !criticality || !status) {
      return res.status(400).json({ error: 'Missing patch log parameters.' });
    }

    try {
      const log = await prisma.patchAuditLog.create({
        data: {
          serverName,
          patchId,
          criticality,
          status,
          remediationPlan: remediationPlan || null,
          checkedBy: req.user.email,
          auditDate: new Date()
        }
      });
      res.status(201).json(log);
    } catch (error) {
      res.status(500).json({ error: 'Failed to record patch log.' });
    }
  }
);

// ==========================================
// 8. CHANGE MANAGEMENT REGISTERS (PRO 13 / FMT 25 / FMT 28)
// ==========================================

router.get('/changes', authenticate, async (req, res) => {
  try {
    const list = await prisma.changeRequest.findMany({
      include: { testRecords: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve Change requests.' });
  }
});

router.post('/changes', authenticate, auditLogger('COMPLIANCE'), async (req, res) => {
  const { title, systemName, description, reason, impactAnalysis, rollbackPlan, targetDate } = req.body;
  if (!title || !systemName || !description || !reason || !impactAnalysis || !rollbackPlan || !targetDate) {
    return res.status(400).json({ error: 'Missing Change Request parameters.' });
  }
  try {
    const count = await prisma.changeRequest.count();
    const code = `CR-2026-${String(count + 1).padStart(4, '0')}`;
    const cr = await prisma.changeRequest.create({
      data: {
        changeCode: code,
        title,
        systemName,
        description,
        reason,
        impactAnalysis,
        rollbackPlan,
        requestedBy: req.user.email,
        targetDate: new Date(targetDate),
        status: 'PENDING'
      }
    });
    res.status(201).json(cr);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create Change Request.' });
  }
});

router.put('/changes/:id/approve', authenticate, requireRole(['ADMIN']), auditLogger('COMPLIANCE'), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // APPROVED or REJECTED
  if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid approval status choice.' });
  }
  try {
    const updated = await prisma.changeRequest.update({
      where: { id },
      data: {
        status,
        approvedBy: req.user.email,
        approvalDate: new Date()
      }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update Change Request status.' });
  }
});

router.post('/changes/:id/test', authenticate, requireRole(['ADMIN', 'ASSET_MANAGER']), auditLogger('COMPLIANCE'), async (req, res) => {
  const { id } = req.params;
  const { testPlan, testCases, testResult } = req.body;
  if (!testPlan || !testCases || !testResult) {
    return res.status(400).json({ error: 'Missing test validation checklist parameters (FMT 28).' });
  }
  try {
    const record = await prisma.$transaction(async (tx) => {
      const test = await tx.changeTestRecord.create({
        data: {
          changeRequestId: id,
          testPlan,
          testCases,
          testResult,
          testedBy: req.user.email
        }
      });
      const crStatus = testResult === 'SUCCESS' ? 'TESTING' : 'REJECTED';
      await tx.changeRequest.update({
        where: { id },
        data: { status: crStatus }
      });
      return test;
    });
    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ error: 'Failed to record Change Test log.' });
  }
});

// ==========================================
// 9. TRAINING & AWARENESS REGISTERS (PRO 02 / FMT 16 / FMT 17 / FMT 18 / FMT 19)
// ==========================================

router.get('/trainings', authenticate, async (req, res) => {
  try {
    const list = await prisma.trainingSession.findMany({
      include: { attendanceList: true },
      orderBy: { scheduledDate: 'desc' }
    });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve Training register.' });
  }
});

router.post('/trainings', authenticate, requireRole(['ADMIN', 'ASSET_MANAGER']), auditLogger('COMPLIANCE'), async (req, res) => {
  const { topic, trainer, scheduledDate, durationHours } = req.body;
  if (!topic || !trainer || !scheduledDate || !durationHours) {
    return res.status(400).json({ error: 'Missing training plan parameters.' });
  }
  try {
    const session = await prisma.trainingSession.create({
      data: {
        topic,
        trainer,
        scheduledDate: new Date(scheduledDate),
        durationHours: parseFloat(durationHours),
        status: 'PLANNED'
      }
    });
    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create training session plan.' });
  }
});

router.post('/trainings/:id/attendance', authenticate, requireRole(['ADMIN', 'ASSET_MANAGER']), auditLogger('COMPLIANCE'), async (req, res) => {
  const { id } = req.params;
  const { employeeEmail } = req.body;
  if (!employeeEmail) {
    return res.status(400).json({ error: 'Missing employee email parameter.' });
  }
  try {
    const record = await prisma.trainingAttendance.create({
      data: {
        sessionId: id,
        employeeEmail,
        attended: true,
        evaluationStatus: 'AWAITING'
      }
    });
    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ error: 'Failed to register participant attendance.' });
  }
});

router.put('/trainings/attendance/:attendanceId/evaluate', authenticate, auditLogger('COMPLIANCE'), async (req, res) => {
  const { attendanceId } = req.params;
  const { feedbackRating, feedbackNotes, evaluationScore, evaluationStatus } = req.body;
  
  try {
    const attendance = await prisma.trainingAttendance.findUnique({
      where: { id: attendanceId }
    });

    if (!attendance) {
      return res.status(404).json({ error: 'Attendance record not found.' });
    }

    const payload = {};

    // 1. Employee submits feedback (FMT 18)
    if (feedbackRating !== undefined) {
      payload.feedbackRating = parseInt(feedbackRating);
      payload.feedbackNotes = feedbackNotes || '';
    }

    // 2. Admin submits evaluation score (FMT 19)
    if (evaluationScore !== undefined) {
      payload.evaluationScore = parseFloat(evaluationScore);
      payload.evaluationStatus = evaluationStatus || 'PASS';
    }

    const updated = await prisma.trainingAttendance.update({
      where: { id: attendanceId },
      data: payload
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit evaluation details.' });
  }
});

// ==========================================
// 10. BCP & DR REGISTERS (PRO 05 / FMT 29 / FMT 30)
// ==========================================

router.get('/bcp', authenticate, async (req, res) => {
  try {
    const list = await prisma.bcpSchedule.findMany({
      include: { testRecords: true },
      orderBy: { scheduledDate: 'desc' }
    });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve BCP register.' });
  }
});

router.post('/bcp', authenticate, requireRole(['ADMIN', 'ASSET_MANAGER']), auditLogger('COMPLIANCE'), async (req, res) => {
  const { systemName, scenario, scheduledDate, rto, rpo, coordinator } = req.body;
  if (!systemName || !scenario || !scheduledDate || !rto || !rpo || !coordinator) {
    return res.status(400).json({ error: 'Missing BCP scheduling parameters.' });
  }
  try {
    const count = await prisma.bcpSchedule.count();
    const code = `BCP-2026-${String(count + 1).padStart(4, '0')}`;
    const schedule = await prisma.bcpSchedule.create({
      data: {
        bcpCode: code,
        systemName,
        scenario,
        scheduledDate: new Date(scheduledDate),
        rto,
        rpo,
        coordinator,
        status: 'PLANNED'
      }
    });
    res.status(201).json(schedule);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create BCP schedule.' });
  }
});

router.post('/bcp/:id/test', authenticate, requireRole(['ADMIN', 'ASSET_MANAGER']), auditLogger('COMPLIANCE'), async (req, res) => {
  const { id } = req.params;
  const { actualRtoMinutes, dataLossObserved, successCriteriaMet, testResult, participants, notes } = req.body;
  if (actualRtoMinutes === undefined || !dataLossObserved || successCriteriaMet === undefined || !testResult || !participants || !notes) {
    return res.status(400).json({ error: 'Missing BCP Testing checklist details (FMT 30).' });
  }
  try {
    const record = await prisma.$transaction(async (tx) => {
      const test = await tx.bcpTestRecord.create({
        data: {
          bcpScheduleId: id,
          actualRtoMinutes: parseInt(actualRtoMinutes),
          dataLossObserved,
          successCriteriaMet: Boolean(successCriteriaMet),
          testResult,
          participants,
          notes,
          testedBy: req.user.email
        }
      });
      await tx.bcpSchedule.update({
        where: { id },
        data: { status: 'COMPLETED' }
      });
      return test;
    });
    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ error: 'Failed to record BCP test results.' });
  }
});

// ==========================================
// 11. SUPPLIER PERFORMANCE REGISTERS (PRO 23 / FMT 24)
// ==========================================

router.get('/suppliers', authenticate, async (req, res) => {
  try {
    const list = await prisma.supplierRecord.findMany({
      include: { reviews: true },
      orderBy: { supplierName: 'asc' }
    });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve Supplier list.' });
  }
});

router.post('/suppliers', authenticate, requireRole(['ADMIN', 'ASSET_MANAGER']), auditLogger('COMPLIANCE'), async (req, res) => {
  const { supplierName, serviceProvided, contactPerson, contactEmail } = req.body;
  if (!supplierName || !serviceProvided || !contactPerson || !contactEmail) {
    return res.status(400).json({ error: 'Missing supplier parameters.' });
  }
  try {
    const supplier = await prisma.supplierRecord.create({
      data: {
        supplierName,
        serviceProvided,
        contactPerson,
        contactEmail,
        status: 'ACTIVE'
      }
    });
    res.status(201).json(supplier);
  } catch (error) {
    res.status(500).json({ error: 'Failed to register supplier.' });
  }
});

router.post('/suppliers/:id/review', authenticate, requireRole(['ADMIN', 'ASSET_MANAGER']), auditLogger('COMPLIANCE'), async (req, res) => {
  const { id } = req.params;
  const { qualityRating, deliveryRating, securityRating, remarks } = req.body;
  if (qualityRating === undefined || deliveryRating === undefined || securityRating === undefined || !remarks) {
    return res.status(400).json({ error: 'Missing supplier rating evaluation parameters (FMT 24).' });
  }
  try {
    const quality = parseInt(qualityRating);
    const delivery = parseInt(deliveryRating);
    const security = parseInt(securityRating);
    const overallScore = parseFloat(((quality + delivery + security) / 3).toFixed(2));

    const review = await prisma.supplierPerformanceReview.create({
      data: {
        supplierId: id,
        qualityRating: quality,
        deliveryRating: delivery,
        securityRating: security,
        overallScore,
        remarks,
        reviewedBy: req.user.email
      }
    });
    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit supplier performance review.' });
  }
});

router.put('/suppliers/:id/status', authenticate, requireRole(['ADMIN']), auditLogger('COMPLIANCE'), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // ACTIVE, UNDER_REVIEW, BLACKLISTED
  if (!status || !['ACTIVE', 'UNDER_REVIEW', 'BLACKLISTED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value.' });
  }
  try {
    const updated = await prisma.supplierRecord.update({
      where: { id },
      data: { status }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update supplier status.' });
  }
});

// ==========================================
// 12. INTERNAL AUDITING REGISTERS (PRO 05 / FMT 09 / FMT 10 / FMT 11 / FMT 54)
// ==========================================

router.get('/audits', authenticate, async (req, res) => {
  try {
    const list = await prisma.auditPlan.findMany({
      include: { findings: true },
      orderBy: { scheduledDate: 'desc' }
    });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve Audit list.' });
  }
});

router.post('/audits', authenticate, requireRole(['ADMIN']), auditLogger('COMPLIANCE'), async (req, res) => {
  const { department, scheduledDate, leadAuditor, auditee, scope } = req.body;
  if (!department || !scheduledDate || !leadAuditor || !auditee || !scope) {
    return res.status(400).json({ error: 'Missing audit scheduling parameters.' });
  }
  try {
    const count = await prisma.auditPlan.count();
    const code = `AUDIT-2026-${String(count + 1).padStart(4, '0')}`;
    const audit = await prisma.auditPlan.create({
      data: {
        auditCode: code,
        department,
        scheduledDate: new Date(scheduledDate),
        leadAuditor,
        auditee,
        scope,
        status: 'PLANNED'
      }
    });
    res.status(201).json(audit);
  } catch (error) {
    res.status(500).json({ error: 'Failed to schedule audit plan.' });
  }
});

router.post('/audits/:id/finding', authenticate, requireRole(['ADMIN']), auditLogger('COMPLIANCE'), async (req, res) => {
  const { id } = req.params;
  const { checklistQuestion, evidenceObserved, complianceStatus, ncrCode } = req.body;
  if (!checklistQuestion || !evidenceObserved || !complianceStatus) {
    return res.status(400).json({ error: 'Missing audit checklist findings parameters (FMT 11/54).' });
  }
  try {
    const finding = await prisma.auditFinding.create({
      data: {
        auditPlanId: id,
        checklistQuestion,
        evidenceObserved,
        complianceStatus,
        ncrCode: ncrCode || null,
        testedBy: req.user.email
      }
    });
    res.status(201).json(finding);
  } catch (error) {
    res.status(500).json({ error: 'Failed to record audit finding.' });
  }
});

router.put('/audits/:id/complete', authenticate, requireRole(['ADMIN']), auditLogger('COMPLIANCE'), async (req, res) => {
  const { id } = req.params;
  try {
    const updated = await prisma.auditPlan.update({
      where: { id },
      data: { status: 'COMPLETED' }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete audit plan.' });
  }
});

// ==========================================
// 13. MEDIA DISPOSAL REGISTERS (PRO 19 / FMT 44 / FMT 45)
// ==========================================

router.get('/media', authenticate, async (req, res) => {
  try {
    const list = await prisma.mediaDisposalRecord.findMany({
      orderBy: { disposalDate: 'desc' }
    });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve Media Disposal register.' });
  }
});

router.post('/media', authenticate, auditLogger('COMPLIANCE'), async (req, res) => {
  const { mediaType, serialNumber, assetTag, classification, destructionMethod, witnessName } = req.body;
  if (!mediaType || !serialNumber || !destructionMethod || !witnessName) {
    return res.status(400).json({ error: 'Missing media disposal request details.' });
  }
  try {
    const count = await prisma.mediaDisposalRecord.count();
    const code = `MEDIA-2026-${String(count + 1).padStart(4, '0')}`;
    const record = await prisma.mediaDisposalRecord.create({
      data: {
        disposalCode: code,
        mediaType,
        serialNumber,
        assetTag: assetTag || null,
        classification: classification || 'CONFIDENTIAL',
        requestedBy: req.user.email,
        destructionMethod,
        witnessName,
        status: 'PENDING_APPROVAL'
      }
    });
    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create media disposal request.' });
  }
});

router.put('/media/:id/approve', authenticate, requireRole(['ADMIN', 'ASSET_MANAGER']), auditLogger('COMPLIANCE'), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // APPROVED or REJECTED
  if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid approval status value.' });
  }
  try {
    const updated = await prisma.mediaDisposalRecord.update({
      where: { id },
      data: {
        status,
        approvedBy: req.user.email
      }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update media disposal approval status.' });
  }
});

router.put('/media/:id/destroy', authenticate, requireRole(['ADMIN', 'ASSET_MANAGER']), auditLogger('COMPLIANCE'), async (req, res) => {
  const { id } = req.params;
  try {
    const updated = await prisma.mediaDisposalRecord.update({
      where: { id },
      data: {
        status: 'DESTROYED',
        disposalDate: new Date()
      }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to record final media destruction.' });
  }
});

// ==========================================
// 14. PASSWORDS & REVALIDATIONS (PRO 21 / FMT 31 / FMT 33)
// ==========================================

router.get('/passwords/tracks', authenticate, requireRole(['ADMIN']), async (req, res) => {
  try {
    const list = await prisma.passwordChangeTrack.findMany({
      orderBy: { changedDate: 'desc' }
    });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve password tracks.' });
  }
});

router.get('/passwords/revalidations', authenticate, async (req, res) => {
  try {
    const list = await prisma.userIdRevalidationReport.findMany({
      orderBy: { reviewDate: 'desc' }
    });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve revalidation reports.' });
  }
});

router.post('/passwords/revalidations', authenticate, requireRole(['ADMIN']), auditLogger('COMPLIANCE'), async (req, res) => {
  const { systemName, employeeEmail, currentAccessLevel, revalidated, actionTaken } = req.body;
  if (!systemName || !employeeEmail || !currentAccessLevel || revalidated === undefined || !actionTaken) {
    return res.status(400).json({ error: 'Missing revalidation parameters.' });
  }
  try {
    const count = await prisma.userIdRevalidationReport.count();
    const code = `REV-2026-${String(count + 1).padStart(4, '0')}`;
    const report = await prisma.userIdRevalidationReport.create({
      data: {
        revalidationCode: code,
        systemName,
        employeeEmail,
        currentAccessLevel,
        revalidated: Boolean(revalidated),
        actionTaken,
        revalidatedBy: req.user.email
      }
    });
    res.status(201).json(report);
  } catch (error) {
    res.status(500).json({ error: 'Failed to record revalidation report.' });
  }
});

router.post('/passwords/reset-track', authenticate, auditLogger('COMPLIANCE'), async (req, res) => {
  const { employeeEmail, reason } = req.body;
  if (!employeeEmail || !reason) {
    return res.status(400).json({ error: 'Missing track parameters.' });
  }
  try {
    const track = await prisma.passwordChangeTrack.create({
      data: {
        employeeEmail,
        reason,
        changedDate: new Date()
      }
    });
    res.status(201).json(track);
  } catch (error) {
    res.status(500).json({ error: 'Failed to record password change track.' });
  }
});

// ==========================================
// 15. LOG REVIEWS (PRO 12 / FMT 49 / FMT 50)
// ==========================================

router.get('/logs/reviews', authenticate, async (req, res) => {
  try {
    const list = await prisma.logReviewRecord.findMany({
      orderBy: { reviewDate: 'desc' }
    });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve log review records.' });
  }
});

router.post('/logs/reviews', authenticate, requireRole(['ADMIN', 'ASSET_MANAGER']), auditLogger('COMPLIANCE'), async (req, res) => {
  const { systemName, logSource, deviationsObserved, deviationDetails, actionTaken } = req.body;
  if (!systemName || !logSource || deviationsObserved === undefined) {
    return res.status(400).json({ error: 'Missing log review audit parameters.' });
  }
  try {
    const count = await prisma.logReviewRecord.count();
    const code = `LOG-2026-${String(count + 1).padStart(4, '0')}`;
    
    const record = await prisma.logReviewRecord.create({
      data: {
        reviewCode: code,
        systemName,
        logSource,
        deviationsObserved: Boolean(deviationsObserved),
        deviationDetails: deviationsObserved ? deviationDetails : null,
        actionTaken: deviationsObserved ? actionTaken : null,
        status: deviationsObserved ? 'ACTION_REQUIRED' : 'COMPLIANT',
        reviewedBy: req.user.email
      }
    });
    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ error: 'Failed to record log review audit.' });
  }
});

router.get('/dashboard-metrics', authenticate, async (req, res) => {
  try {
    const [
      totalAssets,
      allocatedAssets,
      criticalAssets,
      unverifiedAssets,
      incompleteAssets,
      pendingRequests,
      activeIncidents,
      backups,
      patches,
      suppliers,
      trainings,
      mrms,
      dbUser
    ] = await Promise.all([
      prisma.asset.count(),
      prisma.asset.count({ where: { status: 'ALLOCATED' } }),
      prisma.asset.count({ where: { classification: 'CONFIDENTIAL' } }),
      prisma.asset.count({ where: { nextVerificationDue: { lt: new Date() } } }),
      prisma.asset.count({ where: { isIncomplete: true } }),
      prisma.accessRequest.count({ where: { status: 'PENDING' } }),
      prisma.securityIncident.count({ where: { status: 'OPEN' } }),
      prisma.backupRegister.findMany(),
      prisma.patchAuditLog.findMany(),
      prisma.supplierRecord.count({ where: { status: 'ACTIVE' } }),
      prisma.trainingAttendance.findMany(),
      prisma.managementReview.count(),
      prisma.user.findUnique({ where: { email: req.user.email } })
    ]);

    const backupSuccess = backups.filter(b => b.status === 'SUCCESS').length;
    const backupTotal = backups.length;
    const patchInstalled = patches.filter(p => p.status === 'INSTALLED').length;
    const patchTotal = patches.length;
    const trainingPassed = trainings.filter(t => t.evaluationStatus === 'PASS').length;
    const trainingTotal = trainings.length;

    res.json({
      totalAssets,
      allocatedAssets,
      criticalAssets,
      unverifiedAssets,
      incompleteAssets,
      pendingRequests,
      activeIncidents,
      backupRate: backupTotal > 0 ? Math.round((backupSuccess / backupTotal) * 100) : 100,
      patchRate: patchTotal > 0 ? Math.round((patchInstalled / patchTotal) * 100) : 100,
      trainingPassRate: trainingTotal > 0 ? Math.round((trainingPassed / trainingTotal) * 100) : 100,
      supplierCount: suppliers,
      mrmCount: mrms,
      consentStatus: dbUser ? dbUser.hasConsented : false
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve dashboard metrics.' });
  }
});

// ==========================================
// 16. ADDITIONAL ADMINISTRATIVE FORMATS (FMT 15, 37, 38, 53, 03, 05, 39, 40, 41, 47, 48)
// ==========================================

router.get('/all-formats', authenticate, async (req, res) => {
  try {
    const [
      mrms, licenses, matrices, serverActivities, externalDocs,
      amendments, legislations, controlEffectivenessList,
      evaluations, communications, metrics
    ] = await Promise.all([
      prisma.managementReview.findMany({ orderBy: { meetingDate: 'desc' } }),
      prisma.licenseRecord.findMany({ orderBy: { expiryDate: 'asc' } }),
      prisma.accessControlMatrix.findMany(),
      prisma.serverRoomActivity.findMany({ orderBy: { activityDate: 'desc' } }),
      prisma.externalOriginDocument.findMany({ orderBy: { receivedDate: 'desc' } }),
      prisma.amendmentRecord.findMany({ orderBy: { dateOfAmendment: 'desc' } }),
      prisma.legislationRecord.findMany(),
      prisma.controlEffectiveness.findMany({ orderBy: { assessedDate: 'desc' } }),
      prisma.softwareEvaluation.findMany(),
      prisma.communicationMatrix.findMany(),
      prisma.ismsMetrics.findMany()
    ]);
    res.json({
      mrms, licenses, matrices, serverActivities, externalDocs,
      amendments, legislations, controlEffectivenessList,
      evaluations, communications, metrics
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve administrative registers.' });
  }
});

router.post('/management-review', authenticate, requireRole(['ADMIN']), auditLogger('COMPLIANCE'), async (req, res) => {
  const { attendees, agenda, discussionPoints, actionItems } = req.body;
  if (!attendees || !agenda || !discussionPoints || !actionItems ||
      String(attendees).trim() === '' || String(agenda).trim() === '' ||
      String(discussionPoints).trim() === '' || String(actionItems).trim() === '') {
    return res.status(400).json({ error: 'All meeting minutes fields are mandatory and cannot be empty.' });
  }
  try {
    const count = await prisma.managementReview.count();
    const code = `MRM-2026-${String(count + 1).padStart(4, '0')}`;
    const entry = await prisma.managementReview.create({
      data: { meetingCode: code, attendees: String(attendees).trim(), agenda: String(agenda).trim(), discussionPoints: String(discussionPoints).trim(), actionItems: String(actionItems).trim() }
    });
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to log MRM meeting.' });
  }
});

router.post('/license', authenticate, requireRole(['ADMIN', 'ASSET_MANAGER']), auditLogger('COMPLIANCE'), async (req, res) => {
  const { softwareName, licenseKey, totalLicenses, allocatedLicenses, expiryDate, owner } = req.body;
  if (!softwareName || !licenseKey || totalLicenses === undefined || allocatedLicenses === undefined || !expiryDate || !owner ||
      String(softwareName).trim() === '' || String(licenseKey).trim() === '' || String(owner).trim() === '') {
    return res.status(400).json({ error: 'All license tracking fields are mandatory and cannot be empty.' });
  }

  const parsedTotal = parseInt(totalLicenses, 10);
  const parsedAllocated = parseInt(allocatedLicenses, 10);
  if (isNaN(parsedTotal) || parsedTotal < 0 || isNaN(parsedAllocated) || parsedAllocated < 0) {
    return res.status(400).json({ error: 'Total and Allocated seat counts must be valid positive integers.' });
  }
  if (parsedAllocated > parsedTotal) {
    return res.status(400).json({ error: 'Allocated seat count cannot exceed total software licenses.' });
  }
  if (isNaN(Date.parse(expiryDate))) {
    return res.status(400).json({ error: 'License expiration date format is invalid.' });
  }

  try {
    const entry = await prisma.licenseRecord.create({
      data: { softwareName: String(softwareName).trim(), licenseKey: String(licenseKey).trim(), totalLicenses: parsedTotal, allocatedLicenses: parsedAllocated, expiryDate: new Date(expiryDate), owner: String(owner).trim() }
    });
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to log license record.' });
  }
});

router.post('/access-matrix', authenticate, requireRole(['ADMIN']), auditLogger('COMPLIANCE'), async (req, res) => {
  const { roleName, systemName, readAccess, writeAccess, adminAccess } = req.body;
  if (!roleName || !systemName || String(systemName).trim() === '') {
    return res.status(400).json({ error: 'Role group and target system name are mandatory.' });
  }

  const allowedRoles = ['EMPLOYEE', 'ASSET_MANAGER', 'ADMIN'];
  if (!allowedRoles.includes(roleName)) {
    return res.status(400).json({ error: `Invalid roleName group. Allowed: ${allowedRoles.join(', ')}` });
  }

  try {
    const entry = await prisma.accessControlMatrix.create({
      data: { roleName, systemName: String(systemName).trim(), readAccess: Boolean(readAccess), writeAccess: Boolean(writeAccess), adminAccess: Boolean(adminAccess) }
    });
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to log access matrix.' });
  }
});

router.post('/server-activity', authenticate, requireRole(['ADMIN', 'ASSET_MANAGER']), auditLogger('COMPLIANCE'), async (req, res) => {
  const { activityType, performedBy, witnessName, remarks } = req.body;
  if (!activityType || !performedBy || !witnessName || !remarks ||
      String(activityType).trim() === '' || String(performedBy).trim() === '' ||
      String(witnessName).trim() === '' || String(remarks).trim() === '') {
    return res.status(400).json({ error: 'All server activity fields are mandatory and cannot be empty.' });
  }
  try {
    const count = await prisma.serverRoomActivity.count();
    const code = `SRA-2026-${String(count + 1).padStart(4, '0')}`;
    const entry = await prisma.serverRoomActivity.create({
      data: { activityCode: code, activityType: String(activityType).trim(), performedBy: String(performedBy).trim(), witnessName: String(witnessName).trim(), remarks: String(remarks).trim() }
    });
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to log server room activity.' });
  }
});

router.post('/external-doc', authenticate, requireRole(['ADMIN', 'ASSET_MANAGER']), auditLogger('COMPLIANCE'), async (req, res) => {
  const { documentTitle, origin, version } = req.body;
  if (!documentTitle || !origin || !version ||
      String(documentTitle).trim() === '' || String(origin).trim() === '' || String(version).trim() === '') {
    return res.status(400).json({ error: 'All external origin document fields are mandatory.' });
  }
  try {
    const entry = await prisma.externalOriginDocument.create({
      data: { documentTitle: String(documentTitle).trim(), origin: String(origin).trim(), version: String(version).trim() }
    });
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to log external origin document.' });
  }
});

router.post('/amendment', authenticate, requireRole(['ADMIN']), auditLogger('COMPLIANCE'), async (req, res) => {
  const { formatCode, amendmentDetails } = req.body;
  if (!formatCode || !amendmentDetails ||
      String(formatCode).trim() === '' || String(amendmentDetails).trim() === '') {
    return res.status(400).json({ error: 'Template code reference and amendment details are mandatory.' });
  }
  try {
    const entry = await prisma.amendmentRecord.create({
      data: { formatCode: String(formatCode).trim(), amendmentDetails: String(amendmentDetails).trim(), approvedBy: req.user.email }
    });
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to log amendment record.' });
  }
});

router.post('/legislation', authenticate, requireRole(['ADMIN']), auditLogger('COMPLIANCE'), async (req, res) => {
  const { actName, applicableClause, complianceRequirement, status } = req.body;
  if (!actName || !applicableClause || !complianceRequirement ||
      String(actName).trim() === '' || String(applicableClause).trim() === '' || String(complianceRequirement).trim() === '') {
    return res.status(400).json({ error: 'Legislation act name, clause, and compliance requirement are mandatory.' });
  }

  const allowedStatuses = ['COMPLIANT', 'ACTION_REQUIRED'];
  const finalStatus = status || 'COMPLIANT';
  if (!allowedStatuses.includes(finalStatus)) {
    return res.status(400).json({ error: 'Invalid legislation compliance status.' });
  }

  try {
    const entry = await prisma.legislationRecord.create({
      data: { actName: String(actName).trim(), applicableClause: String(applicableClause).trim(), complianceRequirement: String(complianceRequirement).trim(), status: finalStatus }
    });
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to log legislation record.' });
  }
});

router.post('/control-effectiveness', authenticate, requireRole(['ADMIN']), auditLogger('COMPLIANCE'), async (req, res) => {
  const { controlCode, controlName, assessmentCriteria, effectivenessRating } = req.body;
  if (!controlCode || !controlName || !assessmentCriteria || effectivenessRating === undefined ||
      String(controlCode).trim() === '' || String(controlName).trim() === '' || String(assessmentCriteria).trim() === '') {
    return res.status(400).json({ error: 'All control effectiveness parameters are mandatory.' });
  }

  const parsedRating = parseInt(effectivenessRating, 10);
  if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
    return res.status(400).json({ error: 'Effectiveness rating must be an integer between 1 and 5.' });
  }

  try {
    const entry = await prisma.controlEffectiveness.create({
      data: { controlCode: String(controlCode).trim(), controlName: String(controlName).trim(), assessmentCriteria: String(assessmentCriteria).trim(), effectivenessRating: parsedRating, assessedBy: req.user.email }
    });
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to log control effectiveness.' });
  }
});

router.post('/software-evaluation', authenticate, requireRole(['ADMIN', 'ASSET_MANAGER']), auditLogger('COMPLIANCE'), async (req, res) => {
  const { softwareName, securityChecklist, evaluationResult } = req.body;
  if (!softwareName || !securityChecklist || !evaluationResult ||
      String(softwareName).trim() === '' || String(securityChecklist).trim() === '') {
    return res.status(400).json({ error: 'Software name, checklist details, and result outcome are mandatory.' });
  }

  const allowedResults = ['APPROVED', 'REJECTED'];
  if (!allowedResults.includes(evaluationResult)) {
    return res.status(400).json({ error: 'Invalid software evaluation checklist result.' });
  }

  try {
    const entry = await prisma.softwareEvaluation.create({
      data: { softwareName: String(softwareName).trim(), securityChecklist: String(securityChecklist).trim(), evaluationResult, evaluatedBy: req.user.email }
    });
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to log software evaluation.' });
  }
});

router.post('/communication-matrix', authenticate, requireRole(['ADMIN']), auditLogger('COMPLIANCE'), async (req, res) => {
  const { stakeholder, informationShared, channel, frequency } = req.body;
  if (!stakeholder || !informationShared || !channel || !frequency ||
      String(stakeholder).trim() === '' || String(informationShared).trim() === '' ||
      String(channel).trim() === '' || String(frequency).trim() === '') {
    return res.status(400).json({ error: 'All communication matrix configuration parameters are mandatory.' });
  }
  try {
    const entry = await prisma.communicationMatrix.create({
      data: { stakeholder: String(stakeholder).trim(), informationShared: String(informationShared).trim(), channel: String(channel).trim(), frequency: String(frequency).trim() }
    });
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to log communication matrix.' });
  }
});

router.post('/isms-metrics', authenticate, requireRole(['ADMIN']), auditLogger('COMPLIANCE'), async (req, res) => {
  const { objective, metricName, targetValue, actualValue, frequency } = req.body;
  if (!objective || !metricName || !targetValue || !actualValue || !frequency ||
      String(objective).trim() === '' || String(metricName).trim() === '' ||
      String(targetValue).trim() === '' || String(actualValue).trim() === '' || String(frequency).trim() === '') {
    return res.status(400).json({ error: 'All ISMS target objective and KPI metric fields are mandatory.' });
  }
  try {
    const entry = await prisma.ismsMetrics.create({
      data: { objective: String(objective).trim(), metricName: String(metricName).trim(), targetValue: String(targetValue).trim(), actualValue: String(actualValue).trim(), frequency: String(frequency).trim() }
    });
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to log metric.' });
  }
});


module.exports = router;









