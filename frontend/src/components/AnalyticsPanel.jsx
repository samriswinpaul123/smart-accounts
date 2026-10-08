import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, CheckSquare, AlertTriangle, Calendar, Clock, CreditCard } from 'lucide-react';

const COLORS = ['#0d9488', '#8b5cf6', '#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#ec4899', '#14b8a6'];

export default function AnalyticsPanel({ token, refreshTrigger }) {
  const [plData, setPlData] = useState({ revenue: { accounts: [], total: 0 }, expense: { accounts: [], total: 0 }, netIncome: 0 });
  const [bsData, setBsData] = useState({ assets: { accounts: [], total: 0 }, liabilities: { accounts: [], total: 0 }, equity: { accounts: [], total: 0 }, isBalanced: true });
  const [expenseAnalytics, setExpenseAnalytics] = useState({
    dailyTotal: 0,
    dailyCount: 0,
    monthlyTotal: 0,
    monthlyCount: 0,
    dailyAverage: 0,
    todayExpenses: [],
    categoryBreakdown: [],
    monthlyTimeline: []
  });
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [plRes, bsRes, expAnalyticsRes] = await Promise.all([
        fetch('/api/reports/profit-and-loss', { headers }),
        fetch('/api/reports/balance-sheet', { headers }),
        fetch('/api/expenses/analytics/daily-monthly', { headers })
      ]);

      const plReport = await plRes.json();
      const bsReport = await bsRes.json();
      const expAnalyticsData = await expAnalyticsRes.json();

      if (plRes.ok) setPlData(plReport);
      if (bsRes.ok) setBsData(bsReport);
      if (expAnalyticsRes.ok) setExpenseAnalytics(expAnalyticsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [token, refreshTrigger]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Calculating ledger balances and compiling statement reports...</div>;
  }

  // Data for Income vs Overhead Bar Chart
  const incomeVsOverheadData = [
    {
      name: 'Summary',
      Revenue: plData.revenue.total / 100,
      Expenses: plData.expense.total / 100,
      Profit: plData.netIncome / 100
    }
  ];

  // Data for Expense Breakdown Pie Chart
  const expenseBreakdownData = plData.expense.accounts.map(acc => ({
    name: acc.name,
    value: acc.balance / 100
  })).filter(e => e.value > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* 1. KPIs Section */}
      <div className="dashboard-grid">
        <div className="card kpi-card">
          <div className="kpi-icon revenue">
            <TrendingUp size={24} />
          </div>
          <div>
            <div className="kpi-label">Total Revenue</div>
            <div className="kpi-value">₹{(plData.revenue.total / 100).toFixed(2)}</div>
          </div>
        </div>

        <div className="card kpi-card">
          <div className="kpi-icon expenses">
            <TrendingDown size={24} />
          </div>
          <div>
            <div className="kpi-label">Total Expenses</div>
            <div className="kpi-value">₹{(plData.expense.total / 100).toFixed(2)}</div>
          </div>
        </div>

        <div className="card kpi-card">
          <div className="kpi-icon net">
            <DollarSign size={24} />
          </div>
          <div>
            <div className="kpi-label">Net Profit / Margin</div>
            <div 
              className="kpi-value" 
              style={{ color: plData.netIncome >= 0 ? 'var(--success)' : 'var(--danger)' }}
            >
              ₹{(plData.netIncome / 100).toFixed(2)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Sales (₹{(plData.revenue.total / 100).toFixed(2)}) − Expenses (₹{(plData.expense.total / 100).toFixed(2)})
            </div>
          </div>
        </div>

        <div className="card kpi-card">
          <div className={`kpi-icon ${bsData.isBalanced ? 'net' : 'expenses'}`} style={{ background: bsData.isBalanced ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }}>
            {bsData.isBalanced ? <CheckSquare size={24} style={{ color: 'var(--success)' }} /> : <AlertTriangle size={24} style={{ color: 'var(--danger)' }} />}
          </div>
          <div>
            <div className="kpi-label">Double-Entry Status</div>
            <div 
              className="kpi-value" 
              style={{ color: bsData.isBalanced ? 'var(--success)' : 'var(--danger)', fontSize: '1.25rem', marginTop: '0.5rem' }}
            >
              {bsData.isBalanced ? 'BALANCED' : 'DISCREPANCY!'}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Daily & Monthly Expense Tracker Section */}
      <div className="card" style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
              <Calendar size={20} style={{ color: 'var(--accent)' }} />
              Daily & Monthly Expense Tracker
            </h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Real-time ledger breakdown of today's outflows vs monthly cumulative operating expenses
            </p>
          </div>
        </div>

        <div className="dashboard-grid" style={{ marginBottom: '1.5rem' }}>
          {/* Daily Card */}
          <div className="card" style={{ background: 'rgba(239, 68, 68, 0.08)', borderLeft: '4px solid var(--danger)', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Today's Expense Total
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--danger)', marginTop: '0.25rem' }}>
                  ₹{(expenseAnalytics.dailyTotal / 100).toFixed(2)}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  {expenseAnalytics.dailyCount} transaction{expenseAnalytics.dailyCount !== 1 ? 's' : ''} logged today
                </div>
              </div>
              <div style={{ background: 'rgba(239, 68, 68, 0.2)', padding: '0.6rem', borderRadius: '8px' }}>
                <Clock size={24} style={{ color: 'var(--danger)' }} />
              </div>
            </div>
          </div>

          {/* Monthly Card */}
          <div className="card" style={{ background: 'rgba(139, 92, 246, 0.08)', borderLeft: '4px solid var(--accent-purple)', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  This Month's Expense Total
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent-purple)', marginTop: '0.25rem' }}>
                  ₹{(expenseAnalytics.monthlyTotal / 100).toFixed(2)}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Avg ₹{(expenseAnalytics.dailyAverage / 100).toFixed(2)} / day ({expenseAnalytics.monthlyCount} entries this month)
                </div>
              </div>
              <div style={{ background: 'rgba(139, 92, 246, 0.2)', padding: '0.6rem', borderRadius: '8px' }}>
                <Calendar size={24} style={{ color: 'var(--accent-purple)' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Expense Timeline Chart */}
        <div style={{ height: '220px', width: '100%', marginTop: '1rem' }}>
          <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            Current Month Daily Outflow Timeline (Day 1 - 31)
          </h4>
          <ResponsiveContainer width="100%" height="85%">
            <AreaChart data={expenseAnalytics.monthlyTimeline} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--danger)" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="var(--danger)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" stroke="var(--text-secondary)" tick={{ fontSize: 11 }} />
              <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#161e30', border: '1px solid rgba(255,255,255,0.1)' }} />
              <Area type="monotone" dataKey="amount" stroke="var(--danger)" fillOpacity={1} fill="url(#expenseGradient)" name="Expense (₹)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Today's Transactions Table */}
        {expenseAnalytics.todayExpenses && expenseAnalytics.todayExpenses.length > 0 && (
          <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              Today's Logged Expenses ({expenseAnalytics.todayExpenses.length})
            </h4>
            <div className="table-wrapper">
              <table style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Expense #</th>
                    <th>Vendor</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {expenseAnalytics.todayExpenses.map((exp) => (
                    <tr key={exp._id}>
                      <td><strong>{exp.expenseNumber}</strong></td>
                      <td>{exp.vendor}</td>
                      <td>{exp.category?.name || '-'}</td>
                      <td>
                        <span className={`badge badge-${exp.status.toLowerCase()}`}>
                          {exp.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--danger)' }}>
                        ₹{(exp.amount / 100).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 3. Recharts Analytics Panel */}
      <div className="analytics-container">
        <div className="card" style={{ height: '350px' }}>
          <h3>Revenue vs. Operating Overhead</h3>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={incomeVsOverheadData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="var(--text-secondary)" />
              <YAxis stroke="var(--text-secondary)" />
              <Tooltip contentStyle={{ background: '#161e30', border: '1px solid rgba(255,255,255,0.1)' }} />
              <Legend />
              <Bar dataKey="Revenue" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expenses" fill="var(--danger)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Profit" fill="var(--success)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ height: '350px', display: 'flex', flexDirection: 'column' }}>
          <h3>Overhead Expense Breakdown</h3>
          {expenseBreakdownData.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              No expenses recorded to distribute.
            </div>
          ) : (
            <div style={{ display: 'flex', height: '90%', alignItems: 'center' }}>
              <div style={{ width: '55%', height: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseBreakdownData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {expenseBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#161e30', border: '1px solid rgba(255,255,255,0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ width: '45%', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem', maxHeight: '200px', overflowY: 'auto' }}>
                {expenseBreakdownData.map((entry, index) => (
                  <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: COLORS[index % COLORS.length] }}></div>
                    <span style={{ color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '100px' }}>{entry.name}:</span>
                    <strong>₹{entry.value.toFixed(2)}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Core Accountancy Reports Layout */}
      <div className="analytics-container">
        
        {/* Profit and Loss Statement */}
        <div className="card">
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h3>Profit & Loss Statement</h3>
            <p style={{ fontSize: '0.85rem' }}>For the current period ending {new Date().toLocaleDateString()}</p>
          </div>

          <div className="report-section">
            <div className="report-header-line">
              <strong style={{ textTransform: 'uppercase', fontSize: '0.85rem', color: 'var(--accent)' }}>Operating Revenues</strong>
              <strong>Amount (INR)</strong>
            </div>
            {plData.revenue.accounts.length === 0 ? (
              <div className="report-row" style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                <span>No revenue recorded</span>
                <span>₹0.00</span>
              </div>
            ) : (
              plData.revenue.accounts.map(acc => (
                <div className="report-row" key={acc.code}>
                  <span>{acc.code} - {acc.name}</span>
                  <span>₹{(acc.balance / 100).toFixed(2)}</span>
                </div>
              ))
            )}
            <div className="report-row subtotal">
              <span>Total Revenue</span>
              <span>₹{(plData.revenue.total / 100).toFixed(2)}</span>
            </div>
          </div>

          <div className="report-section">
            <div className="report-header-line">
              <strong style={{ textTransform: 'uppercase', fontSize: '0.85rem', color: 'var(--danger)' }}>Operating Expenses</strong>
              <strong>Amount (INR)</strong>
            </div>
            {plData.expense.accounts.length === 0 ? (
              <div className="report-row" style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                <span>No operating overhead logged</span>
                <span>₹0.00</span>
              </div>
            ) : (
              plData.expense.accounts.map(acc => (
                <div className="report-row" key={acc.code}>
                  <span>{acc.code} - {acc.name}</span>
                  <span>₹{(acc.balance / 100).toFixed(2)}</span>
                </div>
              ))
            )}
            <div className="report-row subtotal">
              <span>Total Operating Overhead</span>
              <span>₹{(plData.expense.total / 100).toFixed(2)}</span>
            </div>
          </div>

          <div className={`report-row ${plData.netIncome >= 0 ? 'net-income' : 'net-loss'}`}>
            <div>
              <span>Net Operating Income</span>
              <div style={{ fontSize: '0.75rem', fontWeight: 'normal', opacity: 0.8, marginTop: '0.2rem' }}>
                Sales (₹{(plData.revenue.total / 100).toFixed(2)}) − Expenses (₹{(plData.expense.total / 100).toFixed(2)})
              </div>
            </div>
            <span>₹{(plData.netIncome / 100).toFixed(2)}</span>
          </div>
        </div>

        {/* Balance Sheet Statement */}
        <div className="card">
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h3>Statement of Financial Position</h3>
            <p style={{ fontSize: '0.85rem' }}>Balance Sheet as of {new Date().toLocaleDateString()}</p>
          </div>

          {/* Assets */}
          <div className="report-section">
            <div className="report-header-line">
              <strong style={{ textTransform: 'uppercase', fontSize: '0.85rem', color: 'var(--accent)' }}>Assets</strong>
              <strong>Amount (INR)</strong>
            </div>
            {bsData.assets.accounts.length === 0 ? (
              <div className="report-row" style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                <span>No asset balances</span>
                <span>₹0.00</span>
              </div>
            ) : (
              bsData.assets.accounts.map(acc => (
                <div className="report-row" key={acc.code}>
                  <span>{acc.code} - {acc.name}</span>
                  <span>₹{(acc.balance / 100).toFixed(2)}</span>
                </div>
              ))
            )}
            <div className="report-row subtotal" style={{ borderBottomColor: 'var(--accent)', borderBottomWidth: '2px' }}>
              <span>Total Assets</span>
              <span>₹{(bsData.assets.total / 100).toFixed(2)}</span>
            </div>
          </div>

          {/* Liabilities */}
          <div className="report-section">
            <div className="report-header-line">
              <strong style={{ textTransform: 'uppercase', fontSize: '0.85rem', color: 'var(--warning)' }}>Liabilities</strong>
              <strong>Amount (INR)</strong>
            </div>
            {bsData.liabilities.accounts.length === 0 ? (
              <div className="report-row" style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                <span>No liability balances</span>
                <span>₹0.00</span>
              </div>
            ) : (
              bsData.liabilities.accounts.map(acc => (
                <div className="report-row" key={acc.code}>
                  <span>{acc.code} - {acc.name}</span>
                  <span>₹{(acc.balance / 100).toFixed(2)}</span>
                </div>
              ))
            )}
            <div className="report-row subtotal">
              <span>Total Liabilities</span>
              <span>₹{(bsData.liabilities.total / 100).toFixed(2)}</span>
            </div>
          </div>

          {/* Equity */}
          <div className="report-section">
            <div className="report-header-line">
              <strong style={{ textTransform: 'uppercase', fontSize: '0.85rem', color: 'var(--accent-purple)' }}>Owner's Equity</strong>
              <strong>Amount (INR)</strong>
            </div>
            {bsData.equity.accounts.length === 0 ? (
              <div className="report-row" style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                <span>No equity balances</span>
                <span>₹0.00</span>
              </div>
            ) : (
              bsData.equity.accounts.map(acc => (
                <div className="report-row" key={acc.code}>
                  <span>{acc.code} - {acc.name}</span>
                  <span style={{ color: acc.balance < 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                    ₹{(acc.balance / 100).toFixed(2)}
                  </span>
                </div>
              ))
            )}
            <div className="report-row subtotal">
              <span>Total Owner's Equity</span>
              <span>₹{(bsData.equity.total / 100).toFixed(2)}</span>
            </div>
          </div>

          {/* Reconciled L+E */}
          <div className="report-row subtotal" style={{ borderBottomColor: 'var(--accent-purple)', borderBottomWidth: '2px', padding: '0.75rem 0' }}>
            <span>Total Liabilities & Equity</span>
            <span>₹{((bsData.liabilities.total + bsData.equity.total) / 100).toFixed(2)}</span>
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
            <span style={{ 
              fontSize: '0.8rem', 
              fontWeight: 700, 
              padding: '0.4rem 1rem', 
              borderRadius: '9999px',
              border: '1px solid',
              borderColor: bsData.isBalanced ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)',
              background: bsData.isBalanced ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              color: bsData.isBalanced ? 'var(--success)' : 'var(--danger)'
            }}>
              {bsData.isBalanced 
                ? '✓ LEDGER BALANCES: Assets = Liabilities + Equity' 
                : `✗ LEDGER DISCREPANCY: ₹${(bsData.discrepancy / 100).toFixed(2)}`
              }
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}
