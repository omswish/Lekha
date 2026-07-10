// backend/src/routes/chatbot.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const {
  normalizeAssetCategory,
  normalizeAssetStatus,
  getAssetCategoryLabel
} = require('../utils/assetCatalog');

const router = express.Router();
const prisma = new PrismaClient();

// Clean up keys for display
function sanitizeRecord(record) {
  if (!record) return null;
  const result = { ...record };
  delete result.id;
  delete result.ownerId;
  delete result.createdAt;
  delete result.updatedAt;
  return result;
}

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

  const rawQuery = String(message).trim();
  const query = rawQuery.toLowerCase();
  let reply = '';
  let data = null;
  let action = null;

  try {
    // -----------------------------------------------------------------
    // 1. EXTRACT ASSET TAG (Pattern: UAIL/IT/XX/NNNN or UAIL/MIGRATE/XX/NNNN)
    // -----------------------------------------------------------------
    const tagMatch = query.match(/uail\/[a-z0-9\/]+/);
    if (tagMatch) {
      const targetTag = tagMatch[0].toUpperCase();
      const asset = await prisma.asset.findUnique({
        where: { assetTag: targetTag },
        include: { owner: { select: { name: true, department: true, email: true } } }
      });

      if (asset) {
        reply = `Found details for asset **${targetTag}** (**${asset.name}**):`;
        data = sanitizeRecord({
          ...asset,
          owner: asset.owner ? `${asset.owner.name} (${asset.owner.department})` : 'Stock (Unassigned)',
          customFields: asset.customFields ? JSON.stringify(asset.customFields) : 'None'
        });
        return res.json({ reply, data });
      } else {
        reply = `I identified asset tag **${targetTag}** in your query, but could not find it in the active registry.`;
        return res.json({ reply });
      }
    }

    // -----------------------------------------------------------------
    // 2. EXTRACT SERIAL NUMBER (Scan words for potential matches in database)
    // -----------------------------------------------------------------
    const words = query.split(/[^a-z0-9\-]+/);
    for (const word of words) {
      if (word.length >= 6) {
        const assetBySerial = await prisma.asset.findUnique({
          where: { serialNumber: word.toUpperCase() },
          include: { owner: { select: { name: true, department: true } } }
        });
        if (assetBySerial) {
          reply = `Found asset match by Serial Number **${word.toUpperCase()}** (**${assetBySerial.name}**):`;
          data = sanitizeRecord({
            ...assetBySerial,
            owner: assetBySerial.owner ? `${assetBySerial.owner.name} (${assetBySerial.owner.department})` : 'Stock'
          });
        }
      }
    }

    // -----------------------------------------------------------------
    // 2A. ASSET DETAILS FOR SPECIFIC USER NAME / EMAIL
    // -----------------------------------------------------------------
    const detailsMatch = query.match(/(?:details\s+for|assets\s+of|allocated\s+to|assigned\s+to)\s+([a-z0-9\.\-_@\s]+)/i);
    if (detailsMatch) {
      const userSearch = detailsMatch[1].trim();
      const matchedUser = await prisma.user.findFirst({
        where: {
          OR: [
            { name: { contains: userSearch, mode: 'insensitive' } },
            { email: { contains: userSearch, mode: 'insensitive' } }
          ]
        }
      });

      if (matchedUser) {
        const userAssets = await prisma.asset.findMany({
          where: { ownerId: matchedUser.id },
          select: { assetTag: true, name: true, model: true, status: true, location: true }
        });

        if (userAssets.length > 0) {
          reply = `Found **${userAssets.length}** asset(s) allocated to user **${matchedUser.name}** (${matchedUser.email}):`;
          data = userAssets;
        } else {
          reply = `User **${matchedUser.name}** (${matchedUser.email}) exists in the registry, but has no physical assets allocated currently.`;
        }
        return res.json({ reply, data });
      } else {
        reply = `I could not find any registered user matching **"${userSearch}"** in the database.`;
        return res.json({ reply });
      }
    }

    // -----------------------------------------------------------------
    // 2B. STATUS OF ALLOCATION BREAKDOWN
    // -----------------------------------------------------------------
    if (query.includes('status of allocation') || query.includes('allocation status') || query.includes('status of asset') || query.includes('asset status')) {
      const [total, allocated, procured, maintenance, disposed, lost] = await Promise.all([
        prisma.asset.count(),
        prisma.asset.count({ where: { status: 'ALLOCATED' } }),
        prisma.asset.count({ where: { status: 'PROCURED' } }),
        prisma.asset.count({ where: { status: 'MAINTENANCE' } }),
        prisma.asset.count({ where: { status: 'DISPOSED' } }),
        prisma.asset.count({ where: { status: 'LOST' } })
      ]);

      reply = `Here is the current breakdown of asset allocations in the database registry:\n\n` +
              `• **Allocated (In Use)**: ${allocated} units\n` +
              `• **Procured (In Stock)**: ${procured} units\n` +
              `• **Under Maintenance**: ${maintenance} units\n` +
              `• **Disposed / Scrap**: ${disposed} units\n` +
              `• **Lost / Stolen**: ${lost} units\n\n` +
              `Total Registered Units: **${total}**`;
      
      return res.json({ reply });
    }

    // -----------------------------------------------------------------
    // 3. NAVIGATION TRIGGERS (Redirect user to tab in front-end)
    // -----------------------------------------------------------------
    if (query.includes('navigate') || query.includes('go to') || query.includes('show tab') || query.includes('open tab') || query.includes('view tab')) {
      if (query.includes('profile') || query.includes('consent') || query.includes('erasure')) {
        reply = 'Navigating you to **My Profile & Consent** view.';
        action = { type: 'NAVIGATE', tab: 'profile' };
        return res.json({ reply, action });
      }
      if (query.includes('inventory') || query.includes('asset') || query.includes('device') || query.includes('hardware')) {
        reply = 'Opening **Asset Inventory** register.';
        action = { type: 'NAVIGATE', tab: 'inventory' };
        return res.json({ reply, action });
      }
      if (query.includes('document') || query.includes('policy') || query.includes('dcn')) {
        reply = 'Opening **Controlled Documents** register.';
        action = { type: 'NAVIGATE', tab: 'documents' };
        return res.json({ reply, action });
      }
      if (query.includes('task') || query.includes('check-off') || query.includes('calendar') || query.includes('evidence')) {
        reply = 'Opening your **Compliance Tasks** checklist.';
        action = { type: 'NAVIGATE', tab: 'tasks' };
        return res.json({ reply, action });
      }
      if (query.includes('non-conformance') || query.includes('ncr') || query.includes('car')) {
        reply = 'Opening the **Non-Conformances** ledgers.';
        action = { type: 'NAVIGATE', tab: 'conformances' };
        return res.json({ reply, action });
      }
      if (query.includes('ropa') || query.includes('privacy')) {
        reply = 'Opening the **RoPA Registry** tab.';
        action = { type: 'NAVIGATE', tab: 'ropa' };
        return res.json({ reply, action });
      }
      if (query.includes('audit logs') || query.includes('cert-in logs') || query.includes('audit history')) {
        reply = 'Opening **CERT-In Audit Logs** tab.';
        action = { type: 'NAVIGATE', tab: 'audit-logs' };
        return res.json({ reply, action });
      }
    }

    // -----------------------------------------------------------------
    // 4. INCOMPLETE DATA INQUIRIES
    // -----------------------------------------------------------------
    if (query.includes('incomplete') || query.includes('missing field') || query.includes('missing data') || query.includes('verification needed')) {
      const count = await prisma.asset.count({ where: { isIncomplete: true } });
      reply = `There are currently **${count}** assets marked as having **incomplete data** (records with missing attributes or 'Not Available' status).`;
      if (count > 0) {
        const list = await prisma.asset.findMany({
          where: { isIncomplete: true },
          take: 3,
          select: { assetTag: true, name: true, category: true, location: true }
        });
        data = list;
        reply += ` Here are a few examples that need verification:`;
        action = { type: 'NAVIGATE', tab: 'inventory' }; // Navigate to list
      }
      return res.json({ reply, data, action });
    }

    // -----------------------------------------------------------------
    // 5. ASSET CATEGORY COUNTS AND LISTS
    // -----------------------------------------------------------------
    const categories = ['LAPTOP', 'DESKTOP', 'PRINTER', 'MTR', 'KIOSK', 'SERVER', 'STORAGE', 'TAPE_LIBRARY', 'SWITCH', 'ROUTER', 'FIREWALL', 'UPS', 'ACCESS_POINT', 'VC_UNIT', 'DATA_CARD', 'PROJECTOR', 'CONSUMABLE'];
    let detectedCategory = null;
    
    for (const cat of categories) {
      const label = getAssetCategoryLabel(cat).toLowerCase();
      if (query.includes(label) || query.includes(label + 's')) {
        detectedCategory = cat;
        break;
      }
    }

    if (detectedCategory) {
      const count = await prisma.asset.count({ where: { category: detectedCategory } });
      const label = getAssetCategoryLabel(detectedCategory);
      reply = `We have **${count}** registered **${label}** asset(s) in the database register.`;
      
      if (query.includes('list') || query.includes('show') || query.includes('detail') || query.includes('find')) {
        const list = await prisma.asset.findMany({
          where: { category: detectedCategory },
          take: 5,
          select: { assetTag: true, name: true, model: true, status: true, location: true }
        });
        data = list;
        reply += ` Here are the latest registered ${label} units:`;
      }
      return res.json({ reply, data });
    }

    // -----------------------------------------------------------------
    // 6. ASSETS BY LOCATION
    // -----------------------------------------------------------------
    if (query.includes('located') || query.includes('location') || query.includes('in delhi') || query.includes('in mumbai') || query.includes('in office')) {
      // Find matching location keywords
      let searchLocation = '';
      if (query.includes('delhi')) searchLocation = 'delhi';
      else if (query.includes('mumbai')) searchLocation = 'mumbai';
      else if (query.includes('hq')) searchLocation = 'hq';
      else if (query.includes('server room')) searchLocation = 'server room';

      if (searchLocation) {
        const count = await prisma.asset.count({
          where: { location: { contains: searchLocation, mode: 'insensitive' } }
        });
        reply = `Found **${count}** asset(s) located in/at **${searchLocation.toUpperCase()}**:`;
        
        const list = await prisma.asset.findMany({
          where: { location: { contains: searchLocation, mode: 'insensitive' } },
          take: 5,
          select: { assetTag: true, name: true, model: true, location: true }
        });
        data = list;
        return res.json({ reply, data });
      }
    }

    // -----------------------------------------------------------------
    // 7. VERIFICATION OVERDUE ASSETS
    // -----------------------------------------------------------------
    if (query.includes('overdue') || query.includes('unverified') || query.includes('due') || query.includes('expired')) {
      const count = await prisma.asset.count({
        where: { nextVerificationDue: { lt: new Date() } }
      });
      reply = `There are **${count}** assets currently overdue for physical verification checks (compliance under annual verification policy PRO 06).`;
      if (count > 0) {
        const list = await prisma.asset.findMany({
          where: { nextVerificationDue: { lt: new Date() } },
          take: 3,
          select: { assetTag: true, name: true, location: true }
        });
        data = list;
        reply += ` Overdue assets include:`;
      }
      return res.json({ reply, data });
    }

    // -----------------------------------------------------------------
    // 8. MY ALLOCATED DEVICES
    // -----------------------------------------------------------------
    if (query.includes('my asset') || query.includes('assigned to me') || query.includes('allocated to me') || query.includes('my device') || query.includes('my laptop')) {
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
      return res.json({ reply, data });
    }

    // -----------------------------------------------------------------
    // 9. PENDING ACCESS REQUESTS
    // -----------------------------------------------------------------
    if (query.includes('pending request') || query.includes('access request') || query.includes('approvals')) {
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
      return res.json({ reply, data });
    }

    // -----------------------------------------------------------------
    // 10. BACKUP & RESTORATION STATUS
    // -----------------------------------------------------------------
    if (query.includes('backup') || query.includes('restoration') || query.includes('recovery')) {
      const list = await prisma.backupRegister.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' },
        select: { systemName: true, status: true, backupType: true, restorationStatus: true }
      });
      reply = `Here is the status of the latest backup registries (FMT 35/36 compliance):`;
      data = list;
      return res.json({ reply, data });
    }

    // -----------------------------------------------------------------
    // 11. SECURITY INCIDENT TRACKING
    // -----------------------------------------------------------------
    if (query.includes('incident') || query.includes('breach') || query.includes('security event')) {
      const list = await prisma.securityIncident.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' },
        select: { incidentCode: true, description: true, severity: true, status: true }
      });
      reply = `Here are the latest security incidents logged in the system (FMT 20 compliance):`;
      data = list;
      return res.json({ reply, data });
    }

    // -----------------------------------------------------------------
    // 12. NON-CONFORMANCE & CORRECTIVE ACTION (NCR/CAR)
    // -----------------------------------------------------------------
    if (query.includes('ncr') || query.includes('non-conformance') || query.includes('non conformance') || query.includes('corrective action')) {
      const list = await prisma.nonConformance.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' },
        select: { code: true, description: true, severity: true, status: true }
      });
      reply = `Here are the latest Non-Conformance registers (FMT 13/14 compliance):`;
      data = list;
      return res.json({ reply, data });
    }

    // -----------------------------------------------------------------
    // 13. PATCH MANAGEMENT STATUS
    // -----------------------------------------------------------------
    if (query.includes('patch') || query.includes('hotfix') || query.includes('vulnerability')) {
      const list = await prisma.patchAuditLog.findMany({
        take: 3,
        orderBy: { auditDate: 'desc' },
        select: { serverName: true, patchId: true, status: true, checkedBy: true }
      });
      reply = `Here are the latest server patch audit logs (FMT 26 compliance):`;
      data = list;
      return res.json({ reply, data });
    }

    // -----------------------------------------------------------------
    // FALLBACK / GENERAL HELP
    // -----------------------------------------------------------------
    reply = `Hello! I am Lekha, your compliance assistant. I can query the database directly or help you navigate. Try asking:\n\n` +
            `• "Search asset UAIL/IT/LT/0001"\n` +
            `• "How many laptops do we have?"\n` +
            `• "Show unverified or overdue assets"\n` +
            `• "List pending access requests"\n` +
            `• "Show my allocated assets"\n` +
            `• "Show latest security incidents"\n` +
            `• "Show non-conformances (NCR)"\n` +
            `• "Open controlled documents tab"`;
    
    res.json({ reply });
  } catch (error) {
    console.error('Chatbot error:', error);
    res.status(500).json({ error: 'Failed to process chatbot request.' });
  }
});

module.exports = router;
