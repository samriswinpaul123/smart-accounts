import express from 'express';
import crypto from 'crypto';
import ApiKey from '../models/ApiKey.js';
import { authenticateJWT } from '../middleware/auth.js';
import { logAuditEvent } from '../utils/auditHelper.js';

const router = express.Router();
router.use(authenticateJWT);

// @route   GET /api/api-keys
// @desc    Get user's API keys
router.get('/', async (req, res) => {
  try {
    const keys = await ApiKey.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(keys);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch API keys.' });
  }
});

// @route   POST /api/api-keys
// @desc    Generate a new developer API key
router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Please provide a key name.' });
  }

  try {
    const rawSecret = `cleg_live_${crypto.randomBytes(24).toString('hex')}`;
    const keyPrefix = rawSecret.substring(0, 14);
    const keyHash = crypto.createHash('sha256').update(rawSecret).digest('hex');

    const apiKey = new ApiKey({
      name,
      keyPrefix,
      keyHash,
      rawKey: rawSecret,
      user: req.user.id
    });

    await apiKey.save();
    await logAuditEvent(req.user, 'CREATE_API_KEY', 'ApiKey', apiKey._id.toString(), `Generated key: ${name}`, req);

    res.status(201).json(apiKey);
  } catch (err) {
    console.error('Error generating API key:', err);
    res.status(500).json({ error: 'Failed to generate API key.' });
  }
});

// @route   DELETE /api/api-keys/:id
// @desc    Revoke an API key
router.delete('/:id', async (req, res) => {
  try {
    const key = await ApiKey.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (key) {
      await logAuditEvent(req.user, 'REVOKE_API_KEY', 'ApiKey', key._id.toString(), `Revoked key: ${key.name}`, req);
    }
    res.json({ message: 'API key revoked successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to revoke API key.' });
  }
});

export default router;
