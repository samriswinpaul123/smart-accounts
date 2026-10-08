import React, { useState, useEffect } from 'react';
import { Landmark, CheckCircle, AlertTriangle, ArrowUpRight, ArrowDownLeft, RefreshCw } from 'lucide-react';

export default function BankReconciliation({ token }) {
  const [bankData, setBankData] = useState({ bankFeeds: [], journalEntries: [], reconciledCount: 0, unreconciledCount: 0 });
  const [loading, setLoading] = useState(true);
  const [reconcileMsg, setReconcileMsg] = useState('');

  const fetchBankFeeds = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bank-reconciliation/feeds', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setBankData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBankFeeds();
  }, [token]);

  const handleReconcile = async (bankTxnId, journalId) => {
    try {
      const res = await fetch('/api/bank-reconciliation/reconcile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bankTxnId, journalEntryId: journalId })
      });
      const data = await res.json();
      if (res.ok) {
        setReconcileMsg(`Bank Feed Statement line ${bankTxnId} successfully matched and reconciled with General Ledger!`);
        fetchBankFeeds();
        setTimeout(() => setReconcileMsg(''), 3000);
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
              <Landmark size={22} style={{ color: 'var(--accent)' }} />
              Direct Bank Feed & Reconciliation Engine
            </h2>
            <p style={{ margin: '0.3rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Automated reconciliation of ICICI & HDFC corporate bank statement lines against ledger journal entries
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetchBankFeeds}>
            <RefreshCw size={14} /> Refresh Feeds
          </button>
        </div>
        {reconcileMsg && <div style={{ marginTop: '1rem', color: 'var(--success)', fontWeight: 600 }}>✓ {reconcileMsg}</div>}
      </div>

      {/* Reconciliation KPI Metrics */}
      <div className="dashboard-grid">
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Bank Statement Lines:</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '0.25rem' }}>{bankData.bankFeeds.length}</div>
        </div>
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--success)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Reconciled Statement Lines:</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--success)', marginTop: '0.25rem' }}>{bankData.reconciledCount}</div>
        </div>
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--warning)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Pending Bank Reconciliations:</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--warning)', marginTop: '0.25rem' }}>{bankData.unreconciledCount}</div>
        </div>
      </div>

      {/* Bank Statement Feed List */}
      <div className="card">
        <h3>Live Corporate Bank Statement Feeds</h3>
        <div className="table-wrapper" style={{ marginTop: '1rem' }}>
          <table>
            <thead>
              <tr>
                <th>Txn ID</th>
                <th>Bank / Account</th>
                <th>Date</th>
                <th>Flow</th>
                <th>Statement Narration</th>
                <th>Amount (₹)</th>
                <th>Reconciliation Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {bankData.bankFeeds.map((feed) => (
                <tr key={feed.id}>
                  <td><code>{feed.id}</code></td>
                  <td><strong>{feed.bankName}</strong><br/><span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{feed.accountNumber}</span></td>
                  <td>{feed.date}</td>
                  <td>
                    {feed.type === 'CREDIT' ? (
                      <span style={{ color: 'var(--success)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                        <ArrowDownLeft size={14} /> CREDIT
                      </span>
                    ) : (
                      <span style={{ color: 'var(--danger)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                        <ArrowUpRight size={14} /> DEBIT
                      </span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{feed.description}</td>
                  <td><strong>₹{(feed.amount / 100).toFixed(2)}</strong></td>
                  <td>
                    {feed.matched ? (
                      <span className="badge badge-paid" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <CheckCircle size={12} /> RECONCILED
                      </span>
                    ) : (
                      <span className="badge badge-unpaid" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <AlertTriangle size={12} /> UNRECONCILED
                      </span>
                    )}
                  </td>
                  <td>
                    {!feed.matched ? (
                      <button className="btn btn-primary btn-sm" style={{ fontSize: '0.75rem' }} onClick={() => handleReconcile(feed.id)}>
                        Match & Reconcile
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Verified</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
