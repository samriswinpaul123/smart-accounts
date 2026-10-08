async function testDownloads() {
  console.log('Testing PDF Invoice download and GST Excel download endpoints...');
  const baseUrl = 'http://localhost:5000';

  try {
    // 1. Register test user
    const rand = Date.now();
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: `dl_tester_${rand}`,
        email: `dl_${rand}@smartledger.io`,
        password: 'secure_password_123'
      })
    });
    const authData = await regRes.json();
    const token = authData.token;
    console.log('Test user registered. Token obtained.');

    // 2. Create a test invoice
    const invRes = await fetch(`${baseUrl}/api/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        invoiceNumber: `INV-DL-${rand}`,
        clientName: 'Acme Test Corp',
        clientEmail: 'billing@acme.com',
        dueDate: new Date().toISOString(),
        items: [{ description: 'PDF Test Item', quantity: 1, unitPrice: 50000 }]
      })
    });
    const invData = await invRes.json();
    console.log(`Invoice created: ${invData.invoiceNumber} (ID: ${invData._id})`);

    // 3. Test PDF Download Route
    console.log(`Testing GET /api/invoices/${invData._id}/download...`);
    const pdfRes = await fetch(`${baseUrl}/api/invoices/${invData._id}/download`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const pdfContentType = pdfRes.headers.get('content-type');
    const pdfDisp = pdfRes.headers.get('content-disposition');
    const pdfBuf = await pdfRes.arrayBuffer();

    console.log(`PDF Response Status: ${pdfRes.status}`);
    console.log(`PDF Content-Type: ${pdfContentType}`);
    console.log(`PDF Content-Disposition: ${pdfDisp}`);
    console.log(`PDF File Buffer Size: ${pdfBuf.byteLength} bytes`);

    if (!pdfRes.ok || !pdfContentType.includes('pdf') || pdfBuf.byteLength < 500) {
      throw new Error('PDF Invoice download failed or buffer too small!');
    }
    console.log('✓ PDF Download Route verified successfully!');

    // 4. Test GST Excel Download Route
    console.log('\nTesting GET /api/reports/gst/gst-excel...');
    const excelRes = await fetch(`${baseUrl}/api/reports/gst/gst-excel`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const excelContentType = excelRes.headers.get('content-type');
    const excelDisp = excelRes.headers.get('content-disposition');
    const excelBuf = await excelRes.arrayBuffer();

    console.log(`Excel Response Status: ${excelRes.status}`);
    console.log(`Excel Content-Type: ${excelContentType}`);
    console.log(`Excel Content-Disposition: ${excelDisp}`);
    console.log(`Excel File Buffer Size: ${excelBuf.byteLength} bytes`);

    if (!excelRes.ok || !excelContentType.includes('spreadsheet') || excelBuf.byteLength < 1000) {
      throw new Error('GST Excel download failed or buffer too small!');
    }
    console.log('✓ GST Excel Download Route verified successfully!');

    console.log('\n==================================================');
    console.log(' ALL DOWNLOAD ROUTES WORKING 100% PERFECTLY!     ');
    console.log('==================================================\n');

  } catch (err) {
    console.error('Download Test Error:', err.message);
    process.exit(1);
  }
}

testDownloads();
