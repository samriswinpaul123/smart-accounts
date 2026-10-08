import React, { useState, useEffect } from 'react';
import { Plus, Receipt, CheckCircle } from 'lucide-react';

export default function ExpenseLogger({ token, refreshTrigger }) {
  const [expenses, setExpenses] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [expenseNumber, setExpenseNumber] = useState('');
  const [vendor, setVendor] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('');
  const [paymentAccount, setPaymentAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Paid');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch Expenses & Chart of Accounts
  const fetchData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [expRes, accRes] = await Promise.all([
        fetch('/api/expenses', { headers }),
        fetch('/api/accounts', { headers })
      ]);

      const expData = await expRes.json();
      const accData = await accRes.json();

      if (expRes.ok) setExpenses(expData);
      if (accRes.ok) {
        setAccounts(accData);
        // Set default values for category & paymentAccount if available
        const expAccs = accData.filter(a => a.type === 'Expense');
        const assetLiabAccs = accData.filter(a => a.type === 'Asset' || a.type === 'Liability');
        
        if (expAccs.length > 0) setCategory(expAccs[0]._id);
        if (assetLiabAccs.length > 0) {
          // Default payment account to Cash & Bank (1010) if possible
          const cash = assetLiabAccs.find(a => a.code === '1010');
          setPaymentAccount(cash ? cash._id : assetLiabAccs[0]._id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, refreshTrigger]);

  const toCents = (val) => {
    const parsed = parseFloat(val);
    if (isNaN(parsed) || parsed < 0) return 0;
    return Math.round(parsed * 100);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!expenseNumber || !vendor || !category || !paymentAccount || !amount) {
      setError('Please fill in all required fields.');
      return;
    }

    const amountCents = toCents(amount);
    if (amountCents <= 0) {
      setError('Amount must be positive.');
      return;
    }

    // Double-check: if unpaid, the payment account should be Accounts Payable (2000) for clean record-keeping,
    // although the system allows selecting it. If they selected Cash but marked Unpaid, let's warn or set AP.
    let targetPaymentAccount = paymentAccount;
    if (status === 'Unpaid') {
      const ap = accounts.find(a => a.code === '2000');
      if (ap) {
        targetPaymentAccount = ap._id;
      }
    }

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          expenseNumber,
          vendor,
          date,
          category,
          paymentAccount: targetPaymentAccount,
          amount: amountCents,
          description,
          status
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to record expense');
      }

      setSuccess(`Expense ${expenseNumber} successfully written to ledger.`);
      setExpenseNumber('');
      setVendor('');
      setDate('');
      setAmount('');
      setDescription('');
      setStatus('Paid');
      setShowForm(false);
      fetchData();
      if (refreshTrigger) refreshTrigger();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSettle = async (id, expNum) => {
    if (!window.confirm(`Settle bill payment for Expense ${expNum}? This credits Cash (1010) and debits Accounts Payable (2000).`)) return;
    try {
      const res = await fetch(`/api/expenses/${id}/pay`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess(`Expense ${expNum} settled. Ledger entries adjusted!`);
      fetchData();
      if (refreshTrigger) refreshTrigger();
    } catch (err) {
      setError(err.message);
    }
  };

  // Filter accounts
  const expenseAccounts = accounts.filter(a => a.type === 'Expense');
  const paymentAccounts = accounts.filter(a => a.type === 'Asset' || a.type === 'Liability');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2>Expense Ledger Registry</h2>
          {!showForm && (
            <button className="btn btn-primary" onClick={() => {
              setShowForm(true);
              setExpenseNumber(`EXP-${Math.floor(1000 + Math.random() * 9000)}`);
            }}>
              <Plus size={16} />
              Log Expense
            </button>
          )}
        </div>

        {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontWeight: 600 }}>{error}</div>}
        {success && <div style={{ color: 'var(--success)', marginBottom: '1rem', fontWeight: 600 }}>{success}</div>}

        {showForm && (
          <form onSubmit={handleSubmit} className="card" style={{ background: 'var(--glass-bg)', border: '1px dashed var(--accent)', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3>Record Expense Transaction</h3>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Expense Number</label>
                <input
                  type="text"
                  className="form-control"
                  value={expenseNumber}
                  onChange={(e) => setExpenseNumber(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Vendor Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  placeholder="e.g. AWS Cloud, WeWork"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Transaction Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Expense Classification (Debit)</label>
                <select 
                  className="form-control" 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                  required
                >
                  {expenseAccounts.map(acc => (
                    <option key={acc._id} value={acc._id}>
                      {acc.code} - {acc.name} ({acc.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  {status === 'Paid' ? 'Payment Source (Credit)' : 'Liability Account (Credit)'}
                </label>
                <select 
                  className="form-control" 
                  value={paymentAccount} 
                  onChange={(e) => setPaymentAccount(e.target.value)}
                  disabled={status === 'Unpaid'} // Auto locks to Accounts Payable if Unpaid
                  required
                >
                  {status === 'Unpaid' ? (
                    accounts.filter(a => a.code === '2000').map(acc => (
                      <option key={acc._id} value={acc._id}>
                        {acc.code} - {acc.name}
                      </option>
                    ))
                  ) : (
                    paymentAccounts.map(acc => (
                      <option key={acc._id} value={acc._id}>
                        {acc.code} - {acc.name} ({acc.type})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Accounting System State</label>
                <div style={{ display: 'flex', gap: '2rem', marginTop: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="status" 
                      checked={status === 'Paid'} 
                      onChange={() => setStatus('Paid')} 
                    />
                    Paid (Debit Expense / Credit Cash)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="status" 
                      checked={status === 'Unpaid'} 
                      onChange={() => setStatus('Unpaid')} 
                    />
                    Unpaid Bill (Debit Expense / Credit Accounts Payable)
                  </label>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description / Memo</label>
              <input
                type="text"
                className="form-control"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Business purpose description..."
              />
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '2rem', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Expense Total: </span>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger)' }}>
                  ₹{(toCents(amount) / 100).toFixed(2)}
                </span>
              </div>
              <button type="submit" className="btn btn-danger">Log & Post Expense</button>
            </div>
          </form>
        )}

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Expense #</th>
                <th>Vendor</th>
                <th>Date</th>
                <th>Expense Category (DR)</th>
                <th>Payment/AP Account (CR)</th>
                <th>Total Cost</th>
                <th>Status</th>
                <th>Reconciled Posting</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                    No expenses logged in ledger.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp._id}>
                    <td><strong>{exp.expenseNumber}</strong></td>
                    <td>{exp.vendor}</td>
                    <td>{new Date(exp.date).toLocaleDateString()}</td>
                    <td>{exp.category ? `${exp.category.code} - ${exp.category.name}` : '-'}</td>
                    <td>{exp.paymentAccount ? `${exp.paymentAccount.code} - ${exp.paymentAccount.name}` : '-'}</td>
                    <td><strong style={{ color: 'var(--danger)' }}>₹{(exp.amount / 100).toFixed(2)}</strong></td>
                    <td>
                      <span className={`badge badge-${exp.status.toLowerCase()}`}>
                        {exp.status}
                      </span>
                    </td>
                    <td>
                      {exp.status === 'Unpaid' ? (
                        <button 
                          className="btn btn-secondary btn-sm" 
                          style={{ borderColor: 'var(--success)', color: 'var(--success)' }}
                          onClick={() => handleSettle(exp._id, exp.expenseNumber)}
                        >
                          <CheckCircle size={12} /> Settle Bill
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>
                          Posted (DR {exp.category?.code} / CR {exp.paymentAccount?.code})
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
