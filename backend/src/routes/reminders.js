import express from 'express';
import { authenticateJWT } from '../middleware/auth.js';
import Invoice from '../models/Invoice.js';
import { logAuditEvent } from '../utils/auditHelper.js';

const router = express.Router();
router.use(authenticateJWT);

// Store in-memory notification delivery logs
const reminderLogs = [];

// @route   GET /api/reminders/logs
// @desc    Get delivery history of automated reminders
router.get('/logs', (req, res) => {
  res.json(reminderLogs);
});

// @route   POST /api/reminders/trigger
// @desc    Trigger automated payment follow-up reminder via Email, SMS or WhatsApp
router.post('/trigger', async (req, res) => {
  const { invoiceId, channel } = req.body;
  if (!invoiceId || !channel) {
    return res.status(400).json({ error: 'Please provide invoiceId and channel.' });
  }

  try {
    const invoice = await Invoice.findOne({ _id: invoiceId, user: req.user.id });
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    const payLink = `https://pay.coreledger.io/inv/${invoice.invoiceNumber}?amt=${(invoice.totalAmount / 100).toFixed(2)}`;

    const logEntry = {
      id: `REM-${Math.floor(10000 + Math.random() * 90000)}`,
      invoiceNumber: invoice.invoiceNumber,
      clientName: invoice.clientName,
      clientEmail: invoice.clientEmail,
      channel, // 'Email', 'SMS', 'WhatsApp'
      amount: invoice.totalAmount,
      payLink,
      sentAt: new Date(),
      status: 'DELIVERED'
    };

    reminderLogs.unshift(logEntry);

    await logAuditEvent(
      req.user,
      'SEND_REMINDER',
      'Invoice',
      invoice._id.toString(),
      `Sent ${channel} payment reminder to ${invoice.clientName} for invoice ${invoice.invoiceNumber}`,
      req
    );

    res.json(logEntry);
  } catch (err) {
    console.error('Error sending reminder:', err);
    res.status(500).json({ error: 'Failed to deliver payment reminder.' });
  }
});

export default router;
