import React, { useState, useEffect } from 'react';
import { Book, Filter, RefreshCw } from 'lucide-react';

export default function LedgerView({ token, refreshTrigger }) {
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterAccount, setFilterAccount] = useState('');
  const [accounts, setAccounts] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [ledgerRes, accRes] = await Promise.all([
        fetch('/api/ledger', { headers }),
        fetch('/api/accounts', { headers })
      ]);

      const ledgerData = await ledgerRes.json();
      const accData = await accRes.json();

      if (ledgerRes.ok) setLedgerEntries(ledgerData);
      if (accRes.ok) setAccounts(accData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, refreshTrigger]);

  // Filter entries if a specific account is selected
  const filteredEntries = filterAccount
    ? ledgerEntries.filter(entry => 
        entry.journalLines.some(line => line.account?._id === filterAccount)
      )
    : ledgerEntries;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2>General Journal & Bookkeeping Ledger</h2>
            <p>Chronological history of immutable ledger adjustments</p>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={16} style={{ color: 'var(--text-secondary)' }} />
              <select 
                className="form-control" 
                value={filterAccount} 
                onChange={(e) => setFilterAccount(e.target.value)}
                style={{ width: '220px', padding: '0.5rem 0.75rem' }}
              >
                <option value="">-- All Accounts --</option>
                {accounts.map(acc => (
                  <option key={acc._id} value={acc._id}>
                    {acc.code} - {acc.name}
                  </option>
                ))}
              </select>
            </div>
            
            <button className="btn btn-secondary btn-sm" onClick={fetchData} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              Reload
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          {filteredEntries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              No transactions posted to the general ledger yet.
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <div 
                key={entry._id} 
                className="card" 
                style={{ 
                  background: 'var(--glass-bg)', 
                  borderLeft: '4px solid var(--accent)', 
                  marginBottom: '1.5rem',
                  padding: '1.25rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Date: <strong style={{ color: 'var(--text-primary)' }}>{new Date(entry.date).toLocaleString()}</strong>
                    </span>
                    <span style={{ marginLeft: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Ref: <span style={{ color: 'var(--accent-purple)', fontWeight: 600 }}>{entry.reference || 'N/A'}</span>
                    </span>
                  </div>
                  <strong style={{ fontSize: '0.95rem' }}>{entry.description}</strong>
                </div>

                {/* Double Entry Grid layout */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {/* Table Header for this entry */}
                  <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr', paddingBottom: '0.25rem', borderBottom: '1px dotted var(--border-color)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    <span>Account Accountancy Classification</span>
                    <span style={{ textAlign: 'right' }}>Debit (DR)</span>
                    <span style={{ textAlign: 'right' }}>Credit (CR)</span>
                  </div>

                  {/* Debit Lines First */}
                  {entry.journalLines
                    .filter(line => line.debit > 0)
                    .map((line, idx) => (
                      <div key={`dr-${idx}`} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr', padding: '0.25rem 0', fontSize: '0.95rem' }}>
                        <span>
                          <strong style={{ color: 'var(--text-primary)' }}>{line.account?.code}</strong>
                          <span style={{ marginLeft: '0.5rem', color: 'var(--text-secondary)' }}>{line.account?.name}</span>
                        </span>
                        <span className="text-debit" style={{ textAlign: 'right' }}>
                          ₹{(line.debit / 100).toFixed(2)}
                        </span>
                        <span style={{ textAlign: 'right', color: 'var(--border-color)' }}>-</span>
                      </div>
                    ))}

                  {/* Credit Lines Indented */}
                  {entry.journalLines
                    .filter(line => line.credit > 0)
                    .map((line, idx) => (
                      <div key={`cr-${idx}`} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr', padding: '0.25rem 0', fontSize: '0.95rem' }}>
                        <span style={{ paddingLeft: '2rem' }}>
                          <strong style={{ color: 'var(--text-primary)' }}>{line.account?.code}</strong>
                          <span style={{ marginLeft: '0.5rem', color: 'var(--text-secondary)' }}>{line.account?.name}</span>
                        </span>
                        <span style={{ textAlign: 'right', color: 'var(--border-color)' }}>-</span>
                        <span className="text-credit" style={{ textAlign: 'right' }}>
                          ₹{(line.credit / 100).toFixed(2)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
