// backend/src/utils/compliance.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Anonymizes a user profile in compliance with the DPDP Act 2023 "Right to Erasure" (Section 12).
 * 
 * DPDP compliance mandates that when a user withdraws their consent or requests erasure of 
 * their personal data, the data fiduciary (the organization) must erase it unless retention 
 * is required for legal/audit purposes (e.g. CERT-In logs or financial audits).
 * 
 * To maintain referential integrity in database relations (like history logs & audit logs) 
 * while fully purging Personal Identifiable Information (PII), we perform anonymization:
 * - Wipe the real name and replace it with a random hash sequence.
 * - Wipe the email and replace it with a compliance placeholder.
 * - Set password to a dummy string to lock the account.
 * - Revoke consent status and set anonymization flag to true.
 * - Deallocate all assets currently bound to this user, writing to asset history.
 * 
 * @param {string} userId - The unique UUID of the user requesting erasure.
 * @param {string} requesterEmail - The email of the person triggering the erasure (for audits).
 * @param {string} ipAddress - The client IP where the request originated.
 * @param {string} userAgent - The browser fingerprint.
 * @returns {Promise<Object>} The anonymized user record (sanitized).
 */
async function anonymizeUser(userId, requesterEmail, ipAddress, userAgent) {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch user to verify active status
    const user = await tx.user.findUnique({
      where: { id: userId },
      include: { assets: true }
    });

    if (!user) {
      throw new Error(`User with ID ${userId} not found.`);
    }

    if (user.isAnonymized) {
      throw new Error(`User ${userId} has already been anonymized under DPDP.`);
    }

    const shortId = userId.substring(0, 8);
    const anonymizedEmail = `anonymized-user-${shortId}@compliance.local`;
    const anonymizedName = `Anonymized User (${shortId})`;

    // 2. Return/Deallocate any assets currently allocated to this user
    // Fulfills ISO 27001 Return of Assets (Control A.5.11)
    if (user.assets && user.assets.length > 0) {
      for (const asset of user.assets) {
        // Update the asset allocation fields to return to stock
        await tx.asset.update({
          where: { id: asset.id },
          data: {
            ownerId: null,
            status: 'PROCURED', // Return status back to stock procured
            acceptableUseSigned: false,
            signOffDate: null,
          }
        });

        // Write a entry into asset history tracking chain-of-custody
        await tx.assetHistory.create({
          data: {
            assetId: asset.id,
            action: 'DEALLOCATED',
            performedBy: requesterEmail,
            description: `Asset automatically returned to inventory due to assignee DPDP right-to-erasure account anonymization.`
          }
        });
      }
    }

    // 3. Perform the anonymization query on the User table
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        name: anonymizedName,
        email: anonymizedEmail,
        passwordHash: 'DELETED_UNDER_DPDP_ACT_2023_RIGHT_TO_ERASURE',
        department: 'DECOMPASSIONED_COMPLIANCE_DEPT',
        hasConsented: false,
        consentTimestamp: null,
        consentPurpose: null,
        isAnonymized: true
      }
    });

    // 4. Create an immutable CERT-In audit log entry recording the compliance erasure action
    await tx.auditLog.create({
      data: {
        userId: userId,
        action: 'DPDP_RIGHT_TO_ERASURE_ANONYMIZATION',
        module: 'COMPLIANCE',
        ipAddress: ipAddress,
        userAgent: userAgent,
        details: JSON.stringify({
          message: 'User requested PII erasure. System executed anonymization script successfully.',
          anonymizedUserId: userId,
          returnedAssetsCount: user.assets.length,
          triggeredBy: requesterEmail
        }),
        status: 'SUCCESS'
      }
    });

    console.log(`DPDP Erasure: User ${userId} successfully anonymized. PII purged.`);
    return updatedUser;
  });
}

module.exports = {
  anonymizeUser
};
