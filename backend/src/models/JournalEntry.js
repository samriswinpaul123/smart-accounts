import mongoose from 'mongoose';

const journalLineSchema = new mongoose.Schema({
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true
  },
  debit: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: Number.isInteger,
      message: '{VALUE} must be an integer representing cents'
    }
  },
  credit: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: Number.isInteger,
      message: '{VALUE} must be an integer representing cents'
    }
  }
});

const journalEntrySchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  reference: {
    type: String,
    trim: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  journalLines: {
    type: [journalLineSchema],
    required: true,
    validate: {
      validator: function (v) {
        return v && v.length >= 2;
      },
      message: 'A journal entry must contain at least 2 lines (double-entry)'
    }
  }
}, {
  timestamps: true
});

// Enforce ledger immutability by intercepting all modifying hooks
journalEntrySchema.pre('save', function (next) {
  if (!this.isNew) {
    return next(new Error('Immutability Error: Journal entries cannot be modified once saved.'));
  }
  next();
});

const blockModifications = function (next) {
  next(new Error('Immutability Error: Journal entries cannot be updated or deleted directly.'));
};

journalEntrySchema.pre('updateOne', blockModifications);
journalEntrySchema.pre('findOneAndUpdate', blockModifications);
journalEntrySchema.pre('updateMany', blockModifications);
journalEntrySchema.pre('deleteOne', blockModifications);
journalEntrySchema.pre('deleteMany', blockModifications);
journalEntrySchema.pre('findOneAndDelete', blockModifications);

const JournalEntry = mongoose.model('JournalEntry', journalEntrySchema);
export default JournalEntry;
