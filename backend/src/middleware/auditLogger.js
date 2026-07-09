// backend/src/middleware/auditLogger.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Express middleware to capture and log auditable events to the database.
 * This directly supports the CERT-In directive requiring organizations to
 * log and retain system transaction details for at least 180 days.
 * 
 * It hooks into Express request-response cycle and logs mutations (POST, PUT, DELETE)
 * or security events (Logins, access failures) upon completion.
 * 
 * @param {string} moduleName - The logical group this route belongs to (e.g., 'AUTH', 'ASSET', 'COMPLIANCE')
 * @returns {Function} Express middleware function
 */
function auditLogger(moduleName) {
  return (req, res, next) => {
    // 1. Capture request metadata immediately
    // Under CERT-In directives, capturing the exact client source IP address is mandatory.
    // Handles reverse proxies (like Nginx) that append 'x-forwarded-for', or falls back to direct socket address.
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    
    // Fingerprint of the browser/client platform (indicates client source device profile)
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    // Capture the request URL and method (e.g., "POST /api/assets")
    const action = `${req.method} ${req.originalUrl}`;

    // Extract payload details but sanitize sensitive data (e.g. plain password)
    let detailsObj = { ...req.body };
    if (detailsObj.password) {
      detailsObj.password = '[REDACTED_PASSWORD_FOR_DPDP_COMPLIANCE]';
    }
    const details = JSON.stringify(detailsObj);

    // 2. Intercept response completion
    // We register a callback on the 'finish' event. Express calls this after sending the response to the user.
    res.on('finish', async () => {
      // Determine the outcome status based on HTTP code (Success: 2xx/3xx, Failure: 4xx/5xx)
      const status = res.statusCode >= 400 ? 'FAILURE' : 'SUCCESS';

      // Retrieve authenticated user from request object (populated by auth middleware)
      const userId = req.user ? req.user.id : null;

      // Avoid auditing logs viewing requests or healthchecks to prevent infinite logging loops
      if (req.originalUrl.includes('/api/compliance/logs') && req.method === 'GET') {
        return;
      }

      try {
        // Asynchronously save log entry to the database
        await prisma.auditLog.create({
          data: {
            userId,
            action,
            module: moduleName,
            ipAddress,
            userAgent,
            details,
            status,
          },
        });
      } catch (err) {
        // Fallback log to console if database writing fails (important for debugging database disconnections)
        console.error('CERT-In Log Auditor: Failed to write system audit trail to database.', err);
      }
    });

    // Proceed to the next middleware/handler in the pipeline
    next();
  };
}

module.exports = auditLogger;
