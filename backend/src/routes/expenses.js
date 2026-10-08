import express from 'express';
import mongoose from 'mongoose';
import Expense from '../models/Expense.js';
import Account from '../models/Account.js';
import { postJournalEntry } from '../utils/ledgerHelper.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = express.Router();

// Apply auth middleware
router.use(authenticateJWT);

// Helper to check accounts and retrieve them
async function getAccountOrThrow(userId, id, purpose) {
  const acc = await Account.findOne({ _id: id, user: userId });
  if (!acc) {
    throw new Error(`Account selected for ${purpose} does not exist in Chart of Accounts.`);
  }
  return acc;
}

// @route   GET /api/expenses
// @desc    Get all user expenses
router.get('/', async (req, res) => {
  try {
    const expenses = await Expense.find({ user: req.user.id })
      .sort({ date: -1, createdAt: -1 })
      .populate('category')
      .populate('paymentAccount')
      .populate('journalEntry')
      .populate('paymentJournalEntry');
    res.json(expenses);
  } catch (err) {
    console.error('Error fetching expenses:', err);
    res.status(500).json({ error: 'Internal server error fetching expenses.' });
  }
});

// @route   GET /api/expenses/analytics/daily-monthly
// @desc    Get daily and monthly expense tracking metrics, category breakdowns & timeline
router.get('/analytics/daily-monthly', async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const now = new Date();
    
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // 1. Daily Expenses Aggregation
    const dailyExpenses = await Expense.find({
      user: userId,
      date: { $gte: startOfToday, $lte: endOfToday }
    }).populate('category').sort({ date: -1 });

    const dailyTotal = dailyExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    // 2. Monthly Expenses Aggregation
    const monthlyExpenses = await Expense.find({
      user: userId,
      date: { $gte: startOfMonth, $lte: endOfMonth }
    }).populate('category');

    const monthlyTotal = monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    // 3. Category breakdown for current month
    const categoryMap = {};
    monthlyExpenses.forEach(exp => {
      const catName = exp.category ? exp.category.name : 'Uncategorized';
      if (!categoryMap[catName]) {
        categoryMap[catName] = 0;
      }
      categoryMap[catName] += exp.amount;
    });

    const categoryBreakdown = Object.keys(categoryMap).map(catName => ({
      name: catName,
      value: categoryMap[catName] / 100
    }));

    // 4. Daily timeline for current month
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const timelineMap = {};
    for (let day = 1; day <= daysInMonth; day++) {
      timelineMap[day] = 0;
    }

    monthlyExpenses.forEach(exp => {
      const d = new Date(exp.date).getDate();
      if (timelineMap[d] !== undefined) {
        timelineMap[d] += exp.amount;
      }
    });

    const monthlyTimeline = Object.keys(timelineMap).map(day => ({
      day: `${day}`,
      amount: timelineMap[day] / 100
    }));

    res.json({
      dailyTotal,
      dailyCount: dailyExpenses.length,
      monthlyTotal,
      monthlyCount: monthlyExpenses.length,
      dailyAverage: daysInMonth > 0 ? Math.round(monthlyTotal / daysInMonth) : 0,
      todayExpenses: dailyExpenses,
      categoryBreakdown,
      monthlyTimeline
    });
  } catch (err) {
    console.error('Error calculating expense analytics:', err);
    res.status(500).json({ error: 'Internal server error calculating expense analytics.' });
  }
});

// @route   POST /api/expenses
// @desc    Log a new expense (Posts to ledger: DR Expense Category, CR Cash/Bank or Accounts Payable)
router.post('/', async (req, res) => {
  const { expenseNumber, vendor, date, category, paymentAccount, amount, description, status } = req.body;

  if (!expenseNumber || !vendor || !category || !paymentAccount || !amount || !status) {
    return res.status(400).json({ error: 'Please provide all required expense details.' });
  }

  const amtValue = Number(amount);
  if (!Number.isInteger(amtValue) || amtValue <= 0) {
    return res.status(400).json({ error: 'Expense amount must be a positive integer representing cents.' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const existing = await Expense.findOne({ user: req.user.id, expenseNumber });
    if (existing) {
      throw new Error(`Expense number ${expenseNumber} already exists.`);
    }

    // Validate accounts
    const catAccount = await getAccountOrThrow(req.user.id, category, 'Expense Category');
    const payAccount = await getAccountOrThrow(req.user.id, paymentAccount, 'Payment Account');

    if (catAccount.type !== 'Expense') {
      throw new Error('Expense category account must be of type Expense.');
    }

    // Ledger posting lines
    const journalLines = [
      { account: catAccount._id, debit: amtValue, credit: 0 },          // Debit Expense Category
      { account: payAccount._id, debit: 0, credit: amtValue }           // Credit Cash/Bank or Accounts Payable
    ];

    // Post to ledger
    const journal = await postJournalEntry(session, {
      user: req.user.id,
      description: `Expense Recorded: ${expenseNumber} - ${vendor} (${catAccount.name})`,
      reference: expenseNumber,
      date: date || new Date(),
      lines: journalLines
    });

    const expense = new Expense({
      expenseNumber,
      vendor,
      date: date || new Date(),
      category: catAccount._id,
      paymentAccount: payAccount._id,
      amount: amtValue,
      description,
      status,
      user: req.user.id,
      journalEntry: journal._id
    });

    await expense.save({ session });

    await session.commitTransaction();
    session.endSession();

    const populated = await Expense.findById(expense._id)
      .populate('category')
      .populate('paymentAccount')
      .populate('journalEntry');

    res.status(201).json(populated);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('Expense logging aborted:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// @route   POST /api/expenses/:id/pay
// @desc    Record payment for an Unpaid expense (DR Accounts Payable, CR Cash & Bank)
router.post('/:id/pay', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const expense = await Expense.findOne({ _id: req.params.id, user: req.user.id }).session(session);
    if (!expense) {
      throw new Error('Expense not found.');
    }

    if (expense.status === 'Paid') {
      throw new Error('Expense is already paid.');
    }

    // Retrieve accounts payable (2000) and cash & bank (1010)
    const [apAccount, cashAccount] = await Promise.all([
      Account.findOne({ user: req.user.id, code: '2000' }),
      Account.findOne({ user: req.user.id, code: '1010' })
    ]);

    if (!apAccount || !cashAccount) {
      throw new Error('Accounts 1010 (Cash) and 2000 (Accounts Payable) are required for ledger payment processing.');
    }

    // Ledger posting lines
    const journalLines = [
      { account: apAccount._id, debit: expense.amount, credit: 0 },       // Debit Accounts Payable (Reduce liability)
      { account: cashAccount._id, debit: 0, credit: expense.amount }      // Credit Cash & Bank (Reduce asset)
    ];

    // Post to ledger
    const paymentJournal = await postJournalEntry(session, {
      user: req.user.id,
      description: `Payment Settled for Expense: ${expense.expenseNumber} to ${expense.vendor}`,
      reference: expense.expenseNumber,
      date: new Date(),
      lines: journalLines
    });

    expense.status = 'Paid';
    expense.paymentJournalEntry = paymentJournal._id;
    await expense.save({ session });

    await session.commitTransaction();
    session.endSession();

    const populated = await Expense.findById(expense._id)
      .populate('category')
      .populate('paymentAccount')
      .populate('journalEntry')
      .populate('paymentJournalEntry');

    res.json(populated);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('Expense payment aborted:', err.message);
    res.status(400).json({ error: err.message });
  }
});

export default router;
