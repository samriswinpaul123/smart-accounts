import express from 'express';
import { authenticateJWT } from '../middleware/auth.js';
import JournalEntry from '../models/JournalEntry.js';
import Account from '../models/Account.js';
import { postJournalEntry } from '../utils/ledgerHelper.js';
import { logAuditEvent } from '../utils/auditHelper.js';

const router = express.Router();
router.use(authenticateJWT);

// Store in-memory bank feed statement lines
const mockBankFeeds = [
  {
    id: 'BNK-TXN-101',
    date: new Date().toISOString().split('T')[0],
    bankName: 'ICICI Corporate Banking',
    accountNumber: 'XXXX-XXXX-9941',
    type: 'CREDIT',
    description: 'NEFT INWARD: HOOLI TECH INDIA PVT LTD - INV SETTLEMENT',
    amount: 125000, // ₹1,250.00
    matched: false,
    matchedEntryId: null
  },
  {
    id: 'BNK-TXN-102',
    date: new Date().toISOString().split('T')[0],
    bankName: 'ICICI Corporate Banking',
    accountNumber: 'XXXX-XXXX-9941',
    type: 'DEBIT',
    description: 'UPI OUTWARD: WEWORK MANAGEMENT LEASE EXPENSE',
    amount: 50000, // ₹500.00
    matched: false,
    matchedEntryId: null
  },
  {
    id: 'BNK-TXN-103',
    date: new Date().toISOString().split('T')[0],
    bankName: 'HDFC Treasury Feed',
    accountNumber: 'XXXX-XXXX-4420',
    type: 'DEBIT',
    description: 'BANK SERVICE CHARGES & ONLINE RECONCILIATION FEE',
    amount: 2500, // ₹25.00
    matched: false,
    matchedEntryId: null
  }
];

// @route   GET /api/bank-reconciliation/feeds
// @desc    Get live bank statement feeds and reconciliation status
router.get('/feeds', async (req, res) => {
  try {
    const journalEntries = await JournalEntry.find({ user: req.user.id })
      .populate('journalLines.account')
      .sort({ date: -1 });

    res.json({
      bankFeeds: mockBankFeeds,
      journalEntries,
      reconciledCount: mockBankFeeds.filter(b => b.matched).length,
      unreconciledCount: mockBankFeeds.filter(b => !b.matched).length
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bank feeds.' });
  }
});

// @route   POST /api/bank-reconciliation/reconcile
// @desc    Match bank feed line to ledger journal entry or auto-post bank charges
router.post('/reconcile', async (req, res) => {
  const { bankTxnId, journalEntryId } = req.body;
  try {
    const feed = mockBankFeeds.find(b => b.id === bankTxnId);
    if (!feed) return res.status(404).json({ error: 'Bank statement line not found.' });

    feed.matched = true;
    feed.matchedEntryId = journalEntryId || 'AUTO-LEDCORR';

    await logAuditEvent(req.user, 'BANK_RECONCILE', 'BankFeed', feed.id, `Reconciled bank feed ${feed.id} (${feed.description}) for ₹${(feed.amount / 100).toFixed(2)}`, req);

    res.json({ success: true, feed });
  } catch (err) {
    res.status(500).json({ error: 'Bank reconciliation failed.' });
  }
});

export default router;
