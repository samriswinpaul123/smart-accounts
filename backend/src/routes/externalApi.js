import express from 'express';
import crypto from 'crypto';
import ApiKey from '../models/ApiKey.js';
import User from '../models/User.js';
import Invoice from '../models/Invoice.js';
import Expense from '../models/Expense.js';

const router = express.Router();

// Middleware to authenticate X-API-KEY
async function authenticateApiKey(req, res, next) {
  const apiKeyHeader = req.headers['x-api-key'];
  if (!apiKeyHeader) {
    return res.status(401).json({ error: 'Missing X-API-KEY header.' });
  }

  try {
    const keyHash = crypto.createHash('sha256').update(apiKeyHeader).digest('hex');
    const keyRecord = await ApiKey.findOne({ keyHash, isActive: true });
    if (!keyRecord) {
      return res.status(401).json({ error: 'Invalid or revoked API Key.' });
    }

    const user = await User.findById(keyRecord.user);
    if (!user) {
      return res.status(401).json({ error: 'Associated account not found.' });
    }

    keyRecord.lastUsedAt = new Date();
    await keyRecord.save();

    req.user = { id: user._id.toString(), username: user.username, role: user.role };
    next();
  } catch (err) {
    res.status(500).json({ error: 'API Key Authentication Error' });
  }
}

router.use(authenticateApiKey);

// @route   POST /api/v1/external/invoices
// @desc    External CRM / E-Commerce / POS webhook sync to post invoice
router.post('/invoices', async (req, res) => {
  const { invoiceNumber, clientName, clientEmail, totalAmount, items } = req.body;
  try {
    const invoice = new Invoice({
      invoiceNumber: invoiceNumber || `INV-EXT-${Math.floor(1000 + Math.random() * 9000)}`,
      clientName: clientName || 'External E-Commerce Customer',
      clientEmail: clientEmail || 'order@shopify-sync.io',
      totalAmount: totalAmount || 150000,
      items: items || [{ description: 'E-Commerce Online Order Sync', quantity: 1, unitPrice: totalAmount || 150000 }],
      status: 'Sent',
      user: req.user.id
    });
    await invoice.save();
    res.status(201).json({ success: true, message: 'Invoice synced from external REST API.', invoice });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// @route   GET /api/v1/external/invoices
// @desc    Fetch invoices via Developer REST API
router.get('/invoices', async (req, res) => {
  try {
    const invoices = await Invoice.find({ user: req.user.id }).limit(50);
    res.json({ count: invoices.length, invoices });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
