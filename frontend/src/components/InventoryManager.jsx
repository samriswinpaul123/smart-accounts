import React, { useState, useEffect } from 'react';
import { Package, Plus, AlertCircle, CheckCircle2, Edit2, RefreshCw, ShoppingCart, DollarSign } from 'lucide-react';

export default function InventoryManager({ token }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  // Add Item State
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Products & Hardware');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('50');
  const [reorderLevel, setReorderLevel] = useState('10');
  const [unit, setUnit] = useState('Nos');
  const [successMsg, setSuccessMsg] = useState('');

  // Purchase Stock State
  const [selectedItemId, setSelectedItemId] = useState('');
  const [vendor, setVendor] = useState('Apple Retail / Vendor Supplier');
  const [purchaseQty, setPurchaseQty] = useState('10');
  const [unitCost, setUnitCost] = useState('');

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [token]);

  const handleCreateItem = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sku,
          name,
          category,
          costPrice: Math.round(parseFloat(costPrice) * 100),
          sellingPrice: Math.round(parseFloat(sellingPrice) * 100),
          stockQuantity: parseInt(stockQuantity) || 50,
          reorderLevel: parseInt(reorderLevel) || 10,
          unit
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`Inventory Stock Item ${data.name} (${data.sku}) added successfully!`);
        setShowAddForm(false);
        setSku('');
        setName('');
        setCostPrice('');
        setSellingPrice('');
        fetchInventory();
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePurchaseStock = async (e) => {
    e.preventDefault();
    if (!selectedItemId || !purchaseQty) return;

    try {
      const selectedItem = items.find(i => i._id === selectedItemId);
      const costInCents = unitCost ? Math.round(parseFloat(unitCost) * 100) : (selectedItem ? selectedItem.costPrice : 0);

      const res = await fetch('/api/inventory/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          inventoryItemId: selectedItemId,
          vendor,
          quantityPurchased: parseInt(purchaseQty),
          unitCostPrice: costInCents
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`Stock Purchased! Added ${purchaseQty} units to ${data.item.name} & auto-logged Expense ${data.expense.expenseNumber} (₹${(data.expense.amount / 100).toFixed(2)})!`);
        setShowPurchaseModal(false);
        setSelectedItemId('');
        setPurchaseQty('10');
        setUnitCost('');
        fetchInventory();
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStock = async (id, newQty) => {
    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ stockQuantity: newQty })
      });
      if (res.ok) fetchInventory();
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
              <Package size={22} style={{ color: 'var(--accent)' }} />
              Inventory & Stock SKU Management
            </h2>
            <p style={{ margin: '0.3rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Real-time SKU Stock Tracking, Auto-Expense Purchases, Reorder Threshold Badges & Margin Analytics
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={fetchInventory}>
              <RefreshCw size={14} /> Refresh Stock
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowPurchaseModal(true)} style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none' }}>
              <ShoppingCart size={16} /> Purchase Stock & Log Expense
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddForm(!showAddForm)}>
              <Plus size={16} /> Add New SKU
            </button>
          </div>
        </div>
        {successMsg && <div style={{ marginTop: '1rem', color: 'var(--success)', fontWeight: 600 }}>✓ {successMsg}</div>}
      </div>

      {/* Stock Purchase & Auto-Expense Modal */}
      {showPurchaseModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 4000 }}>
          <div className="card" style={{ width: '450px', border: '1px solid var(--accent)' }}>
            <h3 style={{ marginTop: 0, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShoppingCart size={20} /> Record Inventory Purchase & Expense
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Purchasing inventory automatically increases stock quantity and creates an operating expense voucher in your general ledger!
            </p>

            <form onSubmit={handlePurchaseStock} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Select Inventory Item *</label>
                <select className="form-control" value={selectedItemId} onChange={(e) => { setSelectedItemId(e.target.value); const item = items.find(i => i._id === e.target.value); if (item) setUnitCost((item.costPrice / 100).toFixed(2)); }} required>
                  <option value="">-- Select SKU Item to Replenish --</option>
                  {items.map(i => (
                    <option key={i._id} value={i._id}>{i.name} ({i.sku}) — Current Stock: {i.stockQuantity}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Supplier / Vendor Name *</label>
                <input type="text" className="form-control" value={vendor} onChange={(e) => setVendor(e.target.value)} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Quantity Purchased *</label>
                  <input type="number" className="form-control" value={purchaseQty} onChange={(e) => setPurchaseQty(e.target.value)} min="1" required />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Unit Cost Price (INR) *</label>
                  <input type="number" step="0.01" className="form-control" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} required />
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', border: '1px solid var(--border-color)', marginTop: '0.4rem' }}>
                <span>Total Purchase Cost: </span>
                <strong style={{ color: 'var(--accent)', fontSize: '1rem' }}>
                  ₹{((parseInt(purchaseQty || 0) * parseFloat(unitCost || 0)) || 0).toFixed(2)}
                </strong>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Auto-posts DR 5200 Inventory Expense & CR 1010 Cash & Bank
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowPurchaseModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Submit Purchase & Post Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New SKU Form */}
      {showAddForm && (
        <form onSubmit={handleCreateItem} className="card" style={{ border: '1px solid var(--accent-purple)' }}>
          <h3>Create New Inventory SKU Item</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', margin: '1rem 0' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>SKU Code *</label>
              <input type="text" className="form-control" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU-HW-05" required />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Item Name *</label>
              <input type="text" className="form-control" value={name} onChange={(e) => setName(e.target.value)} placeholder="Dell UltraSharp 4K Monitor" required />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Category</label>
              <input type="text" className="form-control" value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Cost Price (INR) *</label>
              <input type="number" step="0.01" className="form-control" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Selling Price (INR) *</label>
              <input type="number" step="0.01" className="form-control" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Initial Stock Qty</label>
              <input type="number" className="form-control" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary">Save SKU Item</button>
        </form>
      )}

      {/* Stock Inventory Items Table */}
      <div className="card">
        <h3>Live Inventory Stock Schedule</h3>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>SKU Code</th>
                <th>Item Name & Category</th>
                <th>Cost Price</th>
                <th>Selling Price</th>
                <th>Profit Margin</th>
                <th>Stock Level</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const cost = item.costPrice / 100;
                const sell = item.sellingPrice / 100;
                const margin = sell > 0 ? (((sell - cost) / sell) * 100).toFixed(1) : 0;
                const isLowStock = item.stockQuantity <= item.reorderLevel;

                return (
                  <tr key={item._id}>
                    <td><code>{item.sku}</code></td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.category}</div>
                    </td>
                    <td>₹{cost.toFixed(2)}</td>
                    <td><strong>₹{sell.toFixed(2)}</strong></td>
                    <td>
                      <span className={`badge badge-${margin >= 30 ? 'paid' : 'draft'}`}>{margin}%</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <strong>{item.stockQuantity} {item.unit}</strong>
                        {isLowStock && (
                          <span className="badge badge-unpaid" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem' }}>
                            <AlertCircle size={10} /> REORDER
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleUpdateStock(item._id, item.stockQuantity + 10)} title="Add 10 Stock">
                          +10
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleUpdateStock(item._id, Math.max(0, item.stockQuantity - 10))} title="Subtract 10 Stock">
                          -10
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
