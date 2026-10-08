import React, { useState } from 'react';
import { Palette, Eye, Layout, Check, Sparkles } from 'lucide-react';

export default function InvoiceDesigner() {
  const [templateTheme, setTemplateTheme] = useState('teal'); // 'teal', 'purple', 'emerald', 'slate'
  const [companyName, setCompanyName] = useState('Core Ledger Systems Pvt Ltd');
  const [companyAddress, setCompanyAddress] = useState('Suite 402, Bandra Kurla Complex, Mumbai, MH - 400051');
  const [gstin, setGstin] = useState('27AAACC1234D1ZB');
  const [showGstBreakdown, setShowGstBreakdown] = useState(true);
  const [showPaymentQr, setShowPaymentQr] = useState(true);
  const [termsText, setTermsText] = useState('1. Payment due within 15 days of invoice date. 2. Interest @ 18% p.a. applicable on overdue invoices.');
  const [accentColor, setAccentColor] = useState('#0d9488');
  const [savedSuccess, setSavedSuccess] = useState('');

  const themeColors = {
    teal: '#0d9488',
    purple: '#8b5cf6',
    emerald: '#10b981',
    slate: '#475569'
  };

  const handleSaveDesign = () => {
    localStorage.setItem('custom_invoice_design', JSON.stringify({
      templateTheme,
      companyName,
      companyAddress,
      gstin,
      showGstBreakdown,
      showPaymentQr,
      termsText,
      accentColor
    }));
    setSavedSuccess('Custom Invoice Template layout saved successfully!');
    setTimeout(() => setSavedSuccess(''), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header Banner */}
      <div className="card" style={{ background: 'var(--glass-bg)', border: '1px solid var(--accent)', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Palette size={22} style={{ color: 'var(--accent)' }} />
              Visual Invoice & Report Designer
            </h2>
            <p style={{ margin: '0.3rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Customize visual layouts, brand accents, GST breakdowns, and payment QR codes for PDF bills
            </p>
          </div>
          <button className="btn btn-primary" onClick={handleSaveDesign}>
            <Check size={16} /> Save Design Template
          </button>
        </div>
        {savedSuccess && <div style={{ marginTop: '1rem', color: 'var(--success)', fontWeight: 600 }}>✓ {savedSuccess}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1.5rem' }}>
        
        {/* Left Controls Form */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3>Template Branding & Controls</h3>

          <div className="form-group">
            <label className="form-label">Brand Color Accent</label>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              {Object.keys(themeColors).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTemplateTheme(t);
                    setAccentColor(themeColors[t]);
                  }}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: themeColors[t],
                    border: templateTheme === t ? '3px solid #fff' : 'none',
                    cursor: 'pointer',
                    boxShadow: templateTheme === t ? '0 0 10px ' + themeColors[t] : 'none'
                  }}
                />
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Company / Business Name</label>
            <input
              type="text"
              className="form-control"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Business Address</label>
            <input
              type="text"
              className="form-control"
              value={companyAddress}
              onChange={(e) => setCompanyAddress(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">GSTIN / Tax ID Number</label>
            <input
              type="text"
              className="form-control"
              value={gstin}
              onChange={(e) => setGstin(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Invoice Layout Features</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showGstBreakdown}
                  onChange={(e) => setShowGstBreakdown(e.target.checked)}
                />
                Show Intrastate / Interstate GST Itemization (CGST / SGST / IGST)
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showPaymentQr}
                  onChange={(e) => setShowPaymentQr(e.target.checked)}
                />
                Embed Instant UPI / NetBanking Payment QR Code on PDF
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Terms & Conditions Footer</label>
            <textarea
              className="form-control"
              value={termsText}
              onChange={(e) => setTermsText(e.target.value)}
              rows={3}
              style={{ fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {/* Right Live Preview Sheet */}
        <div className="card" style={{ background: '#ffffff', color: '#0f172a', padding: '2rem', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `3px solid ${accentColor}`, paddingBottom: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ color: accentColor, margin: 0, fontSize: '1.4rem' }}>{companyName}</h2>
              <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.2rem' }}>{companyAddress}</div>
              <div style={{ color: '#0f172a', fontWeight: 600, fontSize: '0.8rem', marginTop: '0.2rem' }}>GSTIN: {gstin}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h3 style={{ margin: 0, color: '#0f172a', letterSpacing: '1px' }}>TAX INVOICE</h3>
              <div style={{ color: '#64748b', fontWeight: 600, marginTop: '0.2rem' }}>INV-2026-8849</div>
              <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Date: {new Date().toLocaleDateString()}</div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
            <div>
              <strong style={{ color: accentColor, textTransform: 'uppercase', fontSize: '0.75rem' }}>Billed To:</strong>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Hooli Tech India Pvt Ltd</div>
              <div style={{ color: '#64748b' }}>billing@hooli.in</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <strong style={{ color: accentColor, textTransform: 'uppercase', fontSize: '0.75rem' }}>Payment Status:</strong>
              <div style={{ color: '#10b981', fontWeight: 700 }}>PAID (Verified Ledger)</div>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem' }}>
            <thead>
              <tr style={{ background: accentColor, color: '#ffffff', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '0.5rem', textAlign: 'left' }}>Item Description</th>
                <th style={{ padding: '0.5rem', textAlign: 'right' }}>Qty</th>
                <th style={{ padding: '0.5rem', textAlign: 'right' }}>Rate (₹)</th>
                <th style={{ padding: '0.5rem', textAlign: 'right' }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '0.5rem' }}>Enterprise SaaS Subscription & Cloud Setup</td>
                <td style={{ padding: '0.5rem', textAlign: 'right' }}>1</td>
                <td style={{ padding: '0.5rem', textAlign: 'right' }}>50,000.00</td>
                <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600 }}>50,000.00</td>
              </tr>
              {showGstBreakdown && (
                <>
                  <tr style={{ borderBottom: '1px solid #f1f5f9', color: '#64748b', fontStyle: 'italic', fontSize: '0.8rem' }}>
                    <td style={{ padding: '0.4rem' }}>Output CGST @ 9%</td>
                    <td></td><td></td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', fontWeight: 600 }}>4,500.00</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9', color: '#64748b', fontStyle: 'italic', fontSize: '0.8rem' }}>
                    <td style={{ padding: '0.4rem' }}>Output SGST @ 9%</td>
                    <td></td><td></td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', fontWeight: 600 }}>4,500.00</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `2px solid ${accentColor}`, paddingTop: '1rem' }}>
            <div style={{ width: '60%' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Terms & Notes:</div>
              <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.25rem' }}>{termsText}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Grand Total:</div>
              <div style={{ color: accentColor, fontSize: '1.4rem', fontWeight: 800 }}>₹59,000.00</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
