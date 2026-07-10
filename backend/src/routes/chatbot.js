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
          return res.json({ reply, data });
        }
      }
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
    // FALLBACK / GENERAL HELP
    // -----------------------------------------------------------------
    reply = `Hello! I am your compliance assistant. I can query the database directly or help you navigate. Try asking:\n\n` +
            `• "Search asset UAIL/IT/LT/0001"\n` +
            `• "How many laptops do we have?"\n` +
            `• "Show unverified or overdue assets"\n` +
            `• "List assets in Delhi office"\n` +
            `• "Show my allocated assets"\n` +
            `• "Open controlled documents tab"`;
    
    res.json({ reply });
  } catch (error) {
    console.error('Chatbot error:', error);
    res.status(500).json({ error: 'Failed to process chatbot request.' });
  }
});

module.exports = router;
