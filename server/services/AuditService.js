const ActivityLog = require('../models/ActivityLog');

class AuditService {
  async log(adminId, action, targetType, targetId, details = {}) {
    try {
      await ActivityLog.create({
        admin: adminId,
        action,
        targetType,
        targetId,
        details
      });
    } catch (err) {
      console.error('[AuditService Error]', err);
    }
  }
}

module.exports = new AuditService();
