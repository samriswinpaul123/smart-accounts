import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  expenseNumber: {
    type: String,
    required: true,
    trim: true
  },
  vendor: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true
  },
  paymentAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    validate: {
      validator: Number.isInteger,
      message: '{VALUE} must be an integer representing cents'
    }
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['Paid', 'Unpaid'],
    default: 'Paid',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  journalEntry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JournalEntry'
  },
  paymentJournalEntry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JournalEntry'
  }
}, {
  timestamps: true
});

// Ensure expense numbers are unique per user
expenseSchema.index({ user: 1, expenseNumber: 1 }, { unique: true });

const Expense = mongoose.model('Expense', expenseSchema);
export default Expense;
