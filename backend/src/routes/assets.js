// backend/src/routes/assets.js

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireRole } = require('../middleware/auth');
const auditLogger = require('../middleware/auditLogger');
const {
  getAssetCategoryCode,
  getDefaultAssetType,
  normalizeAssetCategory
} = require('../utils/assetCatalog');

// Create Express Router for assets
const router = express.Router();

// Initialize Prisma Client
const prisma = new PrismaClient();

function sanitizeCustomFields(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return null;
  }

  return Object.entries(input).reduce((result, [key, value]) => {
    if (typeof key !== 'string') {
      return result;
    }

    result[key] = value;
    return result;
  }, {});
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
        },
        allocationHistory: {
          orderBy: { issueDate: 'desc' }
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
 * @route   POST /api/assets/bulk
 * @desc    Registers multiple IT assets in bulk sharing model, make, PO details but having different serial numbers.
 * @access  Private (Admins and Asset Managers only)
 */
router.post(
  '/bulk',
  authenticate,
  requireRole(['ADMIN', 'ASSET_MANAGER']),
  auditLogger('ASSET_MANAGEMENT_BULK'),
  async (req, res) => {
    const { name, category, type, model, serialNumbers, classification, location, customFields, ownerId } = req.body;
    const assetCategory = normalizeAssetCategory(category || type);
    const assetType = String(type || '').trim() || getDefaultAssetType(assetCategory);
    const sanitizedCustomFields = sanitizeCustomFields(customFields) || {};

    if (!name || !model || !location || !(category || type) || !Array.isArray(serialNumbers) || serialNumbers.length === 0) {
      return res.status(400).json({ error: 'Missing required bulk asset registration fields or serial numbers.' });
    }

    try {
      // 1. Sanitize & filter serial numbers
      const cleanSerials = serialNumbers.map(s => String(s || '').trim()).filter(Boolean);
      if (cleanSerials.length === 0) {
        return res.status(400).json({ error: 'No valid hardware serial numbers provided.' });
      }

      // 2. Check for duplicate serial numbers within the list
      const uniqueSerials = [...new Set(cleanSerials)];
      if (uniqueSerials.length !== cleanSerials.length) {
        return res.status(400).json({ error: 'Duplicate serial numbers detected in the input list.' });
      }

      // 3. Check if any serial number already exists in the database
      const existing = await prisma.asset.findMany({
        where: { serialNumber: { in: cleanSerials } },
        select: { serialNumber: true }
      });
      if (existing.length > 0) {
        const dupes = existing.map(e => e.serialNumber).join(', ');
        return res.status(400).json({ error: `The following serial numbers already exist in the registry: ${dupes}` });
      }

      // 4. Determine if there is incomplete data
      const hasMissingCore = !name || !model || !location;
      const hasMissingCustom = Object.values(sanitizedCustomFields).some(v => v === '' || v === 'Not Available');
      const isIncomplete = hasMissingCore || hasMissingCustom;

      // 5. Generate tags and insert in a transaction
      const typeCode = getAssetCategoryCode(assetCategory);
      const assetTagPrefix = `UAIL/IT/${typeCode}/`;
      
      const results = await prisma.$transaction(async (tx) => {
        const count = await tx.asset.count({
          where: { assetTag: { startsWith: assetTagPrefix } }
        });

        const createdAssets = [];
        for (let idx = 0; idx < cleanSerials.length; idx++) {
          const serial = cleanSerials[idx];
          const paddedCount = String(count + idx + 1).padStart(4, '0');
          const assetTag = `${assetTagPrefix}${paddedCount}`;

          const newAsset = await tx.asset.create({
            data: {
              assetTag,
              name,
              category: assetCategory,
              type: assetType,
              model,
              serialNumber: serial,
              classification: classification || 'INTERNAL',
              status: ownerId ? 'ALLOCATED' : 'PROCURED',
              location,
              customFields: sanitizedCustomFields,
              ownerId: ownerId || null,
              acceptableUseSigned: !!ownerId,
              signOffDate: ownerId ? new Date() : null,
              lastVerifiedDate: new Date(),
              nextVerificationDue: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
              isIncomplete
            }
          });

          await tx.assetHistory.create({
            data: {
              assetId: newAsset.id,
              action: 'PROCURED',
              performedBy: req.user.email,
              description: `Bulk asset registered. Generated tag ${assetTag}.`
            }
          });

          createdAssets.push(newAsset);
        }
        return createdAssets;
      });

      res.status(201).json({ message: `Successfully registered ${results.length} assets in bulk.`, assets: results });
    } catch (error) {
      console.error('Bulk registration error:', error);
      res.status(500).json({ error: 'Failed to complete bulk asset registration.' });
    }
  }
);

router.post(
  '/',
  authenticate,
  requireRole(['ADMIN', 'ASSET_MANAGER']),
  auditLogger('ASSET_MANAGEMENT'),
  async (req, res) => {
    const { name, category, type, model, serialNumber, classification, location, customFields } = req.body;
    const assetCategory = normalizeAssetCategory(category || type);
    const assetType = String(type || '').trim() || getDefaultAssetType(assetCategory);
    const sanitizedCustomFields = sanitizeCustomFields(customFields);

    // Validate request inputs
    if (!name || !model || !serialNumber || !location || !(category || type)) {
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
      const typeCode = getAssetCategoryCode(assetCategory);
      const assetTagPrefix = `UAIL/IT/${typeCode}/`;
      const count = await prisma.asset.count({
        where: {
          assetTag: {
            startsWith: assetTagPrefix
          }
        }
      });
      const paddedCount = String(count + 1).padStart(4, '0');
      const assetTag = `${assetTagPrefix}${paddedCount}`;

      // 3. Create asset inside a database transaction
      const asset = await prisma.$transaction(async (tx) => {
        const newAsset = await tx.asset.create({
          data: {
            assetTag,
            name,
            category: assetCategory,
            type: assetType,
            model,
            serialNumber,
            classification: classification || 'INTERNAL',
            status: 'PROCURED',
            location,
            customFields: sanitizedCustomFields,
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
      name, category, type, model, classification, status, location, ownerId,
      acceptableUseSigned, verifyAction, customFields
    } = req.body;
    const sanitizedCustomFields = sanitizeCustomFields(customFields);

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
        const currentCategory = normalizeAssetCategory(currentAsset.category || currentAsset.type);
        const nextCategory = category ? normalizeAssetCategory(category) : currentCategory;

        // A. Handle standard asset metadata edits
        if (name) dataUpdates.name = name;
        if (model) dataUpdates.model = model;
        if (classification) dataUpdates.classification = classification;
        if (location) dataUpdates.location = location;
        if (category && nextCategory !== currentCategory) {
          dataUpdates.category = nextCategory;
          historyNotes.push(`Category changed from ${currentCategory} to ${nextCategory}.`);
        }
        if (sanitizedCustomFields) {
          dataUpdates.customFields = {
            ...(currentAsset.customFields && typeof currentAsset.customFields === 'object' ? currentAsset.customFields : {}),
            ...sanitizedCustomFields
          };
          historyNotes.push(`Category-specific asset details updated.`);
        }
        if (type !== undefined) {
          const nextType = String(type || '').trim() || getDefaultAssetType(nextCategory);
          if (nextType !== currentAsset.type) {
            dataUpdates.type = nextType;
            historyNotes.push(`Subtype changed from ${currentAsset.type} to ${nextType}.`);
          }
        } else if (
          category &&
          currentAsset.type === getDefaultAssetType(currentCategory) &&
          getDefaultAssetType(nextCategory) !== currentAsset.type
        ) {
          dataUpdates.type = getDefaultAssetType(nextCategory);
        }

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
