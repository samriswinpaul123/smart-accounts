import express from 'express';
import Account from '../models/Account.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = express.Router();

// Apply auth middleware to all account routes
router.use(authenticateJWT);

// @route   GET /api/accounts
// @desc    Get user's Chart of Accounts
router.get('/', async (req, res) => {
  try {
    const accounts = await Account.find({ user: req.user.id }).sort({ code: 1 });
    res.json(accounts);
  } catch (err) {
    console.error('Error fetching accounts:', err);
    res.status(500).json({ error: 'Internal server error fetching Chart of Accounts.' });
  }
});

// @route   POST /api/accounts
// @desc    Create a custom account in Chart of Accounts
router.post('/', async (req, res) => {
  const { code, name, type, description } = req.body;

  if (!code || !name || !type) {
    return res.status(400).json({ error: 'Please provide code, name, and type.' });
  }

  const validTypes = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `Type must be one of: ${validTypes.join(', ')}` });
  }

  try {
    // Check code duplication
    const existing = await Account.findOne({ user: req.user.id, code });
    if (existing) {
      return res.status(400).json({ error: `Account with code ${code} already exists.` });
    }

    const account = new Account({
      code,
      name,
      type,
      description,
      user: req.user.id
    });

    await account.save();
    res.status(201).json(account);
  } catch (err) {
    console.error('Error creating account:', err);
    res.status(500).json({ error: 'Internal server error creating account.' });
  }
});

export default router;
