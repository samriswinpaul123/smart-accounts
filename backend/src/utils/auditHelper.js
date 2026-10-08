import AuditLog from '../models/AuditLog.js';

export async function logAuditEvent(user, action, resource, resourceId = '', details = '', req = null) {
  try {
    const ipAddress = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') : '127.0.0.1';
    const log = new AuditLog({
      user: user.id || user._id,
      username: user.username || 'System',
      action,
      resource,
      resourceId,
      details,
      ipAddress
    });
    await log.save();
  } catch (err) {
    console.error('Failed to log audit event:', err);
  }
}
