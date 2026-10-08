import React, { useState } from 'react';
import { ShoppingBag, Check, ExternalLink, RefreshCw, Zap } from 'lucide-react';

export default function AppMarketplace({ token }) {
  const [apps, setApps] = useState([
    { id: 'shopify', name: 'Shopify Store Connector', category: 'E-Commerce', status: 'Connected', desc: 'Sync online orders, customer data, and sales receipts directly into general ledger sales accounts.' },
    { id: 'woocommerce', name: 'WooCommerce Plug & Play', category: 'E-Commerce', status: 'Available', desc: 'Automatic two-way sync for WordPress WooCommerce transactions and tax invoices.' },
    { id: 'salesforce', name: 'Salesforce CRM Integration', category: 'CRM', status: 'Available', desc: 'Convert closed-won Salesforce opportunities into draft ledger invoices automatically.' },
    { id: 'hubspot', name: 'HubSpot Sales Sync', category: 'CRM', status: 'Connected', desc: 'Sync deal stages, contact email billing profiles, and customer invoice payment status.' },
    { id: 'stripe', name: 'Stripe Global Gateway', category: 'Payments', status: 'Connected', desc: 'Instant credit card reconciliation and payment link generation on invoice bills.' },
    { id: 'whatsapp', name: 'WhatsApp Business Reminders', category: 'Automation', status: 'Available', desc: 'Send automated PDF invoices and past-due payment follow-ups via WhatsApp API.' },
    { id: 'icici', name: 'ICICI / HDFC Direct Bank Feed', category: 'Banking', status: 'Available', desc: 'Automatic bank statement retrieval and double-entry bank reconciliation feed.' },
  ]);

  const [modalApp, setModalApp] = useState(null);
  const [apiKeyName, setApiKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');

  const handleToggleConnect = async (appId) => {
    setApps(apps.map(a => {
      if (a.id === appId) {
        const nextStatus = a.status === 'Connected' ? 'Available' : 'Connected';
        return { ...a, status: nextStatus };
      }
      return a;
    }));
  };

  const handleGenerateKey = async () => {
    if (!apiKeyName) return;
    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: apiKeyName })
      });
      const data = await res.json();
      if (res.ok) {
        setGeneratedKey(data.rawKey);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header Banner */}
      <div className="card" style={{ background: 'var(--glass-bg)', border: '1px solid var(--accent)', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <ShoppingBag size={22} style={{ color: 'var(--accent)' }} />
              Developer Ecosystem & App Marketplace
            </h2>
            <p style={{ margin: '0.3rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Connect 1-click integrations for CRMs, E-Commerce, POS systems, and Bank feeds via Open REST APIs
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setModalApp({ name: 'Developer REST API Key' })}>
            <Zap size={16} /> Generate Developer REST API Key
          </button>
        </div>
      </div>

      {/* App Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {apps.map((app) => (
          <div key={app.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: app.status === 'Connected' ? '3px solid var(--success)' : '1px solid var(--border-color)' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-purple)', background: 'rgba(139, 92, 246, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                  {app.category}
                </span>
                <span className={`badge badge-${app.status === 'Connected' ? 'paid' : 'draft'}`}>
                  {app.status}
                </span>
              </div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>{app.name}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.4' }}>{app.desc}</p>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem' }}>
              <button 
                className={`btn ${app.status === 'Connected' ? 'btn-secondary' : 'btn-primary'}`} 
                style={{ flex: 1, fontSize: '0.8rem' }}
                onClick={() => handleToggleConnect(app.id)}
              >
                {app.status === 'Connected' ? 'Disconnect' : 'Connect 1-Click'}
              </button>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '0.4rem 0.6rem' }}
                onClick={() => setModalApp(app)}
              >
                <ExternalLink size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Dialog */}
      {modalApp && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div className="card" style={{ width: '450px', background: '#0f172a', border: '1px solid var(--accent)', padding: '1.5rem' }}>
            <h3>Configure Integration: {modalApp.name}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.5rem 0 1.5rem 0' }}>
              Generate an active <code style={{ color: 'var(--accent)' }}>X-API-KEY</code> for two-way automated data sync.
            </p>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Integration Client Name</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. Production Salesforce Webhook" 
                value={apiKeyName}
                onChange={(e) => setApiKeyName(e.target.value)}
              />
            </div>

            {generatedKey && (
              <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--success)', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 700 }}>REST API Key Generated (Copy Now):</div>
                <code style={{ fontSize: '0.85rem', color: '#fff', wordBreak: 'break-all', display: 'block', marginTop: '0.25rem' }}>{generatedKey}</code>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => { setModalApp(null); setGeneratedKey(''); }}>Close</button>
              <button className="btn btn-primary btn-sm" onClick={handleGenerateKey}>Generate Token</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
