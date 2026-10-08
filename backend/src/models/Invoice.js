import mongoose from 'mongoose';

const invoiceItemSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
    trim: true
  },
  hsnCode: {
    type: String,
    default: '998311',
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true,
    validate: {
      validator: Number.isInteger,
      message: '{VALUE} must be an integer representing cents'
    }
  },
  taxRatePercent: {
    type: Number,
    default: 18.0
  },
  discountPercent: {
    type: Number,
    default: 0
  },
  amount: {
    type: Number,
    required: true,
    validate: {
      validator: Number.isInteger,
      message: '{VALUE} must be an integer representing cents'
    }
  }
});

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    trim: true
  },
  clientName: {
    type: String,
    required: true,
    trim: true
  },
  clientEmail: {
    type: String,
    required: true,
    trim: true
  },
  clientGstin: {
    type: String,
    default: '27AAACC9988E1Z4',
    trim: true
  },
  clientAddress: {
    type: String,
    default: 'Corporate Office Plaza, Suite 402',
    trim: true
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  items: {
    type: [invoiceItemSchema],
    required: true
  },
  subtotalAmount: {
    type: Number,
    default: 0
  },
  taxAmount: {
    type: Number,
    default: 0
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    validate: {
      validator: Number.isInteger,
      message: '{VALUE} must be an integer representing cents'
    }
  },
  amountPaid: {
    type: Number,
    default: 0
  },
  balanceDue: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR', 'GBP', 'AED']
  },
  paymentTerms: {
    type: String,
    default: 'Net 30 Days'
  },
  notes: {
    type: String,
    default: 'Thank you for your business. Please remit payment via UPI or Corporate Bank Feed.'
  },
  upiPaymentUrl: {
    type: String
  },
  status: {
    type: String,
    enum: ['Draft', 'Sent', 'Partial', 'Paid'],
    default: 'Draft',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  salesJournalEntry: {
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

invoiceSchema.index({ user: 1, invoiceNumber: 1 }, { unique: true });

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;
