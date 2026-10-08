import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(process.cwd(), '..');
const outputPdfPath = 'C:/Users/SAMRISWINPAUL/.gemini/antigravity/brain/d77ae321-51b4-4ed8-bd07-b2e974bba383/smart-accounts-full-codebook.pdf';

const filesToInclude = [
  'backend/src/server.js',
  'backend/src/app.js',
  'backend/src/utils/db.js',
  'backend/src/models/Account.js',
  'backend/src/models/JournalEntry.js',
  'backend/src/models/Invoice.js',
  'backend/src/models/Expense.js',
  'backend/src/routes/auth.js',
  'backend/src/routes/accounts.js',
  'backend/src/routes/ledger.js',
  'backend/src/routes/invoices.js',
  'backend/src/routes/expenses.js',
  'backend/src/routes/reports.js',
  'backend/src/routes/gstReports.js',
  'frontend/src/App.jsx',
  'frontend/src/components/AnalyticsPanel.jsx',
  'frontend/src/components/InvoiceBuilder.jsx',
  'frontend/src/components/ExpenseLogger.jsx',
  'frontend/src/components/GstTaxReport.jsx',
  'frontend/vite.config.js'
];

async function generatePDF() {
  const doc = new PDFDocument({ margin: 36, size: 'A4', autoFirstPage: true });
  const writeStream = fs.createWriteStream(outputPdfPath);
  doc.pipe(writeStream);

  // Title Page
  doc.rect(0, 0, doc.page.width, doc.page.height).fill('#0f172a');
  
  doc.fillColor('#38bdf8').fontSize(26).text('SMART ACCOUNTS', 54, 200, { align: 'center' });
  doc.fillColor('#94a3b8').fontSize(16).text('Full Source Code Documentation & Implementation Reference', { align: 'center' });
  doc.moveDown(2);
  doc.fillColor('#f8fafc').fontSize(11).text('MERN Stack Double-Entry Ledger & Invoice Engine', { align: 'center' });
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });

  // Table of Contents
  doc.addPage();
  doc.fillColor('#0f172a').fontSize(20).text('Table of Contents', { underline: true });
  doc.moveDown();

  filesToInclude.forEach((file, index) => {
    doc.fillColor('#2563eb').fontSize(11).text(`${index + 1}. ${file}`);
  });

  // Source Files Sections
  for (const relativePath of filesToInclude) {
    const fullPath = path.join(projectRoot, relativePath);
    if (!fs.existsSync(fullPath)) {
      console.log(`Skipping missing file: ${fullPath}`);
      continue;
    }

    doc.addPage();
    
    // Header banner
    doc.rect(36, 36, doc.page.width - 72, 28).fill('#1e293b');
    doc.fillColor('#38bdf8').fontSize(12).text(` FILE: ${relativePath}`, 44, 44);

    doc.moveDown(2);

    const code = fs.readFileSync(fullPath, 'utf8');
    const lines = code.split('\n');

    doc.font('Courier').fontSize(8).fillColor('#334155');

    lines.forEach((line, i) => {
      const lineNumberStr = String(i + 1).padStart(4, ' ') + ' | ';
      doc.text(lineNumberStr + line, { width: doc.page.width - 72, lineBreak: true });
    });
  }

  doc.end();

  return new Promise((resolve) => {
    writeStream.on('finish', () => resolve(true));
  });
}

generatePDF().then(() => {
  console.log('PDF generation complete!');
}).catch(err => {
  console.error('Error generating PDF:', err);
});
