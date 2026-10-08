import express from 'express';
import AuditLog from '../models/AuditLog.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateJWT);

// @route   GET /api/audit-logs
// @desc    Get tamper-proof system audit logs
router.get('/', async (req, res) => {
  try {
    const logs = await AuditLog.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(logs);
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    res.status(500).json({ error: 'Failed to fetch audit logs.' });
  }
});

export default router;
