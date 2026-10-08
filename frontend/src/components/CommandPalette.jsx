import React, { useState, useEffect } from 'react';
import { Search, LayoutDashboard, FileText, Receipt, BookOpen, Palette, Bot, ShoppingBag, ShieldCheck, X, Package, Landmark, FileCheck } from 'lucide-react';

export default function CommandPalette({ isOpen, onClose, setActiveTab }) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const commands = [
    { id: 'analytics', label: 'Go to Financial Dashboard', icon: LayoutDashboard, category: 'Navigation' },
    { id: 'invoices', label: 'Go to Accounts Receivable / Sales Vouchers', icon: FileText, category: 'Navigation' },
    { id: 'expenses', label: 'Go to Expense Registry & Daily/Monthly Tracker', icon: Receipt, category: 'Navigation' },
    { id: 'ledger', label: 'Go to General Ledger Book', icon: BookOpen, category: 'Navigation' },
    { id: 'inventory', label: 'Go to Inventory & Stock SKU Management', icon: Package, category: 'Operations' },
    { id: 'bank', label: 'Go to Direct Bank Feed & Reconciliation Engine', icon: Landmark, category: 'Banking' },
    { id: 'gst', label: 'Go to GST Tax Return Compliance (GSTR-1 / GSTR-3B)', icon: FileCheck, category: 'Taxation' },
    { id: 'designer', label: 'Open Visual Invoice Template Designer', icon: Palette, category: 'Tools' },
    { id: 'ai', label: 'Open AI & Automation Center (OCR / Reminders / Predictions)', icon: Bot, category: 'Tools' },
    { id: 'marketplace', label: 'Open App & Integration Marketplace', icon: ShoppingBag, category: 'Ecosystem' },
    { id: 'security', label: 'Open Security, RBAC & Tamper-Proof Audit Trail', icon: ShieldCheck, category: 'Security' },
  ];

  const filtered = commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()));

  const handleSelect = (tabId) => {
    setActiveTab(tabId);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      paddingTop: '10vh',
      zIndex: 2000
    }} onClick={onClose}>
      <div style={{
        background: '#0f172a',
        border: '1px solid var(--accent)',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '620px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
        overflow: 'hidden',
        color: '#fff'
      }} onClick={(e) => e.stopPropagation()}>
        {/* Input Bar */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)', gap: '0.75rem' }}>
          <Search size={20} style={{ color: 'var(--accent)' }} />
          <input
            type="text"
            placeholder="Type a command or jump to module... (Esc to close)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '1rem',
              width: '100%',
              outline: 'none'
            }}
          />
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Command List */}
        <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '0.5rem' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
              No matching commands found.
            </div>
          ) : (
            filtered.map((cmd) => {
              const IconComp = cmd.icon;
              return (
                <div
                  key={cmd.id}
                  onClick={() => handleSelect(cmd.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    marginBottom: '0.25rem'
                  }}
                  className="cmd-item"
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(13, 148, 136, 0.15)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <IconComp size={18} style={{ color: 'var(--accent)' }} />
                    <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{cmd.label}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.08)', padding: '0.2rem 0.6rem', borderRadius: '4px', color: '#94a3b8' }}>
                    {cmd.category}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{ background: '#090d16', padding: '0.6rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.75rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
          <span>Navigation Shortcuts</span>
          <span>Press <strong>Esc</strong> to exit</span>
        </div>
      </div>
    </div>
  );
}
