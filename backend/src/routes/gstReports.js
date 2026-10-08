import express from 'express';
import ExcelJS from 'exceljs';
import { authenticateJWT } from '../middleware/auth.js';
import Invoice from '../models/Invoice.js';
import Expense from '../models/Expense.js';

const router = express.Router();
router.use(authenticateJWT);

// Helper to compute tax and subtotal safely for all invoice documents
function computeInvoiceGstDetails(inv) {
  const totalCents = inv.totalAmount || 0;
  let taxCents = inv.taxAmount || 0;

  // If taxAmount is not explicitly set, calculate 18% inclusive GST
  if (!taxCents || taxCents === 0) {
    taxCents = Math.round(totalCents - (totalCents / 1.18));
  }

  let subtotalCents = inv.subtotalAmount || (totalCents - taxCents);
  if (subtotalCents <= 0) subtotalCents = totalCents - taxCents;

  return {
    totalCents,
    subtotalCents,
    taxCents,
    subtotalRupees: subtotalCents / 100,
    taxRupees: taxCents / 100,
    totalRupees: totalCents / 100
  };
}

// @route   GET /api/reports/gst-returns
// @desc    Generate GSTR-1 & GSTR-3B GST Return filing JSON summary
router.get('/gst-returns', async (req, res) => {
  try {
    const invoices = await Invoice.find({ user: req.user.id }).sort({ date: -1 });
    const expenses = await Expense.find({ user: req.user.id }).populate('category').sort({ date: -1 });

    let totalTaxableSalesCents = 0;
    let totalTaxCents = 0;

    const b2bList = invoices.map(i => {
      const details = computeInvoiceGstDetails(i);
      totalTaxableSalesCents += details.subtotalCents;
      totalTaxCents += details.taxCents;

      return {
        invoiceNumber: i.invoiceNumber,
        clientName: i.clientName,
        clientGstin: i.clientGstin || '27AAACC9988E1Z4',
        subtotal: details.subtotalRupees,
        taxAmount: details.taxRupees,
        totalAmount: details.totalRupees,
        date: i.date,
        status: i.status
      };
    });

    const totalExpensesCents = expenses.reduce((s, e) => s + e.amount, 0);
    const estimatedITCCents = Math.round(totalExpensesCents * 0.18);
    const netGstPayableCents = Math.max(0, totalTaxCents - estimatedITCCents);

    res.json({
      filingPeriod: `${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()}`,
      totalTaxableSales: totalTaxableSalesCents / 100,
      totalOutputTax: totalTaxCents / 100,
      cgstOutput: (totalTaxCents / 2) / 100,
      sgstOutput: (totalTaxCents / 2) / 100,
      igstOutput: (totalTaxCents) / 100,
      estimatedITC: estimatedITCCents / 100,
      netGstPayable: netGstPayableCents / 100,
      invoiceCount: invoices.length,
      b2bInvoices: b2bList
    });
  } catch (err) {
    console.error('Error generating GST return:', err);
    res.status(500).json({ error: 'Failed to generate GST return summary.' });
  }
});

// @route   GET /api/reports/gst-excel
// @desc    Export GSTR-1 & GSTR-3B Tax Return filings in Excel (.xlsx) format
router.get('/gst-excel', async (req, res) => {
  try {
    const invoices = await Invoice.find({ user: req.user.id }).sort({ date: -1 });
    const expenses = await Expense.find({ user: req.user.id }).populate('category').sort({ date: -1 });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Core Ledger Accounting Engine';
    workbook.created = new Date();

    // Sheet 1: GSTR-1 Outward Sales Register
    const sheet1 = workbook.addWorksheet('GSTR-1 Outward Sales');
    sheet1.views = [{ showGridLines: true }];

    sheet1.columns = [
      { header: 'Invoice Number', key: 'invNo', width: 18 },
      { header: 'Invoice Date', key: 'invDate', width: 14 },
      { header: 'Client Name', key: 'clientName', width: 28 },
      { header: 'Client GSTIN', key: 'gstin', width: 18 },
      { header: 'HSN/SAC Code', key: 'hsn', width: 14 },
      { header: 'Taxable Value (₹)', key: 'subtotal', width: 18 },
      { header: 'CGST (9%) (₹)', key: 'cgst', width: 15 },
      { header: 'SGST (9%) (₹)', key: 'sgst', width: 15 },
      { header: 'IGST (18%) (₹)', key: 'igst', width: 15 },
      { header: 'Total Invoice (₹)', key: 'grandTotal', width: 18 },
      { header: 'Payment Status', key: 'status', width: 14 }
    ];

    const headerRow1 = sheet1.getRow(1);
    headerRow1.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } };
    headerRow1.alignment = { vertical: 'middle', horizontal: 'center' };

    let totalSub = 0;
    let totalTax = 0;
    let totalGrand = 0;

    invoices.forEach(inv => {
      const details = computeInvoiceGstDetails(inv);
      const sub = details.subtotalRupees;
      const tax = details.taxRupees;
      const grand = details.totalRupees;
      const cgst = tax / 2;
      const sgst = tax / 2;

      totalSub += sub;
      totalTax += tax;
      totalGrand += grand;

      const hsnCode = (inv.items && inv.items[0] && inv.items[0].hsnCode) ? inv.items[0].hsnCode : '998311';

      sheet1.addRow({
        invNo: inv.invoiceNumber,
        invDate: new Date(inv.date).toISOString().split('T')[0],
        clientName: inv.clientName,
        gstin: inv.clientGstin || '27AAACC9988E1Z4',
        hsn: hsnCode,
        subtotal: sub,
        cgst: cgst,
        sgst: sgst,
        igst: tax,
        grandTotal: grand,
        status: inv.status
      });
    });

    const summaryRow1 = sheet1.addRow({
      invNo: 'TOTALS',
      invDate: '',
      clientName: '',
      gstin: '',
      hsn: '',
      subtotal: totalSub,
      cgst: totalTax / 2,
      sgst: totalTax / 2,
      igst: totalTax,
      grandTotal: totalGrand,
      status: ''
    });
    summaryRow1.font = { bold: true };
    summaryRow1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };

    sheet1.eachRow((row, rowNum) => {
      if (rowNum > 1) {
        row.getCell('subtotal').numFmt = '₹#,##0.00';
        row.getCell('cgst').numFmt = '₹#,##0.00';
        row.getCell('sgst').numFmt = '₹#,##0.00';
        row.getCell('igst').numFmt = '₹#,##0.00';
        row.getCell('grandTotal').numFmt = '₹#,##0.00';
      }
    });

    // Sheet 2: GSTR-3B Summary
    const sheet2 = workbook.addWorksheet('GSTR-3B Tax Summary');
    sheet2.views = [{ showGridLines: true }];

    sheet2.columns = [
      { header: 'GST Return Field / Metric', key: 'metric', width: 38 },
      { header: 'Amount (INR)', key: 'val', width: 22 }
    ];

    const headerRow2 = sheet2.getRow(1);
    headerRow2.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };

    const totalExp = expenses.reduce((s, e) => s + e.amount, 0) / 100;
    const estITC = totalExp * 0.18;
    const netGstPayable = Math.max(0, totalTax - estITC);

    sheet2.addRow({ metric: 'Filing Period', val: `${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()}` });
    sheet2.addRow({ metric: 'Total Outward Taxable Supplies (GSTR-1)', val: totalSub });
    sheet2.addRow({ metric: 'Total Output GST Liability', val: totalTax });
    sheet2.addRow({ metric: 'Output CGST Liability (9%)', val: totalTax / 2 });
    sheet2.addRow({ metric: 'Output SGST Liability (9%)', val: totalTax / 2 });
    sheet2.addRow({ metric: 'Eligible Input Tax Credit (ITC Claimed)', val: estITC });
    const netRow = sheet2.addRow({ metric: 'Net GST Cash Payable (GSTR-3B)', val: netGstPayable });
    netRow.font = { bold: true, color: { argb: 'FF0D9488' } };

    sheet2.eachRow((row, rowNum) => {
      if (rowNum > 2) {
        row.getCell('val').numFmt = '₹#,##0.00';
      }
    });

    // Sheet 3: ITC Expenses
    const sheet3 = workbook.addWorksheet('Input Tax Credit Expenses');
    sheet3.views = [{ showGridLines: true }];

    sheet3.columns = [
      { header: 'Expense Voucher #', key: 'expNo', width: 18 },
      { header: 'Vendor Name', key: 'vendor', width: 28 },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Total Expense (₹)', key: 'amount', width: 18 },
      { header: 'Estimated ITC (18%) (₹)', key: 'itc', width: 22 }
    ];

    const headerRow3 = sheet3.getRow(1);
    headerRow3.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B5CF6' } };

    expenses.forEach(exp => {
      const amt = exp.amount / 100;
      sheet3.addRow({
        expNo: exp.expenseNumber,
        vendor: exp.vendor,
        date: new Date(exp.date).toISOString().split('T')[0],
        amount: amt,
        itc: amt * 0.18
      });
    });

    sheet3.eachRow((row, rowNum) => {
      if (rowNum > 1) {
        row.getCell('amount').numFmt = '₹#,##0.00';
        row.getCell('itc').numFmt = '₹#,##0.00';
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=gstr-return-${new Date().toISOString().split('T')[0]}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Error exporting GST Excel:', err);
    res.status(500).json({ error: 'Failed to export GST Excel file.' });
  }
});

export default router;
