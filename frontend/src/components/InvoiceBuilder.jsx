import React, { useState, useEffect, useRef } from 'react';
import { Play, ArrowLeft, RefreshCw, Send, CheckCircle, Download, Plus, Trash2, Copy, DollarSign, Search, Filter, MessageSquare, ExternalLink } from 'lucide-react';

export default function InvoiceBuilder({ token, refreshTrigger }) {
  const [invoices, setInvoices] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [inventorySkus, setInventorySkus] = useState([]);
  const [showVoucher, setShowVoucher] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Partial Payment Modal State
  const [partialModalInv, setPartialModalInv] = useState(null);
  const [partialAmount, setPartialAmount] = useState('');

  // Voucher Form State
  const [voucherNo, setVoucherNo] = useState('');
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientGstin, setClientGstin] = useState('27AAACC9988E1Z4');
  const [clientAddress, setClientAddress] = useState('Corporate Office Plaza, Suite 402');
  const [currency, setCurrency] = useState('INR');
  const [paymentTerms, setPaymentTerms] = useState('Net 30 Days');
  const [gstType, setGstType] = useState('intrastate'); // 'intrastate' or 'interstate'

  const [items, setItems] = useState([
    { description: 'Enterprise Accounting Consulting', hsnCode: '998311', quantity: 1, unitPrice: '500.00', taxRatePercent: 18, discountPercent: 0, amount: '590.00' }
  ]);
  const [notes, setNotes] = useState('Thank you for your business. Remit payment via UPI or Corporate Bank Feed.');
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);

  // References for keyboard navigation (Tally style)
  const partyRef = useRef();

  const fetchData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [invRes, accRes, invenRes] = await Promise.all([
        fetch('/api/invoices', { headers }),
        fetch('/api/accounts', { headers }),
        fetch('/api/inventory', { headers })
      ]);

      const invData = await invRes.json();
      const accData = await accRes.json();
      const invenData = await invenRes.json();

      if (invRes.ok) setInvoices(invData);
      if (accRes.ok) setAccounts(accData);
      if (invenRes.ok && Array.isArray(invenData)) setInventorySkus(invenData);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, refreshTrigger]);

  const handleCreateNew = () => {
    setVoucherNo(`INV-${Math.floor(1000 + Math.random() * 9000)}`);
    setClientName('');
    setClientEmail('');
    setClientGstin('27AAACC9988E1Z4');
    setClientAddress('Corporate Office Plaza, Suite 402');
    setItems([{ description: '', hsnCode: '998311', quantity: 1, unitPrice: '', taxRatePercent: 18, discountPercent: 0, amount: '' }]);
    setError('');
    setSuccess('');
    setShowVoucher(true);
  };

  const handleSelectSku = (index, skuId) => {
    const sku = inventorySkus.find(s => s._id === skuId);
    if (!sku) return;

    const updated = [...items];
    updated[index].description = sku.name;
    updated[index].hsnCode = sku.hsnCode || '998311';
    updated[index].unitPrice = (sku.sellingPrice / 100).toFixed(2);
    updated[index].taxRatePercent = sku.taxRate || 18;

    const qty = parseInt(updated[index].quantity) || 1;
    const rate = parseFloat(updated[index].unitPrice) || 0;
    const taxRate = parseFloat(updated[index].taxRatePercent) || 18;
    const netSub = qty * rate;
    const tax = netSub * (taxRate / 100);
    updated[index].amount = (netSub + tax).toFixed(2);

    setItems(updated);
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;

    const qty = parseInt(updated[index].quantity) || 0;
    const rate = parseFloat(updated[index].unitPrice) || 0;
    const taxRate = parseFloat(updated[index].taxRatePercent) || 0;
    const disc = parseFloat(updated[index].discountPercent) || 0;

    const rawTotal = qty * rate;
    const discountVal = rawTotal * (disc / 100);
    const netSubtotal = rawTotal - discountVal;
    const taxVal = netSubtotal * (taxRate / 100);

    updated[index].amount = (netSubtotal + taxVal).toFixed(2);
    setItems(updated);
  };

  const addItemRow = () => {
    setItems([...items, { description: '', hsnCode: '998311', quantity: 1, unitPrice: '', taxRatePercent: 18, discountPercent: 0, amount: '' }]);
  };

  const removeItemRow = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Math Calculations
  const calculateTotals = () => {
    let subtotal = 0;
    let taxTotal = 0;
    let discountTotal = 0;

    items.forEach(item => {
      const qty = parseInt(item.quantity) || 0;
      const rate = parseFloat(item.unitPrice) || 0;
      const taxRate = parseFloat(item.taxRatePercent) || 0;
      const disc = parseFloat(item.discountPercent) || 0;

      const raw = qty * rate;
      const dVal = raw * (disc / 100);
      const net = raw - dVal;
      const tVal = net * (taxRate / 100);

      subtotal += net;
      taxTotal += tVal;
      discountTotal += dVal;
    });

    const grandTotal = subtotal + taxTotal;
    return {
      subtotal: subtotal.toFixed(2),
      taxTotal: taxTotal.toFixed(2),
      cgst: (taxTotal / 2).toFixed(2),
      sgst: (taxTotal / 2).toFixed(2),
      discountTotal: discountTotal.toFixed(2),
      grandTotal: grandTotal.toFixed(2)
    };
  };

  const totals = calculateTotals();

  const handleSaveVoucher = async () => {
    if (!voucherNo || !clientName || !clientEmail) {
      setError('Please provide Voucher Number, Client Name, and Client Email.');
      setShowAcceptDialog(false);
      return;
    }

    try {
      const formattedItems = items.map(item => ({
        description: item.description,
        hsnCode: item.hsnCode || '998311',
        quantity: parseInt(item.quantity) || 1,
        unitPrice: Math.round((parseFloat(item.unitPrice) || 0) * 100),
        taxRatePercent: parseFloat(item.taxRatePercent) || 18,
        discountPercent: parseFloat(item.discountPercent) || 0
      }));

      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          invoiceNumber: voucherNo,
          clientName,
          clientEmail,
          clientGstin,
          clientAddress,
          date: voucherDate,
          dueDate,
          items: formattedItems,
          currency,
          paymentTerms,
          notes
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(`Tax Invoice ${data.invoiceNumber} saved as Draft!`);
        setShowVoucher(false);
        setShowAcceptDialog(false);
        fetchData();
      } else {
        setError(data.error || 'Failed to save voucher.');
        setShowAcceptDialog(false);
      }
    } catch (err) {
      setError('Connection error saving voucher.');
      setShowAcceptDialog(false);
    }
  };

  const handleSendInvoice = async (id) => {
    try {
      const res = await fetch(`/api/invoices/${id}/send`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`Invoice ${data.invoiceNumber} finalized & posted to General Ledger!`);
        fetchData();
      } else {
        setError(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePayInvoice = async (id) => {
    try {
      const res = await fetch(`/api/invoices/${id}/pay`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`Full payment settled for Invoice ${data.invoiceNumber}!`);
        fetchData();
      } else {
        setError(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDuplicateInvoice = async (id) => {
    try {
      const res = await fetch(`/api/invoices/${id}/duplicate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`Invoice duplicated as ${data.invoiceNumber}!`);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecordPartialPayment = async () => {
    if (!partialModalInv || !partialAmount) return;
    try {
      const res = await fetch(`/api/invoices/${partialModalInv._id}/record-partial`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ partialAmount: Math.round(parseFloat(partialAmount) * 100) })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`Recorded partial payment of ₹${parseFloat(partialAmount).toFixed(2)} on ${data.invoiceNumber}!`);
        setPartialModalInv(null);
        setPartialAmount('');
        fetchData();
      } else {
        setError(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered Invoices
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          inv.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Alert Messages */}
      {error && <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--danger)' }}>⚠️ {error}</div>}
      {success && <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--success)' }}>✓ {success}</div>}

      {/* Main View: Invoices Management Table */}
      {!showVoucher && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Play size={20} style={{ color: 'var(--accent)' }} /> Enterprise Sales & Tax Invoices
              </h2>
              <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Itemized GST Invoicing, Instant UPI QR Code, Partial Payments & Ledger Postings
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={fetchData}>
                <RefreshCw size={14} /> Refresh
              </button>
              <button className="btn btn-primary" onClick={handleCreateNew}>
                <Plus size={16} /> Create Tax Invoice
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                className="form-control"
                placeholder="Search invoice number or client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '2.4rem' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={16} style={{ color: 'var(--text-secondary)' }} />
              <select className="form-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: '140px' }}>
                <option value="ALL">All Statuses</option>
                <option value="Draft">Draft</option>
                <option value="Sent">Sent</option>
                <option value="Partial">Partial</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Client & GSTIN</th>
                  <th>Date / Due</th>
                  <th>Grand Total</th>
                  <th>Balance Due</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                      No tax invoices found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv._id}>
                      <td><strong>{inv.invoiceNumber}</strong></td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{inv.clientName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{inv.clientGstin || inv.clientEmail}</div>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        <div>{new Date(inv.date).toLocaleDateString()}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Due: {new Date(inv.dueDate).toLocaleDateString()}</div>
                      </td>
                      <td><strong>₹{(inv.totalAmount / 100).toFixed(2)}</strong></td>
                      <td>
                        <span style={{ color: inv.balanceDue > 0 ? 'var(--warning)' : 'var(--success)', fontWeight: 700 }}>
                          ₹{((inv.balanceDue !== undefined ? inv.balanceDue : (inv.status === 'Paid' ? 0 : inv.totalAmount)) / 100).toFixed(2)}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${inv.status.toLowerCase()}`}>{inv.status}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {inv.status === 'Draft' && (
                            <button className="btn btn-secondary btn-sm" onClick={() => handleSendInvoice(inv._id)} title="Finalize and Post to Ledger">
                              <Send size={12} /> Post
                            </button>
                          )}

                          {inv.status !== 'Paid' && (
                            <>
                              <button className="btn btn-success btn-sm" onClick={() => handlePayInvoice(inv._id)} title="Record Full Settlement">
                                <CheckCircle size={12} /> Settle
                              </button>
                              <button className="btn btn-secondary btn-sm" onClick={() => { setPartialModalInv(inv); setPartialAmount(((inv.balanceDue || inv.totalAmount) / 100).toFixed(2)); }} title="Record Partial Payment">
                                <DollarSign size={12} /> Partial
                              </button>
                            </>
                          )}

                          <button className="btn btn-secondary btn-sm" onClick={() => handleDuplicateInvoice(inv._id)} title="Duplicate Invoice">
                            <Copy size={12} /> Clone
                          </button>

                          <a href={`/api/invoices/${inv._id}/download`} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" title="Download PDF">
                            <Download size={12} /> PDF
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Interactive Tax Invoice Builder Modal / Form */}
      {showVoucher && (
        <div className="card" style={{ border: '1px solid var(--accent)', background: '#0b1120' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)' }}>
              <Plus size={18} /> Tax Invoice Builder Entry
            </h3>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowVoucher(false)}>
              <ArrowLeft size={14} /> Back to Invoices
            </button>
          </div>

          {/* Form Header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Invoice Number *</label>
              <input type="text" className="form-control" value={voucherNo} onChange={(e) => setVoucherNo(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Client Name *</label>
              <input type="text" className="form-control" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="e.g. Hooli Tech India" />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Client Email *</label>
              <input type="email" className="form-control" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="billing@hooli.com" />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Client GSTIN</label>
              <input type="text" className="form-control" value={clientGstin} onChange={(e) => setClientGstin(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Invoice Date</label>
              <input type="date" className="form-control" value={voucherDate} onChange={(e) => setVoucherDate(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Payment Due Date</label>
              <input type="date" className="form-control" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>GST Tax Type</label>
              <select className="form-control" value={gstType} onChange={(e) => setGstType(e.target.value)}>
                <option value="intrastate">CGST + SGST (Intrastate 9%+9%)</option>
                <option value="interstate">IGST (Interstate 18%)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Currency</label>
              <select className="form-control" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>

          {/* Line Items Grid */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h4 style={{ margin: 0 }}>Itemized Particulars</h4>
              <button className="btn btn-secondary btn-sm" onClick={addItemRow}>
                <Plus size={12} /> Add Particular Row
              </button>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '25%' }}>SKU / Description</th>
                    <th>HSN/SAC</th>
                    <th style={{ width: '8%' }}>Qty</th>
                    <th>Rate (INR)</th>
                    <th>Tax %</th>
                    <th>Disc %</th>
                    <th>Total (INR)</th>
                    <th style={{ width: '5%' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        {inventorySkus.length > 0 && (
                          <select
                            className="form-control mb-1"
                            style={{ fontSize: '0.75rem', padding: '0.2rem' }}
                            onChange={(e) => handleSelectSku(idx, e.target.value)}
                          >
                            <option value="">-- Select Inventory SKU --</option>
                            {inventorySkus.map(s => (
                              <option key={s._id} value={s._id}>{s.name} (Stock: {s.stockQuantity})</option>
                            ))}
                          </select>
                        )}
                        <input
                          type="text"
                          className="form-control"
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          placeholder="Particular description"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-control"
                          value={item.hsnCode}
                          onChange={(e) => handleItemChange(idx, 'hsnCode', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                          placeholder="0.00"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control"
                          value={item.taxRatePercent}
                          onChange={(e) => handleItemChange(idx, 'taxRatePercent', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control"
                          value={item.discountPercent}
                          onChange={(e) => handleItemChange(idx, 'discountPercent', e.target.value)}
                        />
                      </td>
                      <td>
                        <strong>₹{item.amount || '0.00'}</strong>
                      </td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => removeItemRow(idx)} style={{ color: 'var(--danger)' }}>
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tax Breakdown & Grand Total Summary */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
            <div style={{ width: '320px', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal (Net):</span>
                <strong>₹{totals.subtotal}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Trade Discounts:</span>
                <span style={{ color: 'var(--danger)' }}>-₹{totals.discountTotal}</span>
              </div>
              {gstType === 'intrastate' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>CGST (9%):</span>
                    <span>₹{totals.cgst}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>SGST (9%):</span>
                    <span>₹{totals.sgst}</span>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>IGST (18%):</span>
                  <span>₹{totals.taxTotal}</span>
                </div>
              )}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.4rem', marginTop: '0.2rem', display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', color: 'var(--accent)' }}>
                <strong>Grand Total:</strong>
                <strong>₹{totals.grandTotal}</strong>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={() => setShowVoucher(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSaveVoucher}>
              <CheckCircle size={16} /> Save Tax Invoice Draft
            </button>
          </div>
        </div>
      )}

      {/* Partial Payment Modal */}
      {partialModalInv && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 4000 }}>
          <div className="card" style={{ width: '380px', border: '1px solid var(--accent)' }}>
            <h3>Record Partial Payment</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Invoice: <strong>{partialModalInv.invoiceNumber}</strong> ({partialModalInv.clientName})
            </p>

            <div style={{ margin: '1rem 0' }}>
              <label style={{ fontSize: '0.8rem' }}>Payment Amount (INR):</label>
              <input
                type="number"
                className="form-control"
                value={partialAmount}
                onChange={(e) => setPartialAmount(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setPartialModalInv(null)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleRecordPartialPayment}>Submit Partial Payment</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
