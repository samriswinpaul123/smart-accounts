// Using native global fetch in Node v24

async function runE2ETest() {
  console.log('Starting MERN accounting engine E2E integration test...');
  const baseUrl = 'http://localhost:5000';
  
  try {
    // 1. Register User
    console.log('\n[1/6] Registering new accounting tenant...');
    const rand = Date.now();
    const registerRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: `e2eaccountant_${rand}`,
        email: `e2e_${rand}@smartledger.io`,
        password: 'secure_ledger_password_123'
      })
    });
    
    if (!registerRes.ok) {
      throw new Error(`Register failed: ${await registerRes.text()}`);
    }
    const authData = await registerRes.json();
    const token = authData.token;
    const userId = authData.user.id;
    console.log(`Tenant registered successfully! User ID: ${userId}`);

    // 2. Fetch seeded Chart of Accounts
    console.log('\n[2/6] Verifying auto-seeded Chart of Accounts...');
    const accountsRes = await fetch(`${baseUrl}/api/accounts`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const accounts = await accountsRes.json();
    console.log(`Found ${accounts.length} seeded accounts.`);
    
    const accountMap = {};
    accounts.forEach(acc => {
      accountMap[acc.code] = acc._id;
      console.log(` - ${acc.code}: ${acc.name} (${acc.type})`);
    });

    // 3. Create a Draft Invoice
    console.log('\n[3/6] Creating a new sales invoice draft...');
    const invoiceRes = await fetch(`${baseUrl}/api/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        invoiceNumber: 'INV-E2E-99',
        clientName: 'Wylands Corp',
        clientEmail: 'billing@wylands.com',
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        items: [
          { description: 'Database audit services', quantity: 2, unitPrice: 50000, taxRatePercent: 0 }, // $500.00 each -> $1000.00
          { description: 'Cloud setup consulting', quantity: 1, unitPrice: 25000, taxRatePercent: 0 }   // $250.00 each -> $250.00
        ]
      })
    });
    const invoice = await invoiceRes.json();
    console.log(`Invoice Draft created: ${invoice.invoiceNumber}. Total: $${(invoice.totalAmount / 100).toFixed(2)}`);

    // 4. Finalize Invoice (Send) and Record Payment (Pay)
    console.log('\n[4/6] Finalizing invoice (posting DR Accounts Receivable, CR Sales Revenue)...');
    const sendRes = await fetch(`${baseUrl}/api/invoices/${invoice._id}/send`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const sentInvoice = await sendRes.json();
    console.log(`Invoice status updated to: ${sentInvoice.status}. Sales Journal: ${sentInvoice.salesJournalEntry}`);

    console.log('Recording invoice full payment settlement (posting DR Cash & Bank, CR Accounts Receivable)...');
    const payRes = await fetch(`${baseUrl}/api/invoices/${invoice._id}/pay`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const paidInvoice = await payRes.json();
    console.log(`Invoice status updated to: ${paidInvoice.status}. Payment Journal: ${paidInvoice.paymentJournalEntry}`);

    // 5. Log an Expense
    console.log('\n[5/6] Logging a rent expense (posting DR Rent Expense, CR Cash & Bank)...');
    const expenseRes = await fetch(`${baseUrl}/api/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        expenseNumber: 'EXP-E2E-01',
        vendor: 'Apex Offices',
        date: new Date().toISOString(),
        category: accountMap['5000'], // Rent Expense
        paymentAccount: accountMap['1010'], // Cash & Bank
        amount: 50000, // $500.00 (50000 cents)
        description: 'July Office Space Lease',
        status: 'Paid'
      })
    });
    const expense = await expenseRes.json();
    console.log(`Expense logged successfully: ${expense.expenseNumber} for $${(expense.amount / 100).toFixed(2)}. Journal: ${expense.journalEntry}`);

    // 6. Verify Reports (Profit & Loss and Balance Sheet)
    console.log('\n[6/6] Requesting statements and auditing double-entry integrity...');
    
    // Profit and Loss
    const plRes = await fetch(`${baseUrl}/api/reports/profit-and-loss`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const pl = await plRes.json();
    console.log('\n--- Profit & Loss Statement (Aggregated) ---');
    console.log(`Total Revenue: $${(pl.revenue.total / 100).toFixed(2)}`);
    console.log(`Total Expenses: $${(pl.expense.total / 100).toFixed(2)}`);
    console.log(`Net income: $${(pl.netIncome / 100).toFixed(2)}`);
    
    if (pl.revenue.total !== 125000 || pl.expense.total !== 50000 || pl.netIncome !== 75000) {
      throw new Error('Profit & Loss statement aggregation mismatch!');
    }
    console.log('✓ Profit & Loss statement figures verify correctly.');

    // Balance Sheet
    const bsRes = await fetch(`${baseUrl}/api/reports/balance-sheet`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const bs = await bsRes.json();
    console.log('\n--- Balance Sheet (Aggregated) ---');
    console.log(`Total Assets: $${(bs.assets.total / 100).toFixed(2)}`);
    console.log(`Total Liabilities: $${(bs.liabilities.total / 100).toFixed(2)}`);
    console.log(`Total Owner's Equity: $${(bs.equity.total / 100).toFixed(2)}`);
    console.log(`Balanced Equation Check: ${bs.isBalanced ? 'BALANCED' : 'UNBALANCED'}`);
    
    if (!bs.isBalanced || bs.assets.total !== 75000 || bs.equity.total !== 75000) {
      throw new Error('Balance Sheet does not balance or totals mismatch!');
    }
    console.log('✓ Balance Sheet matches Assets = Liabilities + Equity perfectly.');

    // PDF Download Stream check
    console.log('\nVerifying PDF streaming download route...');
    const pdfRes = await fetch(`${baseUrl}/api/invoices/${invoice._id}/download`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!pdfRes.ok || pdfRes.headers.get('content-type') !== 'application/pdf') {
      throw new Error('Failed to stream PDF invoice!');
    }
    const pdfLength = (await pdfRes.arrayBuffer()).byteLength;
    console.log(`✓ Invoice PDF received successfully! Size: ${pdfLength} bytes`);

    console.log('\n==================================================');
    console.log(' SUCCESS: End-to-End Accounting Flow Verified!    ');
    console.log('==================================================\n');

  } catch (err) {
    console.error('\nE2E Test Failure:', err.message);
    process.exit(1);
  }
}

runE2ETest();
