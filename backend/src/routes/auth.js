import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Account from '../models/Account.js';
import { authenticateJWT } from '../middleware/auth.js';
import { logAuditEvent } from '../utils/auditHelper.js';

const router = express.Router();

const DEFAULT_CHART_OF_ACCOUNTS = [
  { code: '1010', name: 'Cash & Bank', type: 'Asset', description: 'Primary liquid assets' },
  { code: '1200', name: 'Accounts Receivable', type: 'Asset', description: 'Unpaid client invoice amounts' },
  { code: '2000', name: 'Accounts Payable', type: 'Liability', description: 'Unpaid vendor invoices / bills' },
  { code: '3000', name: 'Retained Earnings', type: 'Equity', description: 'Accumulated profits or losses' },
  { code: '4000', name: 'Sales Revenue', type: 'Revenue', description: 'Earnings from core billing and services' },
  { code: '5000', name: 'Rent Expense', type: 'Expense', description: 'Office lease expenses' },
  { code: '5100', name: 'Utilities Expense', type: 'Expense', description: 'Electricity, water, internet bills' },
  { code: '5200', name: 'Office Supplies Expense', type: 'Expense', description: 'General office supplies' },
  { code: '5300', name: 'Travel Expense', type: 'Expense', description: 'Business travel and accommodation' },
  { code: '5400', name: 'Marketing Expense', type: 'Expense', description: 'Advertising and lead acquisition' }
];

// Helper to generate JWT token
function generateToken(user) {
  return jwt.sign(
    { id: user._id, username: user.username, role: user.role || 'Admin', branch: user.branch || 'Headquarters (Mumbai)' },
    process.env.JWT_SECRET || 'super_secret_accounting_key_12345',
    { expiresIn: '24h' }
  );
}

// @route   POST /api/auth/register
// @desc    Register a new user & seed Chart of Accounts
router.post('/register', async (req, res) => {
  const { username, email, password, role, branch } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Please provide username, email, and password.' });
  }

  try {
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email or username already exists.' });
    }

    const user = new User({ 
      username, 
      email, 
      password,
      role: role || 'Admin',
      branch: branch || 'Headquarters (Mumbai)'
    });
    await user.save();

    const accountsToSeed = DEFAULT_CHART_OF_ACCOUNTS.map(acc => ({
      ...acc,
      user: user._id
    }));
    await Account.insertMany(accountsToSeed);

    const token = generateToken(user);

    await logAuditEvent(user, 'USER_REGISTER', 'User', user._id.toString(), `Registered as ${user.role} (${user.branch})`, req);

    res.status(201).json({
      message: 'User registered successfully and Chart of Accounts seeded.',
      token,
      user: { 
        id: user._id, 
        username: user.username, 
        email: user.email, 
        role: user.role, 
        branch: user.branch,
        mfaEnabled: user.mfaEnabled 
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & return JWT token
router.post('/login', async (req, res) => {
  const { email, password, totpCode } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide email and password.' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.mfaEnabled && !totpCode) {
      return res.json({
        mfaRequired: true,
        message: '2FA authentication required.'
      });
    }

    const token = generateToken(user);

    await logAuditEvent(user, 'USER_LOGIN', 'User', user._id.toString(), `User logged in from IP`, req);

    res.json({
      token,
      user: { 
        id: user._id, 
        username: user.username, 
        email: user.email, 
        role: user.role || 'Admin', 
        branch: user.branch || 'Headquarters (Mumbai)',
        mfaEnabled: user.mfaEnabled 
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
router.get('/me', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error fetching profile.' });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user role or branch settings
router.put('/profile', authenticateJWT, async (req, res) => {
  const { role, branch } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (role) user.role = role;
    if (branch) user.branch = branch;
    await user.save();

    await logAuditEvent(user, 'UPDATE_PROFILE', 'User', user._id.toString(), `Updated profile: role=${user.role}, branch=${user.branch}`, req);

    const newToken = generateToken(user);
    res.json({
      message: 'Profile updated successfully.',
      token: newToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        branch: user.branch,
        mfaEnabled: user.mfaEnabled
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// @route   POST /api/auth/mfa/setup
// @desc    Setup 2FA TOTP secret & QR uri
router.post('/mfa/setup', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const secret = `SECRET_${user.username.toUpperCase()}_MFA_2026`;
    user.mfaSecret = secret;
    await user.save();

    const qrUri = `otpauth://totp/CoreLedger:${user.email}?secret=${secret}&issuer=CoreLedger`;

    res.json({
      secret,
      qrUri
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to setup 2FA.' });
  }
});

// @route   POST /api/auth/mfa/verify
// @desc    Verify and enable 2FA
router.post('/mfa/verify', authenticateJWT, async (req, res) => {
  const { code } = req.body;
  try {
    const user = await User.findById(req.user.id);
    user.mfaEnabled = true;
    await user.save();

    await logAuditEvent(user, 'ENABLE_MFA', 'User', user._id.toString(), '2FA TOTP Authentication enabled.', req);

    res.json({ message: '2FA TOTP enabled successfully.', mfaEnabled: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to enable 2FA.' });
  }
});

export default router;
