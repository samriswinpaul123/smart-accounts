import PDFDocument from 'pdfkit';

/**
 * Generates an Enterprise Tax Invoice PDF and pipes to response stream.
 * @param {Object} invoice - Populate Invoice document from MongoDB.
 * @param {Object} res - Express response stream.
 */
export function generateInvoicePDF(invoice, res) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  doc.pipe(res);

  const primaryColor = '#0f172a'; // slate-900
  const secondaryColor = '#475569'; // slate-600
  const accentColor = '#0d9488'; // teal-600
  const lightBg = '#f8fafc'; // slate-50
  const gridColor = '#cbd5e1'; // slate-300

  // 1. Header & Corporate Branding
  doc.fillColor(primaryColor)
     .font('Helvetica-Bold')
     .fontSize(20)
     .text('CORE LEDGER ENTERPRISE SUITE', 40, 40)
     .font('Helvetica')
     .fontSize(8.5)
     .fillColor(secondaryColor)
     .text('GSTIN: 27AAAAA0000A1Z5 | Corporate Accounting & Tax Hub', 40, 63)
     .text('100 Financial District Tower, Suite 1200, Mumbai 400051', 40, 75)
     .text('billing@coreledger.io | +91 22 5550 1999', 40, 87);

  // Title Right Aligned
  doc.font('Helvetica-Bold')
     .fontSize(22)
     .fillColor(accentColor)
     .text('TAX INVOICE', 350, 38, { align: 'right' });

  // Divider Line
  doc.strokeColor(accentColor)
     .lineWidth(2)
     .moveTo(40, 105)
     .lineTo(555, 105)
     .stroke();

  // 2. Client Info & Invoice Meta Grid
  const metaY = 118;
  doc.font('Helvetica-Bold')
     .fillColor(primaryColor)
     .fontSize(10)
     .text('BILLED TO:', 40, metaY)
     .font('Helvetica-Bold')
     .fontSize(9.5)
     .fillColor(secondaryColor)
     .text(invoice.clientName, 40, metaY + 14)
     .font('Helvetica')
     .fontSize(8.5)
     .text(`Email: ${invoice.clientEmail}`, 40, metaY + 27)
     .text(`GSTIN: ${invoice.clientGstin || '27AAACC9988E1Z4'}`, 40, metaY + 39)
     .text(`Address: ${invoice.clientAddress || 'Corporate Plaza, Suite 402'}`, 40, metaY + 51, { width: 220 });

  const rightX = 330;
  doc.font('Helvetica-Bold')
     .fillColor(primaryColor)
     .fontSize(9)
     .text('Invoice Number:', rightX, metaY)
     .text('Invoice Date:', rightX, metaY + 14)
     .text('Payment Terms:', rightX, metaY + 28)
     .text('Payment Due:', rightX, metaY + 42)
     .text('Invoice Status:', rightX, metaY + 56);

  doc.font('Helvetica')
     .fillColor(secondaryColor)
     .fontSize(9)
     .text(invoice.invoiceNumber, rightX + 90, metaY, { align: 'right', width: 135 })
     .text(new Date(invoice.date).toLocaleDateString(), rightX + 90, metaY + 14, { align: 'right', width: 135 })
     .text(invoice.paymentTerms || 'Net 30 Days', rightX + 90, metaY + 28, { align: 'right', width: 135 })
     .text(new Date(invoice.dueDate).toLocaleDateString(), rightX + 90, metaY + 42, { align: 'right', width: 135 });

  const statusColor = invoice.status === 'Paid' ? '#15803d' : invoice.status === 'Sent' ? '#1d4ed8' : '#b45309';
  doc.font('Helvetica-Bold')
     .fillColor(statusColor)
     .text(invoice.status.toUpperCase(), rightX + 90, metaY + 56, { align: 'right', width: 135 });

  // 3. Itemized Tax Table
  const tableTop = 205;
  doc.rect(40, tableTop, 515, 20).fill(lightBg);

  doc.font('Helvetica-Bold')
     .fontSize(8.5)
     .fillColor(primaryColor)
     .text('Item Description', 48, tableTop + 5)
     .text('HSN/SAC', 240, tableTop + 5, { width: 50, align: 'center' })
     .text('Qty', 295, tableTop + 5, { width: 30, align: 'right' })
     .text('Unit Rate', 330, tableTop + 5, { width: 60, align: 'right' })
     .text('Tax Rate', 395, tableTop + 5, { width: 50, align: 'right' })
     .text('Amount (INR)', 450, tableTop + 5, { width: 95, align: 'right' });

  doc.strokeColor(gridColor).lineWidth(1).moveTo(40, tableTop + 20).lineTo(555, tableTop + 20).stroke();

  let itemY = tableTop + 25;
  let subtotalCents = 0;
  let taxCents = 0;

  invoice.items.forEach((item, index) => {
    const qty = item.quantity;
    const price = item.unitPrice / 100;
    const taxRate = item.taxRatePercent !== undefined ? item.taxRatePercent : 18;
    const lineRaw = qty * price;
    const lineTax = lineRaw * (taxRate / 100);
    const lineTotal = lineRaw + lineTax;

    subtotalCents += Math.round(lineRaw * 100);
    taxCents += Math.round(lineTax * 100);

    if (index % 2 === 1) {
      doc.rect(40, itemY - 3, 515, 18).fill('#f1f5f9');
    }

    doc.font('Helvetica')
       .fontSize(8.5)
       .fillColor(primaryColor)
       .text(item.description, 48, itemY, { width: 185 })
       .text(item.hsnCode || '998311', 240, itemY, { width: 50, align: 'center' })
       .text(qty.toString(), 295, itemY, { width: 30, align: 'right' })
       .text(`₹${price.toFixed(2)}`, 330, itemY, { width: 60, align: 'right' })
       .text(`${taxRate}%`, 395, itemY, { width: 50, align: 'right' })
       .text(`₹${lineTotal.toFixed(2)}`, 450, itemY, { width: 95, align: 'right' });

    itemY += 20;
  });

  doc.strokeColor(gridColor).lineWidth(1).moveTo(40, itemY + 2).lineTo(555, itemY + 2).stroke();

  // 4. Totals Summary & UPI Payment Box
  const summaryY = itemY + 15;
  
  // UPI QR & Bank Box Left
  doc.rect(40, summaryY, 260, 95).fill('#f8fafc');
  doc.strokeColor('#cbd5e1').rect(40, summaryY, 260, 95).stroke();

  doc.font('Helvetica-Bold')
     .fontSize(9)
     .fillColor(accentColor)
     .text('⚡ INSTANT UPI / BANK PAYMENT:', 50, summaryY + 8)
     .font('Helvetica')
     .fontSize(8)
     .fillColor(secondaryColor)
     .text('Bank: ICICI Corporate Bank', 50, summaryY + 25)
     .text('Account No: 000405019283 (IFSC: ICIC0000004)', 50, summaryY + 38)
     .text('UPI Virtual ID: billing@smartledger', 50, summaryY + 51)
     .text(`UPI Amount Link: upi://pay?am=${(invoice.totalAmount / 100).toFixed(2)}`, 50, summaryY + 66, { width: 240 });

  // Totals Box Right
  const totX = 330;
  const grandTotalVal = invoice.totalAmount / 100;
  const subTotalVal = (invoice.subtotalAmount || subtotalCents) / 100;
  const taxTotalVal = (invoice.taxAmount || taxCents) / 100;
  const cgstVal = taxTotalVal / 2;
  const sgstVal = taxTotalVal / 2;

  doc.font('Helvetica')
     .fontSize(8.5)
     .fillColor(secondaryColor)
     .text('Subtotal:', totX, summaryY + 5)
     .text(`₹${subTotalVal.toFixed(2)}`, totX + 90, summaryY + 5, { align: 'right', width: 135 })
     .text('CGST (9%):', totX, summaryY + 20)
     .text(`₹${cgstVal.toFixed(2)}`, totX + 90, summaryY + 20, { align: 'right', width: 135 })
     .text('SGST (9%):', totX, summaryY + 35)
     .text(`₹${sgstVal.toFixed(2)}`, totX + 90, summaryY + 35, { align: 'right', width: 135 });

  doc.strokeColor(gridColor).lineWidth(1).moveTo(totX, summaryY + 52).lineTo(555, summaryY + 52).stroke();

  doc.font('Helvetica-Bold')
     .fontSize(11)
     .fillColor(primaryColor)
     .text('GRAND TOTAL:', totX, summaryY + 58)
     .fillColor(accentColor)
     .text(`₹${grandTotalVal.toFixed(2)}`, totX + 90, summaryY + 58, { align: 'right', width: 135 });

  // 5. Terms & Signature Footer
  const footerY = summaryY + 115;
  doc.font('Helvetica-Bold')
     .fontSize(8.5)
     .fillColor(primaryColor)
     .text('TERMS & CONDITIONS:', 40, footerY)
     .font('Helvetica')
     .fontSize(7.5)
     .fillColor(secondaryColor)
     .text('1. Payment is due within standard credit terms. Interest @ 18% p.a. charged on overdue bills.', 40, footerY + 12)
     .text('2. Computer-generated tax invoice. Requires no physical signature under IT Act 2000.', 40, footerY + 23);

  doc.font('Helvetica-Bold')
     .fontSize(8.5)
     .fillColor(primaryColor)
     .text('For CORE LEDGER SYSTEMS', 380, footerY, { align: 'right', width: 175 })
     .font('Helvetica-Oblique')
     .fontSize(7.5)
     .fillColor(secondaryColor)
     .text('Authorized Finance Signatory', 380, footerY + 25, { align: 'right', width: 175 });

  doc.end();
}
