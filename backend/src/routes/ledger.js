import express from 'express';
import mongoose from 'mongoose';
import JournalEntry from '../models/JournalEntry.js';
import { postJournalEntry } from '../utils/ledgerHelper.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = express.Router();

// Apply auth middleware
router.use(authenticateJWT);

// @route   GET /api/ledger
// @desc    Get chronological journal entries with populated accounts
router.get('/', async (req, res) => {
  try {
    const entries = await JournalEntry.find({ user: req.user.id })
      .sort({ date: -1, createdAt: -1 })
      .populate('journalLines.account');
    res.json(entries);
  } catch (err) {
    console.error('Error fetching ledger entries:', err);
    res.status(500).json({ error: 'Internal server error fetching ledger entries.' });
  }
});

// @route   POST /api/ledger
// @desc    Manually post a double-entry journal record
router.post('/', async (req, res) => {
  const { description, reference, date, journalLines } = req.body;

  if (!description || !journalLines || !Array.isArray(journalLines)) {
    return res.status(400).json({ error: 'Please provide description and journalLines array.' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const entry = await postJournalEntry(session, {
      user: req.user.id,
      description,
      reference,
      date,
      lines: journalLines
    });

    await session.commitTransaction();
    
    // Fetch populated entry to return to client
    const populated = await JournalEntry.findById(entry._id).populate('journalLines.account');
    res.status(201).json(populated);
  } catch (err) {
    await session.abortTransaction();
    console.error('Journal entry posting aborted:', err.message);
    res.status(400).json({ error: err.message });
  } finally {
    session.endSession();
  }
});

export default router;
