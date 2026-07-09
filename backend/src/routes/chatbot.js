// backend/src/routes/chatbot.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @route   POST /api/chatbot/message
 * @desc    Processes natural language queries, queries the database, and provides navigation help.
 * @access  Private (Authenticated users)
 */
router.post('/message', authenticate, async (req, res) => {
  const { message } = req.body;
  if (!message || String(message).trim() === '') {
    return res.status(400).json({ error: 'Message content cannot be empty.' });
  }

  const query = String(message).toLowerCase().trim();
  let reply = '';
  let data = null;

  try {
    // -----------------------------------------------------------------
    // INTENT 1: ASSET INVENTORY QUERIES
    // -----------------------------------------------------------------
    if ((query.includes('asset') || query.includes('device') || query.includes('hardware')) && 
        (query.includes('how many') || query.includes('count') || query.includes('total') || query.includes('list'))) {
      
      const count = await prisma.asset.count();
      const confidential = await prisma.asset.count({ where: { classification: 'CONFIDENTIAL' } });
      reply = `There are currently **${count}** IT assets registered in the database inventory (including **${confidential}** classified as CONFIDENTIAL).`;
      
      // If user wants details or list, fetch the first few assets
      if (query.includes('list') || query.includes('show') || query.includes('detail')) {
        const list = await prisma.asset.findMany({ take: 5, select: { assetTag: true, name: true, status: true } });
        data = list;
        reply += ` Here are the latest registered assets:`;
      }
    }
    
    // -----------------------------------------------------------------
    // INTENT 2: VERIFICATION OVERDUE
    // -----------------------------------------------------------------
    else if (query.includes('overdue') || query.includes('unverified') || query.includes('due')) {
      const count = await prisma.asset.count({
        where: { nextVerificationDue: { lt: new Date() } }
      });
      reply = `There are **${count}** assets overdue for physical verification audit checks (ISO 27001 Control A.5.9 compliance).`;
      if (count > 0) {
        const list = await prisma.asset.findMany({
          where: { nextVerificationDue: { lt: new Date() } },
          take: 3,
          select: { assetTag: true, name: true, location: true }
        });
        data = list;
        reply += ` Overdue assets include:`;
      }
    }

    // -----------------------------------------------------------------
    // INTENT 3: MY ALLOCATED DEVICES
    // -----------------------------------------------------------------
    else if (query.includes('my asset') || query.includes('assigned to me') || query.includes('allocated to me') || query.includes('my device')) {
      const list = await prisma.asset.findMany({
        where: { owner: { email: req.user.email } },
        select: { assetTag: true, name: true, status: true, lastVerifiedDate: true }
      });
      if (list.length === 0) {
        reply = `You do not have any physical assets allocated to your account currently.`;
      } else {
        reply = `You have **${list.length}** device(s) allocated to your profile:`;
        data = list;
      }
    }

    // -----------------------------------------------------------------
    // INTENT 4: PENDING ACCESS REQUESTS
    // -----------------------------------------------------------------
    else if (query.includes('pending request') || query.includes('access request') || query.includes('approvals')) {
      const count = await prisma.accessRequest.count({ where: { status: 'PENDING' } });
      reply = `There are currently **${count}** access requests pending authorization checks.`;
      if (count > 0) {
        const list = await prisma.accessRequest.findMany({
          where: { status: 'PENDING' },
          take: 3,
          select: { requestCode: true, systemName: true, accessType: true }
        });
        data = list;
        reply += ` Pending requests list:`;
      }
    }

    // -----------------------------------------------------------------
    // INTENT 5: BACKUP & RESTORATION
    // -----------------------------------------------------------------
    else if (query.includes('backup') || query.includes('restoration') || query.includes('recovery')) {
      const list = await prisma.backupRegister.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' },
        select: { systemName: true, status: true, backupType: true, restorationStatus: true }
      });
      reply = `Here is the status of the latest backup registries (FMT 35/36 compliance):`;
      data = list;
    }

    // -----------------------------------------------------------------
    // INTENT 6: SERVER PATCH STATUS
    // -----------------------------------------------------------------
    else if (query.includes('patch') || query.includes('vulnerability') || query.includes('cve')) {
      const list = await prisma.patchAuditLog.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' },
        select: { serverName: true, patchId: true, status: true, criticality: true }
      });
      reply = `Here are the latest OS patch installation records (FMT 26 compliance):`;
      data = list;
    }

    // -----------------------------------------------------------------
    // INTENT 7: SUPPLIER AUDITING
    // -----------------------------------------------------------------
    else if (query.includes('supplier') || query.includes('vendor')) {
      const count = await prisma.supplierRecord.count();
      reply = `There are **${count}** registered third-party suppliers (PRO 23).`;
      const list = await prisma.supplierRecord.findMany({
        take: 3,
        select: { supplierName: true, serviceProvided: true }
      });
      data = list;
      reply += ` Active suppliers include:`;
    }

    // -----------------------------------------------------------------
    // INTENT 8: LATEST MRM MINUTES
    // -----------------------------------------------------------------
    else if (query.includes('mrm') || query.includes('meeting') || query.includes('minutes')) {
      const entry = await prisma.managementReview.findFirst({
        orderBy: { meetingDate: 'desc' }
      });
      if (!entry) {
        reply = `No Management Review Meetings (FMT 15) are logged in the compliance database.`;
      } else {
        reply = `Here are the minutes of the latest MRM meeting (**${entry.meetingCode}**):`;
        data = {
          agenda: entry.agenda,
          discussionPoints: entry.discussionPoints,
          actionItems: entry.actionItems,
          meetingDate: entry.meetingDate
        };
      }
    }

    // -----------------------------------------------------------------
    // INTENT 9: NAVIGATION ASSISTANCE
    // -----------------------------------------------------------------
    else if (query.includes('profile') || query.includes('consent') || query.includes('anonymize') || query.includes('erasure')) {
      reply = `To manage your profile settings, spelling corrections (DPDP Section 11), consent declarations, or Right to Erasure account purges (DPDP Section 12), select the **'My Profile & Consent'** tab in the sidebar.`;
    } 
    else if (query.includes('register asset') || query.includes('add asset') || query.includes('create asset')) {
      reply = `To onboard a new asset, navigate to the **'Asset Inventory'** tab and click the dark orange **'Register Asset'** button at the top right of the page (Admin/Manager permissions required).`;
    } 
    else if (query.includes('document') || query.includes('policy') || query.includes('dcn')) {
      reply = `To review controlled ISMS files or log Document Change Notes (FMT 04), navigate to the **'Controlled Documents'** tab in the sidebar.`;
    } 
    else if (query.includes('task') || query.includes('calendar') || query.includes('evidence')) {
      reply = `To sign off compliance check-offs, verify calendars, or upload audit evidence files, open the **'Compliance Tasks'** tab in the sidebar.`;
    } 
    else if (query.includes('ncr') || query.includes('non-conformance') || query.includes('car')) {
      reply = `To log compliance non-conformances (FMT 13) or corrective action closures (FMT 14), navigate to the **'Non-Conformances'** tab.`;
    } 
    else if (query.includes('ropa') || query.includes('privacy')) {
      reply = `To declare information processing mappings, view the Record of Processing Activities (RoPA) register tab.`;
    } 
    else if (query.includes('audit logs') || query.includes('cert-in logs') || query.includes('history')) {
      reply = `To audit platform activity or download compliance CSV exports (CERT-In 180-day retention rules), open the **'CERT-In Audit Logs'** tab (Admin only).`;
    }

    // -----------------------------------------------------------------
    // FALLBACK / DEFAULT
    // -----------------------------------------------------------------
    else {
      reply = `Hello! I am your compliance assistant. I can query the database directly or help you navigate. Try asking:\n\n` +
              `• "How many assets are registered?"\n` +
              `• "Are there any overdue verifications?"\n` +
              `• "Show my allocated assets"\n` +
              `• "What is our latest backup status?"\n` +
              `• "What is the patch update status?"\n` +
              `• "Where do I find the non-conformances ledger?"`;
    }

    res.json({ reply, data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process chatbot request.' });
  }
});

module.exports = router;
