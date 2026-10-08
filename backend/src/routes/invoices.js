import express from 'express';
import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';
import Account from '../models/Account.js';
import InventoryItem from '../models/InventoryItem.js';
import { postJournalEntry } from '../utils/ledgerHelper.js';
import { generateInvoicePDF } from '../utils/pdfGenerator.js';
import { authenticateJWT } from '../middleware/auth.js';
import { logAuditEvent } from '../utils/auditHelper.js';

const router = express.Router();
router.use(authenticateJWT);

// Helper to find default Chart of Accounts for current user
async function getRequiredAccounts(userId) {
  const [cashAcc, arAcc, salesAcc] = await Promise.all([
    Account.findOne({ user: userId, code: '1010' }), // Cash & Bank
    Account.findOne({ user: userId, code: '1200' }), // Accounts Receivable
    Account.findOne({ user: userId, code: '4000' })  // Sales Revenue
  ]);

  if (!cashAcc || !arAcc || !salesAcc) {
    throw new Error('Required accounting codes (1010, 1200, 4000) are not configured in your Chart of Accounts.');
  }

  return { cashAcc, arAcc, salesAcc };
}

// Helper to auto-deduct inventory SKU stock when finalizing invoices
async function deductInventoryStock(userId, items, session = null) {
  try {
    for (const item of items) {
      const matchItem = await InventoryItem.findOne({
        user: userId,
        $or: [
          { name: new RegExp(`^${item.description.trim()}$`, 'i') },
          { sku: new RegExp(`^${item.description.trim()}$`, 'i') }
        ]
      }).session(session);

      if (matchItem) {
        const qtyDeduct = Number(item.quantity);
        matchItem.stockQuantity = Math.max(0, matchItem.stockQuantity - qtyDeduct);
        await matchItem.save({ session });
      }
    }
  } catch (err) {
    console.error('Inventory auto-deduct warning:', err.message);
  }
}

// @route   GET /api/invoices
// @desc    Get all user invoices
router.get('/', async (req, res) => {
  try {
    const invoices = await Invoice.find({ user: req.user.id })
      .sort({ date: -1, createdAt: -1 })
      .populate('salesJournalEntry')
      .populate('paymentJournalEntry');
    res.json(invoices);
  } catch (err) {
    console.error('Error fetching invoices:', err);
    res.status(500).json({ error: 'Internal server error fetching invoices.' });
  }
});

// @route   POST /api/invoices
// @desc    Create a new Tax Invoice (Draft or Sent state)
router.post('/', async (req, res) => {
  const {
    invoiceNumber,
    clientName,
    clientEmail,
    clientGstin,
    clientAddress,
    date,
    dueDate,
    items,
    currency,
    paymentTerms,
    notes
  } = req.body;

  if (!invoiceNumber || !clientName || !clientEmail || !dueDate || !items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Please provide all required invoice details.' });
  }

  try {
    const existing = await Invoice.findOne({ user: req.user.id, invoiceNumber });
    if (existing) {
      return res.status(400).json({ error: `Invoice number ${invoiceNumber} already exists.` });
    }

    let subtotalCents = 0;
    let taxCents = 0;
    let discountCents = 0;

    const computedItems = items.map(item => {
      const qty = Number(item.quantity);
      const price = Number(item.unitPrice); // in cents
      const taxRate = Number(item.taxRatePercent !== undefined ? item.taxRatePercent : 18);
      const discRate = Number(item.discountPercent || 0);
      const hsn = item.hsnCode || '998311';

      if (!Number.isInteger(price) || price < 0 || qty < 1) {
        throw new Error('Quantity must be >= 1 and unit price must be a non-negative integer in cents.');
      }

      const itemRawTotal = qty * price;
      const itemDiscount = Math.round(itemRawTotal * (discRate / 100));
      const itemNetSubtotal = itemRawTotal - itemDiscount;
      const itemTax = Math.round(itemNetSubtotal * (taxRate / 100));
      const lineAmount = itemNetSubtotal + itemTax;

      subtotalCents += itemNetSubtotal;
      taxCents += itemTax;
      discountCents += itemDiscount;

      return {
        description: item.description,
        hsnCode: hsn,
        quantity: qty,
        unitPrice: price,
        taxRatePercent: taxRate,
        discountPercent: discRate,
        amount: lineAmount
      };
    });

    const grandTotalCents = subtotalCents + taxCents;
    const cleanNumber = (grandTotalCents / 100).toFixed(2);
    const upiUrl = `upi://pay?pa=billing@smartledger&pn=${encodeURIComponent(clientName)}&am=${cleanNumber}&cu=INR`;

    const invoice = new Invoice({
      invoiceNumber,
      clientName,
      clientEmail,
      clientGstin: clientGstin || '27AAACC9988E1Z4',
      clientAddress: clientAddress || 'Corporate Office Plaza, Suite 402',
      date: date || new Date(),
      dueDate,
      items: computedItems,
      subtotalAmount: subtotalCents,
      taxAmount: taxCents,
      discountAmount: discountCents,
      totalAmount: grandTotalCents,
      amountPaid: 0,
      balanceDue: grandTotalCents,
      currency: currency || 'INR',
      paymentTerms: paymentTerms || 'Net 30 Days',
      notes: notes || 'Thank you for your business. Remit payment via UPI or Corporate Bank Feed.',
      upiPaymentUrl: upiUrl,
      status: 'Draft',
      user: req.user.id
    });

    await invoice.save();
    await logAuditEvent(req.user, 'CREATE_INVOICE_DRAFT', 'Invoice', invoice._id.toString(), `Drafted invoice ${invoiceNumber} for ${clientName}`, req);

    res.status(201).json(invoice);
  } catch (err) {
    console.error('Error creating invoice:', err);
    res.status(400).json({ error: err.message });
  }
});

// @route   GET /api/invoices/:id
// @desc    Get details of a single invoice
router.get('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, user: req.user.id })
      .populate('salesJournalEntry')
      .populate('paymentJournalEntry');
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error fetching invoice.' });
  }
});

// @route   POST /api/invoices/:id/duplicate
// @desc    1-Click Duplicate Invoice
router.post('/:id/duplicate', async (req, res) => {
  try {
    const sourceInv = await Invoice.findOne({ _id: req.params.id, user: req.user.id });
    if (!sourceInv) {
      return res.status(404).json({ error: 'Source invoice not found.' });
    }

    const newInvNum = `INV-DUP-${Math.floor(1000 + Math.random() * 9000)}`;

    const clonedInv = new Invoice({
      invoiceNumber: newInvNum,
      clientName: sourceInv.clientName,
      clientEmail: sourceInv.clientEmail,
      clientGstin: sourceInv.clientGstin,
      clientAddress: sourceInv.clientAddress,
      date: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      items: sourceInv.items,
      subtotalAmount: sourceInv.subtotalAmount,
      taxAmount: sourceInv.taxAmount,
      discountAmount: sourceInv.discountAmount,
      totalAmount: sourceInv.totalAmount,
      amountPaid: 0,
      balanceDue: sourceInv.totalAmount,
      currency: sourceInv.currency,
      paymentTerms: sourceInv.paymentTerms,
      notes: sourceInv.notes,
      upiPaymentUrl: sourceInv.upiPaymentUrl,
      status: 'Draft',
      user: req.user.id
    });

    await clonedInv.save();
    await logAuditEvent(req.user, 'DUPLICATE_INVOICE', 'Invoice', clonedInv._id.toString(), `Duplicated ${sourceInv.invoiceNumber} -> ${newInvNum}`, req);

    res.status(201).json(clonedInv);
  } catch (err) {
    res.status(500).json({ error: 'Failed to duplicate invoice.' });
  }
});

// @route   POST /api/invoices/:id/send
// @desc    Finalize and send invoice (Locks invoice, posts to ledger: DR Accounts Receivable, CR Sales Revenue, auto-deducts inventory SKU stock)
router.post('/:id/send', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, user: req.user.id }).session(session);
    if (!invoice) {
      throw new Error('Invoice not found.');
    }

    if (invoice.status !== 'Draft') {
      throw new Error(`Invoice cannot be sent because it is in '${invoice.status}' status.`);
    }

    const { arAcc, salesAcc } = await getRequiredAccounts(req.user.id);

    // Ledger posting lines
    const journalLines = [
      { account: arAcc._id, debit: invoice.totalAmount, credit: 0 },
      { account: salesAcc._id, debit: 0, credit: invoice.totalAmount }
    ];

    const journal = await postJournalEntry(session, {
      user: req.user.id,
      description: `Tax Invoice Issued: ${invoice.invoiceNumber} to ${invoice.clientName}`,
      reference: invoice._id.toString(),
      date: invoice.date,
      lines: journalLines
    });

    // Auto-deduct inventory SKU stock
    await deductInventoryStock(req.user.id, invoice.items, session);

    invoice.status = 'Sent';
    invoice.salesJournalEntry = journal._id;
    await invoice.save({ session });

    await session.commitTransaction();
    session.endSession();

    await logAuditEvent(req.user, 'SEND_INVOICE', 'Invoice', invoice._id.toString(), `Finalized and sent Invoice ${invoice.invoiceNumber}`, req);

    const updatedInvoice = await Invoice.findById(invoice._id)
      .populate('salesJournalEntry')
      .populate('paymentJournalEntry');
    res.json(updatedInvoice);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('Invoice send transaction aborted:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// @route   POST /api/invoices/:id/pay
// @desc    Record full customer payment (Posts DR Cash & Bank, CR Accounts Receivable)
router.post('/:id/pay', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, user: req.user.id }).session(session);
    if (!invoice) {
      throw new Error('Invoice not found.');
    }

    if (invoice.status === 'Paid') {
      throw new Error('Invoice is already paid.');
    }

    const { cashAcc, arAcc, salesAcc } = await getRequiredAccounts(req.user.id);

    let salesJournalId = invoice.salesJournalEntry;
    if (invoice.status === 'Draft') {
      const saleLines = [
        { account: arAcc._id, debit: invoice.totalAmount, credit: 0 },
        { account: salesAcc._id, debit: 0, credit: invoice.totalAmount }
      ];
      const saleJournal = await postJournalEntry(session, {
        user: req.user.id,
        description: `Sales Invoice Issued: ${invoice.invoiceNumber} to ${invoice.clientName}`,
        reference: invoice._id.toString(),
        date: invoice.date,
        lines: saleLines
      });
      salesJournalId = saleJournal._id;
      await deductInventoryStock(req.user.id, invoice.items, session);
    }

    const paymentLines = [
      { account: cashAcc._id, debit: invoice.totalAmount, credit: 0 },
      { account: arAcc._id, debit: 0, credit: invoice.totalAmount }
    ];

    const paymentJournal = await postJournalEntry(session, {
      user: req.user.id,
      description: `Full Settlement Received: Invoice ${invoice.invoiceNumber} from ${invoice.clientName}`,
      reference: invoice._id.toString(),
      date: new Date(),
      lines: paymentLines
    });

    invoice.status = 'Paid';
    invoice.amountPaid = invoice.totalAmount;
    invoice.balanceDue = 0;
    invoice.salesJournalEntry = salesJournalId;
    invoice.paymentJournalEntry = paymentJournal._id;
    await invoice.save({ session });

    await session.commitTransaction();
    session.endSession();

    await logAuditEvent(req.user, 'PAY_INVOICE', 'Invoice', invoice._id.toString(), `Full payment settled for Invoice ${invoice.invoiceNumber}`, req);

    const updatedInvoice = await Invoice.findById(invoice._id)
      .populate('salesJournalEntry')
      .populate('paymentJournalEntry');
    res.json(updatedInvoice);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('Invoice payment transaction aborted:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// @route   POST /api/invoices/:id/record-partial
// @desc    Record partial payment against invoice balance
router.post('/:id/record-partial', async (req, res) => {
  const { partialAmount } = req.body; // in cents
  if (!partialAmount || partialAmount <= 0) {
    return res.status(400).json({ error: 'Please specify a valid partial payment amount.' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, user: req.user.id }).session(session);
    if (!invoice) throw new Error('Invoice not found.');

    const payCents = Math.min(Number(partialAmount), invoice.balanceDue);
    const { cashAcc, arAcc } = await getRequiredAccounts(req.user.id);

    const paymentLines = [
      { account: cashAcc._id, debit: payCents, credit: 0 },
      { account: arAcc._id, debit: 0, credit: payCents }
    ];

    const paymentJournal = await postJournalEntry(session, {
      user: req.user.id,
      description: `Partial Payment Received: Invoice ${invoice.invoiceNumber} (₹${(payCents / 100).toFixed(2)})`,
      reference: invoice._id.toString(),
      date: new Date(),
      lines: paymentLines
    });

    invoice.amountPaid += payCents;
    invoice.balanceDue = Math.max(0, invoice.totalAmount - invoice.amountPaid);
    invoice.status = invoice.balanceDue === 0 ? 'Paid' : 'Partial';
    invoice.paymentJournalEntry = paymentJournal._id;
    await invoice.save({ session });

    await session.commitTransaction();
    session.endSession();

    await logAuditEvent(req.user, 'PARTIAL_PAYMENT_INVOICE', 'Invoice', invoice._id.toString(), `Recorded partial payment ₹${(payCents / 100).toFixed(2)} on Invoice ${invoice.invoiceNumber}`, req);

    res.json(invoice);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ error: err.message });
  }
});

// @route   GET /api/invoices/:id/download
// @desc    Download Tax Compliant Invoice PDF
router.get('/:id/download', async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, user: req.user.id });
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    res.setHeader('Content-Disposition', `attachment; filename=tax-invoice-${invoice.invoiceNumber}.pdf`);
    res.setHeader('Content-Type', 'application/pdf');

    generateInvoicePDF(invoice, res);
  } catch (err) {
    console.error('Error generating PDF:', err);
    res.status(500).json({ error: 'Failed to generate PDF.' });
  }
});

export default router;
