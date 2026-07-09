// backend/src/routes/assets.js

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireRole } = require('../middleware/auth');
const auditLogger = require('../middleware/auditLogger');

// Create Express Router for assets
const router = express.Router();

// Initialize Prisma Client
const prisma = new PrismaClient();

/**
 * Helper utility to map asset type categories to the standard 2-letter codes.
 * Governed by PRO 06 Assets Management Process (Section 6.1).
 * 
 * @param {string} type - Raw type string (e.g. Laptop, Server, Firewall)
 * @returns {string} 2-letter uppercase type code (e.g. LT, SE, FW)
 */
function getAssetTypeCode(type) {
  const mapping = {
    'Laptop': 'LT',
    'Desktop': 'DT',
    'Printer': 'PR',
    'Server': 'SE',
    'Storage': 'ST',
    'Tape Library': 'TL',
    'Switch': 'SW',
    'Router': 'RT',
    'Firewall': 'FW'
  };
  return mapping[type] || (type ? type.substring(0, 2).toUpperCase() : 'IT');
}

/**
 * @route   GET /api/assets
 * @desc    Retrieves all IT assets in the inventory with their current owner details.
 *          Part of ISO 27001 Control A.5.9 (Inventory of Assets).
 * @access  Private (Authenticated users)
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const assets = await prisma.asset.findMany({
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            isAnonymized: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(assets);
  } catch (error) {
    console.error('Fetch Assets Error:', error);
    res.status(500).json({ error: 'Failed to retrieve IT asset inventory.' });
  }
});

/**
 * @route   GET /api/assets/:id
 * @desc    Retrieves a specific asset including owner assignment details and lifecycle history.
 * @access  Private (Authenticated users)
 */
router.get('/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true
          }
        },
        history: {
          orderBy: { timestamp: 'desc' }
        }
      }
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found.' });
    }

    res.json(asset);
  } catch (error) {
    console.error('Fetch Asset Details Error:', error);
    res.status(500).json({ error: 'Failed to retrieve asset details.' });
  }
});

/**
 * @route   POST /api/assets
 * @desc    Registers a new IT asset in the inventory (PRO 06 & POL 09 labeling compliance).
 * @access  Private (Admins and Asset Managers only)
 */
router.post(
  '/',
  authenticate,
  requireRole(['ADMIN', 'ASSET_MANAGER']),
  auditLogger('ASSET_MANAGEMENT'),
  async (req, res) => {
    const { name, type, model, serialNumber, classification, location } = req.body;

    // Validate request inputs
    if (!name || !type || !model || !serialNumber || !location) {
      return res.status(400).json({ error: 'Missing required asset registration fields.' });
    }

    try {
      // 1. Ensure serial number is globally unique to satisfy inventory identification standards
      const existing = await prisma.asset.findUnique({
        where: { serialNumber }
      });
      if (existing) {
        return res.status(400).json({ error: 'An asset with this hardware serial number already exists.' });
      }

      // 2. Auto-generate a compliant corporate Asset Tag label (PRO 06 Section 6.1)
      // Format: UAIL/IT/[AssetType]/nnnn
      const typeCode = getAssetTypeCode(type);
      const count = await prisma.asset.count({
        where: { type }
      });
      const paddedCount = String(count + 1).padStart(4, '0');
      const assetTag = `UAIL/IT/${typeCode}/${paddedCount}`;

      // 3. Create asset inside a database transaction
      const asset = await prisma.$transaction(async (tx) => {
        const newAsset = await tx.asset.create({
          data: {
            assetTag,
            name,
            type,
            model,
            serialNumber,
            classification: classification || 'INTERNAL',
            status: 'PROCURED',
            location,
            acceptableUseSigned: false,
            lastVerifiedDate: new Date(), // Verification tracks initialized (PRO 06)
            nextVerificationDue: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365) // 1 year cycle
          }
        });

        // Log initial lifecycle history entry (Chain-of-custody tracking)
        await tx.assetHistory.create({
          data: {
            assetId: newAsset.id,
            action: 'PROCURED',
            performedBy: req.user.email,
            description: `Asset registered. Generated tag ${assetTag}. verification schedule initialized.`
          }
        });

        return newAsset;
      });

      res.status(201).json(asset);

    } catch (error) {
      console.error('Asset Registration Error:', error);
      res.status(500).json({ error: 'Failed to register the IT asset.' });
    }
  }
);

/**
 * @route   PUT /api/assets/:id
 * @desc    Updates asset details, status, or owner assignment (ISO 27001 ownership change tracking).
 *          Supports physical verification auditing (PRO 06).
 * @access  Private (Admins and Asset Managers only)
 */
router.put(
  '/:id',
  authenticate,
  requireRole(['ADMIN', 'ASSET_MANAGER']),
  auditLogger('ASSET_MANAGEMENT'),
  async (req, res) => {
    const { id } = req.params;
    const { 
      name, type, model, classification, status, location, ownerId, 
      acceptableUseSigned, verifyAction 
    } = req.body;

    try {
      // 1. Verify asset existence
      const currentAsset = await prisma.asset.findUnique({
        where: { id }
      });

      if (!currentAsset) {
        return res.status(404).json({ error: 'Asset record not found.' });
      }

      // 2. Perform updates and append history entries inside a secure Transaction block
      const updatedAsset = await prisma.$transaction(async (tx) => {
        let historyNotes = [];
        let dataUpdates = {};

        // A. Handle standard asset metadata edits
        if (name) dataUpdates.name = name;
        if (type) dataUpdates.type = type;
        if (model) dataUpdates.model = model;
        if (classification) dataUpdates.classification = classification;
        if (location) dataUpdates.location = location;

        // B. Check if status is transitioning (e.g. ALLOCATED -> MAINTENANCE)
        if (status && status !== currentAsset.status) {
          dataUpdates.status = status;
          historyNotes.push(`Status changed from ${currentAsset.status} to ${status}.`);
        }

        // C. Check if owner assignment is changing (ISO 27001 ownership compliance)
        if (ownerId !== undefined && ownerId !== currentAsset.ownerId) {
          dataUpdates.ownerId = ownerId;
          
          if (ownerId === null) {
            // Asset is returned to stock (PRO 06 Section 6.4)
            historyNotes.push(`Asset returned to stock (Deallocated from user).`);
            dataUpdates.acceptableUseSigned = false;
            dataUpdates.signOffDate = null;
          } else {
            // Allocated to a new user
            const newOwner = await tx.user.findUnique({ where: { id: ownerId } });
            if (!newOwner) throw new Error('Selected user does not exist.');
            if (newOwner.isAnonymized) throw new Error('Cannot assign asset to an anonymized user.');
            
            historyNotes.push(`Asset allocated to employee [${newOwner.name}].`);
            
            // Set acceptable use sign-off matching the body parameters or reset to wait for signature
            dataUpdates.acceptableUseSigned = !!acceptableUseSigned;
            dataUpdates.signOffDate = acceptableUseSigned ? new Date() : null;
            dataUpdates.status = 'ALLOCATED'; // Force status update to ALLOCATED on assignment
          }
        } else if (acceptableUseSigned !== undefined && acceptableUseSigned !== currentAsset.acceptableUseSigned) {
          // Acceptable Use policy check changed
          dataUpdates.acceptableUseSigned = !!acceptableUseSigned;
          dataUpdates.signOffDate = acceptableUseSigned ? new Date() : null;
          historyNotes.push(`Acceptable use policy signed status updated to ${acceptableUseSigned}.`);
        }

        // D. Handle Asset Verification action (PRO 06 Section 6.1 annual verification check)
        if (verifyAction === true) {
          dataUpdates.lastVerifiedDate = new Date();
          dataUpdates.nextVerificationDue = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365); // Renew due date for next year
          historyNotes.push(`Asset physical verification check completed.`);
        }

        // Apply modifications to PostgreSQL
        const updated = await tx.asset.update({
          where: { id },
          data: dataUpdates
        });

        // Write to lifecycle logs if anything of significance changed
        if (historyNotes.length > 0) {
          await tx.assetHistory.create({
            data: {
              assetId: id,
              action: verifyAction === true ? 'VERIFIED' : (status && status !== currentAsset.status ? status : 'ASSET_UPDATE'),
              performedBy: req.user.email,
              description: historyNotes.join(' ')
            }
          });
        }

        return updated;
      });

      res.json(updatedAsset);

    } catch (error) {
      console.error('Asset Update Error:', error.message);
      res.status(500).json({ error: error.message || 'Failed to update asset information.' });
    }
  }
);

/**
 * @route   DELETE /api/assets/:id
 * @desc    Decommissions and deletes an asset from inventory (ISO 27001 Disposal validation).
 * @access  Private (Admins only)
 */
router.delete(
  '/:id',
  authenticate,
  requireRole(['ADMIN']),
  auditLogger('ASSET_MANAGEMENT'),
  async (req, res) => {
    const { id } = req.params;

    try {
      // 1. Verify existence
      const asset = await prisma.asset.findUnique({
        where: { id }
      });

      if (!asset) {
        return res.status(404).json({ error: 'Asset record not found.' });
      }

      // 2. Perform deletion
      await prisma.asset.delete({
        where: { id }
      });

      res.json({ message: `Asset tag ${asset.assetTag} successfully decommissioned and deleted.` });

    } catch (error) {
      console.error('Asset Deletion Error:', error);
      res.status(500).json({ error: 'Failed to delete asset record.' });
    }
  }
);

module.exports = router;
