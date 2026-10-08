import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import Auth from './components/Auth';
import AnalyticsPanel from './components/AnalyticsPanel';
import InvoiceBuilder from './components/InvoiceBuilder';
import ExpenseLogger from './components/ExpenseLogger';
import LedgerView from './components/LedgerView';
import InventoryManager from './components/InventoryManager';
import BankReconciliation from './components/BankReconciliation';
import GstTaxReport from './components/GstTaxReport';
import InvoiceDesigner from './components/InvoiceDesigner';
import AiAutomationPanel from './components/AiAutomationPanel';
import AppMarketplace from './components/AppMarketplace';
import SecurityAuditPanel from './components/SecurityAuditPanel';
import CommandPalette from './components/CommandPalette';
import GlobalAiCopilot from './components/GlobalAiCopilot';
import './styles/main.css';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [activeTab, setActiveTab] = useState('analytics');
  const [loading, setLoading] = useState(true);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [isCmdOpen, setIsCmdOpen] = useState(false);

  const triggerRefresh = () => {
    setRefreshCounter(prev => prev + 1);
  };

  // Check login session on startup
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      // Validate token with backend
      fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${savedToken}` }
      })
      .then(async res => {
        if (res.ok) {
          const freshUser = await res.json();
          setUser(freshUser);
          setToken(savedToken);
          localStorage.setItem('user', JSON.stringify(freshUser));
        } else {
          // Token expired or invalid
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      })
      .catch(err => {
        console.error('Session validation error:', err);
      })
      .finally(() => {
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const handleAuthSuccess = (authUser, authToken) => {
    setUser(authUser);
    setToken(authToken);
    setActiveTab('analytics');
  };

  const handleUpdateUser = (updatedUser, updatedToken) => {
    setUser(updatedUser);
    if (updatedToken) {
      setToken(updatedToken);
      localStorage.setItem('token', updatedToken);
    }
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ marginBottom: '1rem' }}>Initializing Core Ledger Enterprise Suite</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Syncing multi-tenant ledger accounts & AI copilot engines...</p>
        </div>
      </div>
    );
  }

  // Not Authenticated
  if (!user || !token) {
    return (
      <div className="app-container">
        <header className="navbar" style={{ justifyContent: 'center' }}>
          <div className="nav-brand" style={{ fontSize: '1.75rem' }}>
            CORE LEDGER
          </div>
        </header>
        <main className="main-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Auth onAuthSuccess={handleAuthSuccess} />
        </main>
      </div>
    );
  }

  // Authenticated Dashboard Layout
  return (
    <div className="app-container">
      <Navigation 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        user={user} 
        onLogout={handleLogout} 
        onOpenCommandPalette={() => setIsCmdOpen(true)}
      />
      
      <main className="main-content">
        {activeTab === 'analytics' && (
          <AnalyticsPanel token={token} refreshTrigger={refreshCounter} />
        )}
        {activeTab === 'invoices' && (
          <InvoiceBuilder token={token} refreshTrigger={triggerRefresh} />
        )}
        {activeTab === 'expenses' && (
          <ExpenseLogger token={token} refreshTrigger={triggerRefresh} />
        )}
        {activeTab === 'ledger' && (
          <LedgerView token={token} refreshTrigger={refreshCounter} />
        )}
        {activeTab === 'inventory' && (
          <InventoryManager token={token} />
        )}
        {activeTab === 'bank' && (
          <BankReconciliation token={token} />
        )}
        {activeTab === 'gst' && (
          <GstTaxReport token={token} />
        )}
        {activeTab === 'designer' && (
          <InvoiceDesigner />
        )}
        {activeTab === 'ai' && (
          <AiAutomationPanel token={token} refreshTrigger={refreshCounter} onNavigateTab={setActiveTab} />
        )}
        {activeTab === 'marketplace' && (
          <AppMarketplace token={token} />
        )}
        {activeTab === 'security' && (
          <SecurityAuditPanel token={token} user={user} onUpdateUser={handleUpdateUser} />
        )}
      </main>

      {/* Global Persistent CoreAI Copilot Floating Assistant */}
      <GlobalAiCopilot 
        token={token} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        triggerRefresh={triggerRefresh} 
      />

      {/* Global Cmd + K Search Palette */}
      <CommandPalette 
        isOpen={isCmdOpen} 
        onClose={() => setIsCmdOpen(false)} 
        setActiveTab={setActiveTab} 
      />
    </div>
  );
}
