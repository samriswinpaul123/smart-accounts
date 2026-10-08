import React from 'react';
import { LayoutDashboard, FileText, Receipt, BookOpen, Package, Landmark, FileCheck, Palette, Bot, ShoppingBag, ShieldCheck, LogOut, Search } from 'lucide-react';

export default function Navigation({ activeTab, setActiveTab, user, onLogout, onOpenCommandPalette }) {
  return (
    <nav className="navbar">
      <div className="nav-brand">
        <BookOpen size={22} style={{ color: 'var(--accent)' }} />
        <span>CORE LEDGER</span>
      </div>

      <ul className="nav-links">
        <li>
          <button 
            className={activeTab === 'analytics' ? 'active' : ''} 
            onClick={() => setActiveTab('analytics')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <LayoutDashboard size={14} />
            Dashboard
          </button>
        </li>
        <li>
          <button 
            className={activeTab === 'invoices' ? 'active' : ''} 
            onClick={() => setActiveTab('invoices')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <FileText size={14} />
            Invoices
          </button>
        </li>
        <li>
          <button 
            className={activeTab === 'expenses' ? 'active' : ''} 
            onClick={() => setActiveTab('expenses')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Receipt size={14} />
            Expenses
          </button>
        </li>
        <li>
          <button 
            className={activeTab === 'ledger' ? 'active' : ''} 
            onClick={() => setActiveTab('ledger')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <BookOpen size={14} />
            Ledger
          </button>
        </li>
        <li>
          <button 
            className={activeTab === 'inventory' ? 'active' : ''} 
            onClick={() => setActiveTab('inventory')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Package size={14} />
            Inventory
          </button>
        </li>
        <li>
          <button 
            className={activeTab === 'bank' ? 'active' : ''} 
            onClick={() => setActiveTab('bank')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Landmark size={14} />
            Bank Feeds
          </button>
        </li>
        <li>
          <button 
            className={activeTab === 'gst' ? 'active' : ''} 
            onClick={() => setActiveTab('gst')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <FileCheck size={14} />
            GST Compliance
          </button>
        </li>
        <li>
          <button 
            className={activeTab === 'designer' ? 'active' : ''} 
            onClick={() => setActiveTab('designer')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Palette size={14} />
            Designer
          </button>
        </li>
        <li>
          <button 
            className={activeTab === 'ai' ? 'active' : ''} 
            onClick={() => setActiveTab('ai')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Bot size={14} />
            AI Hub
          </button>
        </li>
        <li>
          <button 
            className={activeTab === 'marketplace' ? 'active' : ''} 
            onClick={() => setActiveTab('marketplace')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <ShoppingBag size={14} />
            Marketplace
          </button>
        </li>
        <li>
          <button 
            className={activeTab === 'security' ? 'active' : ''} 
            onClick={() => setActiveTab('security')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <ShieldCheck size={14} />
            Security & Audit
          </button>
        </li>
      </ul>

      <div className="user-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        <button 
          className="btn btn-secondary btn-sm" 
          onClick={onOpenCommandPalette}
          style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', padding: '0.3rem 0.5rem' }}
          title="Press Ctrl+K or Cmd+K"
        >
          <Search size={12} />
          <span>Cmd+K</span>
        </button>

        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>{user.username}</strong>
          <span style={{ marginLeft: '0.3rem', fontSize: '0.7rem', background: 'rgba(13, 148, 136, 0.2)', color: 'var(--accent)', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 600 }}>
            {user.role || 'Admin'}
          </span>
        </div>

        <button 
          className="btn btn-secondary btn-sm" 
          onClick={onLogout}
          style={{ padding: '0.3rem 0.5rem' }}
        >
          <LogOut size={12} />
        </button>
      </div>
    </nav>
  );
}
