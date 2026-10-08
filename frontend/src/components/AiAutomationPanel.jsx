import React, { useState, useEffect, useRef } from 'react';
import { Bot, Scan, Bell, TrendingUp, Sparkles, Send, ShieldAlert, CheckCircle, RefreshCw, MessageSquare, ArrowRight } from 'lucide-react';

function formatAiMessage(text) {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    const parts = line.split(/(\*\*.*?\*\*)/g);
    const formattedLine = parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={pIdx} style={{ color: '#ffffff' }}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });

    return (
      <div key={idx} style={{ marginBottom: line.trim() === '' ? '0.3rem' : '0.15rem' }}>
        {formattedLine}
      </div>
    );
  });
}

export default function AiAutomationPanel({ token, refreshTrigger, onNavigateTab }) {
  const [ocrSamples, setOcrSamples] = useState([]);
  const [scannedExpense, setScannedExpense] = useState(null);
  const [scanSuccess, setScanSuccess] = useState('');
  
  // Predictions & Anomalies
  const [predictions, setPredictions] = useState(null);
  const [anomalies, setAnomalies] = useState([]);

  // Reminders & Invoices
  const [invoices, setInvoices] = useState([]);
  const [reminderMsg, setReminderMsg] = useState('');

  // AI Copilot Chat State
  const [chatMessages, setChatMessages] = useState([
    { sender: 'ai', text: '👋 Hello! I am **CoreAI Financial Copilot**. I have direct control over your accounting engine!\n\nTry typing:\n• "**Create invoice for Hooli Tech for ₹75000**"\n• "**Log expense of ₹15000 for AWS**"\n• "**Who owes me money?**"\n• "**Take me to General Ledger**"' }
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const fetchData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [ocrRes, predRes, invRes, anomRes] = await Promise.all([
        fetch('/api/ai/ocr-samples', { headers }),
        fetch('/api/ai/predictions', { headers }),
        fetch('/api/invoices', { headers }),
        fetch('/api/ai/anomalies', { headers })
      ]);

      const ocrData = await ocrRes.json();
      const predData = await predRes.json();
      const invData = await invRes.json();
      const anomData = await anomRes.json();

      if (ocrRes.ok) setOcrSamples(ocrData);
      if (predRes.ok) setPredictions(predData);
      if (invRes.ok) setInvoices(invData);
      if (anomRes.ok) setAnomalies(anomData);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, refreshTrigger]);

  const handleSendChat = async (customText = null) => {
    const promptToSend = customText || inputPrompt;
    if (!promptToSend.trim()) return;

    const userMsg = { sender: 'user', text: promptToSend };
    setChatMessages(prev => [...prev, userMsg]);
    if (!customText) setInputPrompt('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt: promptToSend })
      });
      const data = await res.json();
      if (res.ok) {
        setChatMessages(prev => [...prev, { sender: 'ai', text: data.reply }]);

        if (data.executedAction) {
          fetchData();
        }

        if (data.navigateTab && onNavigateTab) {
          setTimeout(() => {
            onNavigateTab(data.navigateTab);
          }, 800);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSimulateScan = async (sample) => {
    try {
      const res = await fetch('/api/ai/ocr-scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          vendor: sample.vendor,
          amount: sample.amount,
          description: sample.description,
          categoryCode: sample.suggestedCategoryCode
        })
      });
      const data = await res.json();
      if (res.ok) {
        setScannedExpense(data);
        setScanSuccess(`AI OCR extracted receipt details with ${sample.confidence} confidence!`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostScannedExpense = async () => {
    if (!scannedExpense) return;
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(scannedExpense)
      });
      const data = await res.json();
      if (res.ok) {
        setScanSuccess(`Expense ${data.expenseNumber} posted to General Ledger via 1-Click AI OCR!`);
        setScannedExpense(null);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendReminder = async (invoiceId, channel) => {
    try {
      const res = await fetch('/api/reminders/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ invoiceId, channel })
      });
      const data = await res.json();
      if (res.ok) {
        setReminderMsg(`Automated ${channel} payment reminder sent for invoice ${data.invoiceNumber}!`);
        setTimeout(() => setReminderMsg(''), 3000);
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
              <Bot size={22} style={{ color: 'var(--accent)' }} />
              Next-Gen AI & Automation Hub
            </h2>
            <p style={{ margin: '0.3rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Interactive AI Financial Copilot Chatbot, OCR Receipt Matcher, Anomaly Auditor & Cash Flow Predictor
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetchData}>
            <RefreshCw size={14} /> Refresh AI Engines
          </button>
        </div>
      </div>

      {/* 1. Interactive AI CFO Chatbot Copilot */}
      <div className="card" style={{ border: '1px solid var(--accent-purple)', background: 'rgba(139, 92, 246, 0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-purple)' }}>
            <Sparkles size={20} /> CoreAI Financial Copilot Chatbot
          </h3>
          <span style={{ fontSize: '0.75rem', background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-purple)', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
            ONLINE & CONNECTED TO LEDGER
          </span>
        </div>

        {/* Chat Messages Window */}
        <div style={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '1rem', height: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
          {chatMessages.map((msg, index) => (
            <div key={index} style={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                background: msg.sender === 'user' ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
                color: '#fff',
                padding: '0.6rem 0.9rem',
                borderRadius: '8px',
                maxWidth: '85%',
                lineHeight: '1.4'
              }}>
                {formatAiMessage(msg.text)}
              </div>
            </div>
          ))}
          {chatLoading && <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.8rem' }}>CoreAI is analyzing ledger database & executing command...</div>}
          <div ref={chatEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', margin: '0.75rem 0' }}>
          <button className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }} onClick={() => handleSendChat('Create invoice for Hooli Tech for ₹75000')}>
            + Bill Hooli ₹75k
          </button>
          <button className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }} onClick={() => handleSendChat('Log expense of ₹15000 for AWS')}>
            + AWS ₹15k
          </button>
          <button className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }} onClick={() => handleSendChat('Who owes me money?')}>
            🔍 Debtors Audit
          </button>
          <button className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }} onClick={() => handleSendChat('GST Tax Suggestions')}>
            🏛️ GST Tax Advice
          </button>
        </div>

        {/* Input Bar */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Ask or command CoreAI financial copilot..."
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
          />
          <button className="btn btn-primary" onClick={() => handleSendChat()}>
            <Send size={16} />
          </button>
        </div>
      </div>

      {/* 2. Anomaly Audit & Forecast Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        
        {/* Anomaly Audit Card */}
        <div className="card">
          <h3><ShieldAlert size={18} style={{ color: 'var(--warning)', verticalAlign: 'middle', marginRight: '0.5rem' }} />AI Fraud & Anomaly Audit Scanner</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.25rem 0 1rem 0' }}>
            Continuous background audit scanning ledger entries for unusual transaction spikes.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {anomalies.map((anom) => (
              <div key={anom.id} style={{ background: anom.severity === 'HIGH RISK' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.08)', borderLeft: `4px solid ${anom.severity === 'HIGH RISK' ? 'var(--danger)' : 'var(--success)'}`, padding: '0.75rem', borderRadius: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.9rem' }}>{anom.title}</strong>
                  <span className={`badge badge-${anom.severity === 'HIGH RISK' ? 'unpaid' : 'paid'}`}>{anom.severity}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>{anom.details}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600, marginTop: '0.2rem' }}>Rec: {anom.recommendation}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Cash Flow Forecast Card */}
        {predictions && (
          <div className="card" style={{ background: 'rgba(13, 148, 136, 0.04)', borderLeft: '4px solid var(--accent)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <TrendingUp size={18} style={{ color: 'var(--accent)' }} /> Predictive Cash Flow Forecast
              </h3>
              <span style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', fontWeight: 700, padding: '0.25rem 0.6rem', borderRadius: '9999px' }}>
                Health Score: {predictions.healthScore}/100
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                <span>30-Day Collections (Forecast):</span>
                <strong style={{ color: 'var(--success)' }}>+₹{(predictions.projected30DayCashIn / 100).toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                <span>30-Day Outflows (Forecast):</span>
                <strong style={{ color: 'var(--danger)' }}>-₹{(predictions.projected30DayCashOut / 100).toFixed(2)}</strong>
              </div>
            </div>

            <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <strong>AI Recommendation:</strong>
              <div style={{ marginTop: '0.2rem' }}>{predictions.insights[0]}</div>
            </div>
          </div>
        )}

      </div>

      {/* 3. OCR Receipt Scanner & Reminders Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        
        {/* OCR Receipt Scanner */}
        <div className="card">
          <h3><Scan size={18} style={{ color: 'var(--accent)', verticalAlign: 'middle', marginRight: '0.5rem' }} />AI Receipt & Bill OCR Parser</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.25rem 0 1rem 0' }}>
            Simulate scanned paper receipt / PDF invoice extraction into draft expense items.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {ocrSamples.map((sample) => (
              <div key={sample.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{sample.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{sample.vendor} — ₹{(sample.amount / 100).toFixed(2)}</div>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => handleSimulateScan(sample)}>
                  Scan & Extract
                </button>
              </div>
            ))}
          </div>

          {scannedExpense && (
            <div style={{ background: 'rgba(13, 148, 136, 0.1)', border: '1px solid var(--accent)', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
              <div style={{ fontWeight: 700, marginBottom: '0.5rem', color: 'var(--accent)' }}>Parsed Draft Expense Entry:</div>
              <div style={{ fontSize: '0.85rem' }}>
                <div>Expense #: <strong>{scannedExpense.expenseNumber}</strong></div>
                <div>Vendor: <strong>{scannedExpense.vendor}</strong></div>
                <div>Amount: <strong>₹{(scannedExpense.amount / 100).toFixed(2)}</strong></div>
              </div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem' }} onClick={handlePostScannedExpense}>
                1-Click Post to Ledger
              </button>
            </div>
          )}

          {scanSuccess && <div style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.85rem', marginTop: '0.75rem' }}>✓ {scanSuccess}</div>}
        </div>

        {/* Automated Payment Reminders */}
        <div className="card">
          <h3><Bell size={18} style={{ color: 'var(--accent-purple)', verticalAlign: 'middle', marginRight: '0.5rem' }} />Automated Receivables Follow-ups</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.25rem 0 1rem 0' }}>
            Send automated Email or WhatsApp reminders with instant payment links for pending invoices.
          </p>

          {reminderMsg && <div style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.75rem' }}>✓ {reminderMsg}</div>}

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Client</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.filter(i => i.status !== 'Paid').length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1.5rem' }}>
                      No unpaid receivable invoices requiring reminders.
                    </td>
                  </tr>
                ) : (
                  invoices.filter(i => i.status !== 'Paid').map((inv) => (
                    <tr key={inv._id}>
                      <td><strong>{inv.invoiceNumber}</strong></td>
                      <td>{inv.clientName}</td>
                      <td><strong>₹{(inv.totalAmount / 100).toFixed(2)}</strong></td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                          <button className="btn btn-secondary btn-sm" style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem' }} onClick={() => handleSendReminder(inv._id, 'Email')}>
                            Email
                          </button>
                          <button className="btn btn-secondary btn-sm" style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem' }} onClick={() => handleSendReminder(inv._id, 'WhatsApp')}>
                            WhatsApp
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
