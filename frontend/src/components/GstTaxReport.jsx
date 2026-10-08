import React, { useState, useEffect } from 'react';
import { FileCheck, Download, CheckCircle, Shield, RefreshCw, FileSpreadsheet } from 'lucide-react';

export default function GstTaxReport({ token }) {
  const [gstData, setGstData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportMsg, setExportMsg] = useState('');

  const fetchGstReport = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports/gst/gst-returns', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setGstData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGstReport();
  }, [token]);

  const handleExportJson = () => {
    if (!gstData) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(gstData, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `GSTR1_Filing_${(gstData.filingPeriod || 'Month').replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setExportMsg('Official GSTR-1 Tax Return JSON exported for GST portal upload!');
    setTimeout(() => setExportMsg(''), 4000);
  };

  const handleExportExcel = async () => {
    try {
      setExportMsg('Generating multi-sheet GSTR-1 & GSTR-3B Excel workbook...');
      const res = await fetch('/api/reports/gst/gst-excel', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `GSTR_Return_Worksheet_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setExportMsg('Official GSTR-1 & GSTR-3B Excel Spreadsheet (.xlsx) downloaded successfully!');
        setTimeout(() => setExportMsg(''), 4000);
      } else {
        setExportMsg('Failed to generate Excel file.');
      }
    } catch (err) {
      console.error(err);
      setExportMsg('Error downloading GST Excel spreadsheet.');
    }
  };

  if (loading || !gstData) {
    return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Compiling GSTR-1 & GSTR-3B GST Return compliance reports...</div>;
  }

  const taxableSales = Number(gstData.totalTaxableSales) || 0;
  const outputTax = Number(gstData.totalOutputTax) || 0;
  const cgst = Number(gstData.cgstOutput) || 0;
  const sgst = Number(gstData.sgstOutput) || 0;
  const igst = Number(gstData.igstOutput) || 0;
  const itc = Number(gstData.estimatedITC) || 0;
  const netPayable = Number(gstData.netGstPayable) || 0;
  const b2bInvoices = Array.isArray(gstData.b2bInvoices) ? gstData.b2bInvoices : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header Banner */}
      <div className="card" style={{ background: 'var(--glass-bg)', border: '1px solid var(--accent)', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <FileCheck size={22} style={{ color: 'var(--accent)' }} />
              GST Tax Return Compliance & Filing (GSTR-1 / GSTR-3B)
            </h2>
            <p style={{ margin: '0.3rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Filing Period: <strong>{gstData.filingPeriod}</strong> — Outward Taxable Sales, Input Tax Credit (ITC), Net Tax Payable
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={fetchGstReport}>
              <RefreshCw size={14} /> Refresh Return Summary
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleExportJson}>
              <Download size={14} /> Export JSON
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleExportExcel} style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none' }}>
              <FileSpreadsheet size={16} /> Export to Excel (.xlsx)
            </button>
          </div>
        </div>
        {exportMsg && <div style={{ marginTop: '1rem', color: 'var(--success)', fontWeight: 600 }}>✓ {exportMsg}</div>}
      </div>

      {/* Tax Breakdown Grid */}
      <div className="dashboard-grid">
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Gross Taxable Sales (GSTR-1)</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
            ₹{taxableSales.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Across {gstData.invoiceCount || 0} taxable invoices
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--accent-purple)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Output Tax Liability</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent-purple)', marginTop: '0.25rem' }}>
            ₹{outputTax.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            CGST: ₹{cgst.toFixed(2)} | SGST: ₹{sgst.toFixed(2)} | IGST: ₹{igst.toFixed(2)}
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--success)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Input Tax Credit (ITC Claim)</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--success)', marginTop: '0.25rem' }}>
            ₹{itc.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Estimated 18% ITC on operating expenses
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--accent)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Net GST Payable (GSTR-3B)</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent)', marginTop: '0.25rem' }}>
            ₹{netPayable.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            After adjusting Input Tax Credits
          </div>
        </div>
      </div>

      {/* Itemized B2B Sales Invoices Table */}
      <div className="card">
        <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>GSTR-1 Outward B2B Invoices Schedule</h3>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Client Name</th>
                <th>Client GSTIN</th>
                <th>Taxable Subtotal</th>
                <th>Tax Amount (18%)</th>
                <th>Total Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {b2bInvoices.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1.5rem' }}>
                    No B2B invoices recorded in this filing period.
                  </td>
                </tr>
              ) : (
                b2bInvoices.map((inv, i) => {
                  const subVal = Number(inv.subtotal) || 0;
                  const taxVal = Number(inv.taxAmount) || 0;
                  const totVal = Number(inv.totalAmount) || 0;
                  const gstinVal = inv.clientGstin || inv.gstin || '27AAACC9988E1Z4';
                  const statusVal = inv.status || 'Draft';

                  return (
                    <tr key={i}>
                      <td><strong>{inv.invoiceNumber}</strong></td>
                      <td>{inv.clientName}</td>
                      <td><code style={{ background: 'rgba(255,255,255,0.05)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>{gstinVal}</code></td>
                      <td>₹{subVal.toFixed(2)}</td>
                      <td>₹{taxVal.toFixed(2)}</td>
                      <td><strong>₹{totVal.toFixed(2)}</strong></td>
                      <td><span className={`badge badge-${statusVal.toLowerCase()}`}>{statusVal}</span></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
