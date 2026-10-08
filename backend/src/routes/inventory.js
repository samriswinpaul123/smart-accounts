import express from 'express';
import InventoryItem from '../models/InventoryItem.js';
import Expense from '../models/Expense.js';
import Account from '../models/Account.js';
import { postJournalEntry } from '../utils/ledgerHelper.js';
import { authenticateJWT } from '../middleware/auth.js';
import { logAuditEvent } from '../utils/auditHelper.js';

const router = express.Router();
router.use(authenticateJWT);

const DEFAULT_INVENTORY_ITEMS = [
  { sku: 'SKU-SaaS-01', name: 'Enterprise Cloud SaaS License', category: 'Software Subscriptions', costPrice: 150000, sellingPrice: 450000, stockQuantity: 150, reorderLevel: 20, unit: 'Licenses' },
  { sku: 'SKU-HW-02', name: 'MacBook Pro M3 Workstation', category: 'Hardware Equipment', costPrice: 9500000, sellingPrice: 12490000, stockQuantity: 18, reorderLevel: 5, unit: 'Units' },
  { sku: 'SKU-CONS-03', name: 'Technical Advisory & Audit Consultation', category: 'Professional Services', costPrice: 200000, sellingPrice: 750000, stockQuantity: 500, reorderLevel: 50, unit: 'Hours' },
  { sku: 'SKU-NET-04', name: 'Gigabit Switch & Router Hardware', category: 'Networking Infrastructure', costPrice: 1800000, sellingPrice: 2800000, stockQuantity: 8, reorderLevel: 10, unit: 'Units' }
];

// @route   GET /api/inventory
// @desc    Get all inventory stock items for user (auto-seeds defaults if empty)
router.get('/', async (req, res) => {
  try {
    let items = await InventoryItem.find({ user: req.user.id }).sort({ createdAt: -1 });
    if (items.length === 0) {
      const seeded = DEFAULT_INVENTORY_ITEMS.map(i => ({ ...i, user: req.user.id }));
      items = await InventoryItem.insertMany(seeded);
    }
    res.json(items);
  } catch (err) {
    console.error('Error fetching inventory:', err);
    res.status(500).json({ error: 'Failed to fetch inventory items.' });
  }
});

// @route   POST /api/inventory
// @desc    Create a new inventory stock item
router.post('/', async (req, res) => {
  const { sku, name, category, costPrice, sellingPrice, stockQuantity, reorderLevel, unit } = req.body;
  if (!sku || !name || !costPrice || !sellingPrice) {
    return res.status(400).json({ error: 'Please provide SKU, name, cost price, and selling price.' });
  }

  try {
    const item = new InventoryItem({
      sku,
      name,
      category: category || 'General Stock',
      costPrice: Math.round(Number(costPrice)),
      sellingPrice: Math.round(Number(sellingPrice)),
      stockQuantity: stockQuantity !== undefined ? Number(stockQuantity) : 100,
      reorderLevel: reorderLevel !== undefined ? Number(reorderLevel) : 15,
      unit: unit || 'Nos',
      user: req.user.id
    });
    await item.save();

    await logAuditEvent(req.user, 'CREATE_INVENTORY', 'InventoryItem', item._id.toString(), `Created stock item: ${name} (${sku})`, req);
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// @route   POST /api/inventory/purchase
// @desc    Record Inventory Stock Purchase -> Auto-increases Stock & Auto-creates Expense Voucher
router.post('/purchase', async (req, res) => {
  const { inventoryItemId, sku, vendor, quantityPurchased, unitCostPrice, description, categoryCode } = req.body;

  if ((!inventoryItemId && !sku) || !quantityPurchased || quantityPurchased <= 0) {
    return res.status(400).json({ error: 'Please provide valid Inventory Item, Vendor, and Quantity Purchased.' });
  }

  try {
    const userId = req.user.id;
    let item = null;

    if (inventoryItemId) {
      item = await InventoryItem.findOne({ _id: inventoryItemId, user: userId });
    } else if (sku) {
      item = await InventoryItem.findOne({ sku: new RegExp(`^${sku.trim()}$`, 'i'), user: userId });
    }

    if (!item) {
      return res.status(404).json({ error: 'Matching Inventory Item not found.' });
    }

    const qty = Number(quantityPurchased);
    const unitPriceCents = unitCostPrice ? Math.round(Number(unitCostPrice)) : item.costPrice;
    const totalPurchaseCostCents = qty * unitPriceCents;

    // 1. Update Inventory Stock Quantity & Unit Cost Price
    item.stockQuantity += qty;
    if (unitCostPrice) item.costPrice = unitPriceCents;
    await item.save();

    // 2. Auto-Create Expense Voucher & Post General Ledger Journal Entry
    const vendorName = vendor || 'Inventory Vendor Supplier';
    const expNum = `EXP-PURCHASE-${Math.floor(1000 + Math.random() * 9000)}`;

    const catAcc = await Account.findOne({ user: userId, code: categoryCode || '5200' }) || await Account.findOne({ user: userId, code: '5100' });
    const payAcc = await Account.findOne({ user: userId, code: '1010' });

    let journalId = null;
    if (catAcc && payAcc) {
      const journal = await postJournalEntry(null, {
        user: userId,
        description: `Inventory Stock Purchase: ${expNum} - ${qty}x ${item.name} from ${vendorName}`,
        reference: expNum,
        date: new Date(),
        lines: [
          { account: catAcc._id, debit: totalPurchaseCostCents, credit: 0 },
          { account: payAcc._id, debit: 0, credit: totalPurchaseCostCents }
        ]
      });
      journalId = journal._id;
    }

    const expense = new Expense({
      expenseNumber: expNum,
      vendor: vendorName,
      date: new Date(),
      category: catAcc ? catAcc._id : null,
      paymentAccount: payAcc ? payAcc._id : null,
      amount: totalPurchaseCostCents,
      description: description || `Inventory Purchase: ${qty} ${item.unit} of ${item.name} (SKU: ${item.sku})`,
      status: 'Paid',
      user: userId,
      journalEntry: journalId
    });
    await expense.save();

    await logAuditEvent(req.user, 'PURCHASE_INVENTORY_STOCK', 'InventoryItem', item._id.toString(), `Purchased ${qty} ${item.unit} of ${item.name}. Increased stock to ${item.stockQuantity} & auto-logged expense ${expNum} (₹${(totalPurchaseCostCents / 100).toFixed(2)})`, req);

    res.status(201).json({
      message: `Successfully purchased ${qty} ${item.unit} of ${item.name}! Auto-logged expense ${expNum}.`,
      item,
      expense
    });
  } catch (err) {
    console.error('Inventory purchase error:', err);
    res.status(500).json({ error: 'Failed to process inventory stock purchase.' });
  }
});

// @route   PUT /api/inventory/:id
// @desc    Update stock quantity or pricing
router.put('/:id', async (req, res) => {
  const { stockQuantity, sellingPrice } = req.body;
  try {
    const item = await InventoryItem.findOne({ _id: req.params.id, user: req.user.id });
    if (!item) return res.status(404).json({ error: 'Inventory item not found.' });

    if (stockQuantity !== undefined) item.stockQuantity = Number(stockQuantity);
    if (sellingPrice !== undefined) item.sellingPrice = Number(sellingPrice);
    await item.save();

    await logAuditEvent(req.user, 'UPDATE_INVENTORY', 'InventoryItem', item._id.toString(), `Updated stock level for ${item.name}: ${item.stockQuantity} ${item.unit}`, req);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update inventory.' });
  }
});

export default router;
