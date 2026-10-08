import express from 'express';
import mongoose from 'mongoose';
import JournalEntry from '../models/JournalEntry.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = express.Router();

// Apply auth middleware
router.use(authenticateJWT);

// @route   GET /api/reports/profit-and-loss
// @desc    Generate Profit & Loss Statement (Revenue vs. Expenses)
router.get('/profit-and-loss', async (req, res) => {
  try {
    const pipeline = [
      // 1. Filter by current user
      { $match: { user: new mongoose.Types.ObjectId(req.user.id) } },
      
      // 2. Unwind journal lines
      { $unwind: '$journalLines' },
      
      // 3. Lookup account details
      {
        $lookup: {
          from: 'accounts',
          localField: 'journalLines.account',
          foreignField: '_id',
          as: 'account'
        }
      },
      { $unwind: '$account' },
      
      // 4. Filter only Revenue and Expense classifications
      {
        $match: {
          'account.type': { $in: ['Revenue', 'Expense'] }
        }
      },
      
      // 5. Determine debit/credit financial impact (conditional matrix)
      // Revenue accounts: Credits increase (positive), Debits decrease (negative)
      // Expense accounts: Debits increase (positive), Credits decrease (negative)
      {
        $project: {
          accountType: '$account.type',
          accountCode: '$account.code',
          accountName: '$account.name',
          amount: {
            $cond: {
              if: { $eq: ['$account.type', 'Revenue'] },
              then: { $subtract: ['$journalLines.credit', '$journalLines.debit'] },
              else: { $subtract: ['$journalLines.debit', '$journalLines.credit'] }
            }
          }
        }
      },
      
      // 6. Group by account code/name to calculate individual balances
      {
        $group: {
          _id: {
            type: '$accountType',
            code: '$accountCode',
            name: '$accountName'
          },
          balance: { $sum: '$amount' }
        }
      },
      
      // 7. Group by account type (Revenue vs Expense)
      {
        $group: {
          _id: '$_id.type',
          accounts: {
            $push: {
              code: '$_id.code',
              name: '$_id.name',
              balance: '$balance'
            }
          },
          total: { $sum: '$balance' }
        }
      }
    ];

    const rawReport = await JournalEntry.aggregate(pipeline);

    // Format output
    let revenue = { accounts: [], total: 0 };
    let expense = { accounts: [], total: 0 };

    rawReport.forEach(cat => {
      if (cat._id === 'Revenue') {
        revenue = { accounts: cat.accounts, total: cat.total };
      } else if (cat._id === 'Expense') {
        expense = { accounts: cat.accounts, total: cat.total };
      }
    });

    const netIncome = revenue.total - expense.total;

    res.json({
      revenue,
      expense,
      netIncome
    });
  } catch (err) {
    console.error('Error generating Profit & Loss:', err);
    res.status(500).json({ error: 'Internal server error generating Profit & Loss report.' });
  }
});

// @route   GET /api/reports/balance-sheet
// @desc    Generate Balance Sheet (Assets, Liabilities, Equity)
router.get('/balance-sheet', async (req, res) => {
  try {
    const pipeline = [
      { $match: { user: new mongoose.Types.ObjectId(req.user.id) } },
      { $unwind: '$journalLines' },
      {
        $lookup: {
          from: 'accounts',
          localField: 'journalLines.account',
          foreignField: '_id',
          as: 'account'
        }
      },
      { $unwind: '$account' },
      {
        $match: {
          'account.type': { $in: ['Asset', 'Liability', 'Equity'] }
        }
      },
      // Asset accounts: Debits increase (+), Credits decrease (-)
      // Liability/Equity accounts: Credits increase (+), Debits decrease (-)
      {
        $project: {
          accountType: '$account.type',
          accountCode: '$account.code',
          accountName: '$account.name',
          amount: {
            $cond: {
              if: { $eq: ['$account.type', 'Asset'] },
              then: { $subtract: ['$journalLines.debit', '$journalLines.credit'] },
              else: { $subtract: ['$journalLines.credit', '$journalLines.debit'] }
            }
          }
        }
      },
      {
        $group: {
          _id: {
            type: '$accountType',
            code: '$accountCode',
            name: '$accountName'
          },
          balance: { $sum: '$amount' }
        }
      },
      {
        $group: {
          _id: '$_id.type',
          accounts: {
            $push: {
              code: '$_id.code',
              name: '$_id.name',
              balance: '$balance'
            }
          },
          total: { $sum: '$balance' }
        }
      }
    ];

    const rawReport = await JournalEntry.aggregate(pipeline);

    // Also need to fetch net income from P&L to reconcile Retained Earnings
    // P&L Net Income:
    const plPipeline = [
      { $match: { user: new mongoose.Types.ObjectId(req.user.id) } },
      { $unwind: '$journalLines' },
      {
        $lookup: {
          from: 'accounts',
          localField: 'journalLines.account',
          foreignField: '_id',
          as: 'account'
        }
      },
      { $unwind: '$account' },
      { $match: { 'account.type': { $in: ['Revenue', 'Expense'] } } },
      {
        $project: {
          accountType: '$account.type',
          amount: {
            $cond: {
              if: { $eq: ['$account.type', 'Revenue'] },
              then: { $subtract: ['$journalLines.credit', '$journalLines.debit'] },
              else: { $subtract: ['$journalLines.debit', '$journalLines.credit'] }
            }
          }
        }
      },
      {
        $group: {
          _id: '$accountType',
          total: { $sum: '$amount' }
        }
      }
    ];

    const rawPL = await JournalEntry.aggregate(plPipeline);
    let revTotal = 0;
    let expTotal = 0;
    rawPL.forEach(cat => {
      if (cat._id === 'Revenue') revTotal = cat.total;
      if (cat._id === 'Expense') expTotal = cat.total;
    });
    const netIncome = revTotal - expTotal;

    let assets = { accounts: [], total: 0 };
    let liabilities = { accounts: [], total: 0 };
    let equity = { accounts: [], total: 0 };

    rawReport.forEach(cat => {
      if (cat._id === 'Asset') {
        assets = { accounts: cat.accounts, total: cat.total };
      } else if (cat._id === 'Liability') {
        liabilities = { accounts: cat.accounts, total: cat.total };
      } else if (cat._id === 'Equity') {
        equity = { accounts: cat.accounts, total: cat.total };
      }
    });

    // In a double-entry ledger, net income reconciles to Retained Earnings (Equity)
    // We add Net Income dynamically to Equity report
    equity.accounts.push({
      code: '3000-RE',
      name: 'Current Period Retained Earnings',
      balance: netIncome
    });
    equity.total += netIncome;

    res.json({
      assets,
      liabilities,
      equity,
      isBalanced: assets.total === (liabilities.total + equity.total),
      discrepancy: assets.total - (liabilities.total + equity.total)
    });
  } catch (err) {
    console.error('Error generating Balance Sheet:', err);
    res.status(500).json({ error: 'Internal server error generating Balance Sheet.' });
  }
});

export default router;
