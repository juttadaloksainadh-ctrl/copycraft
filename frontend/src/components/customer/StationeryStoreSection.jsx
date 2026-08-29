import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import Modal from '../common/Modal';
import {
  ShoppingBag, Search, Plus, Minus, CheckCircle, Package,
  MapPin, CreditCard, Banknote, Sparkles, Filter, AlertCircle, ShoppingCart
} from 'lucide-react';
import confetti from 'canvas-confetti';

const CATEGORIES = [
  'All',
  'Notebooks',
  'Pens & Markers',
  'Lab & Art Supplies',
  'Files & Folders',
  'Tech Accessories'
];

export default function StationeryStoreSection({ onOrderPlaced }) {
  const { addToast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Checkout modal state
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/stationery/items');
      if (res.success) {
        setItems(res.items || []);
      }
    } catch (e) {
      addToast('Failed to load stationery catalog', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOpenProduct = (product) => {
    if (!product.inStock) {
      addToast('This item is currently out of stock', 'warning');
      return;
    }
    setSelectedProduct(product);
    setQuantity(1);
    setPaymentMethod('COD');
  };

  const handlePlaceOrder = async (e) => {
    if (e) e.preventDefault();
    if (!selectedProduct) return;
    if (!deliveryLocation || deliveryLocation.trim().length === 0) {
      addToast('Please enter your hostel room or campus delivery location', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const orderPayload = {
        items: [
          {
            id: selectedProduct.id,
            name: selectedProduct.name,
            price: selectedProduct.price,
            quantity,
            imageUrl: selectedProduct.imageUrl
          }
        ],
        deliveryLocation: deliveryLocation.trim(),
        paymentMethod
      };

      const res = await apiFetch('/stationery/orders', {
        method: 'POST',
        body: JSON.stringify(orderPayload)
      });

      if (res.success) {
        try {
          confetti({ particleCount: 75, spread: 60, origin: { y: 0.6 } });
        } catch (_) {}
        addToast(`Stationery order #${res.order?.id} placed successfully! 🛒`, 'success');
        setSelectedProduct(null);
        setDeliveryLocation('');
        if (onOrderPlaced) onOrderPlaced();
      } else {
        addToast(res.message || 'Failed to place order', 'error');
      }
    } catch (err) {
      addToast('Order processing error. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ marginTop: '2.5rem' }}>
      {/* Header & Section Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>CAMPUS EXPRESS STORE</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>• Instant Campus Delivery</span>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.2rem 0 0 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingBag size={24} color="var(--primary)" />
            Campus Stationery Store
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.2rem 0 0 0' }}>
            Notebooks, pens, lab coats, calculators &amp; essentials delivered directly to your room
          </p>
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="input-field"
            placeholder="Search pens, notebooks, lab coats..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '38px' }}
          />
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="mobile-tab-pills" style={{ marginBottom: '1.5rem' }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: 'var(--radius-full)', fontWeight: 700, padding: '0.4rem 1rem' }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Amazon-Style Product Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card pulse-skeleton" style={{ height: '280px', borderRadius: '16px' }} />
          ))}
        </div>
      ) : filteredItems.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem' }}>
          {filteredItems.map(item => (
            <div
              key={item.id}
              className="card card-hover"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '0.85rem',
                borderRadius: '16px',
                border: '1px solid var(--border-color)',
                position: 'relative',
                background: 'var(--bg-surface)'
              }}
            >
              <div>
                {/* Product Image */}
                <div style={{
                  position: 'relative',
                  width: '100%',
                  height: '160px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  background: '#f1f5f9',
                  marginBottom: '0.75rem'
                }}>
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      filter: item.inStock ? 'none' : 'grayscale(80%)'
                    }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=60';
                    }}
                  />
                  {!item.inStock && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(15, 23, 42, 0.65)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      letterSpacing: '0.05em'
                    }}>
                      OUT OF STOCK
                    </div>
                  )}
                  <span style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    background: 'rgba(15, 23, 42, 0.75)',
                    color: '#fff',
                    backdropFilter: 'blur(4px)',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px'
                  }}>
                    {item.category}
                  </span>
                </div>

                {/* Title & Description */}
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 0.3rem 0', lineHeight: '1.35', color: 'var(--text-main)' }}>
                  {item.name}
                </h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {item.description}
                </p>
              </div>

              {/* Price & Action */}
              <div style={{ marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Price</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary)' }}>
                    ₹{item.price}
                  </div>
                </div>

                <button
                  onClick={() => handleOpenProduct(item)}
                  disabled={!item.inStock}
                  className="btn btn-sm btn-primary"
                  style={{
                    gap: '0.35rem',
                    borderRadius: 'var(--radius-md)',
                    opacity: item.inStock ? 1 : 0.5,
                    cursor: item.inStock ? 'pointer' : 'not-allowed'
                  }}
                >
                  <ShoppingCart size={14} />
                  {item.inStock ? 'Buy Now' : 'Unavailable'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No stationery items found matching "{searchTerm}".
        </div>
      )}

      {/* Checkout & Quantity Modal */}
      <Modal
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        title="Order Stationery Item"
        maxWidth="480px"
      >
        {selectedProduct && (
          <form onSubmit={handlePlaceOrder} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Product Summary */}
            <div style={{ display: 'flex', gap: '1rem', background: 'var(--bg-app)', padding: '0.85rem', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
              <img
                src={selectedProduct.imageUrl}
                alt={selectedProduct.name}
                style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '10px' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>{selectedProduct.category}</div>
                <h4 style={{ fontSize: '0.98rem', fontWeight: 800, margin: '0.1rem 0' }}>{selectedProduct.name}</h4>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>₹{selectedProduct.price} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>per unit</span></div>
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="input-group">
              <label className="input-label">Select Quantity</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  style={{ width: '40px', height: '40px', padding: 0, borderRadius: '50%' }}
                >
                  <Minus size={16} />
                </button>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, minWidth: '30px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                  {quantity}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setQuantity(q => Math.min(20, q + 1))}
                  style={{ width: '40px', height: '40px', padding: 0, borderRadius: '50%' }}
                >
                  <Plus size={16} />
                </button>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: 'auto', fontWeight: 600 }}>
                  Subtotal: <strong style={{ color: 'var(--primary)', fontSize: '1rem' }}>₹{(selectedProduct.price * quantity).toFixed(2)}</strong>
                </span>
              </div>
            </div>

            {/* Delivery Location Input */}
            <div className="input-group">
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <MapPin size={14} color="var(--danger)" />
                Delivery Hostel / Room Location
              </label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="e.g. Hostel 4, Room 302 or Block B Desk"
                value={deliveryLocation}
                onChange={e => setDeliveryLocation(e.target.value)}
              />
            </div>

            {/* Payment Method Selector */}
            <div className="input-group">
              <label className="input-label">Payment Method</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('COD')}
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${paymentMethod === 'COD' ? '#d97706' : 'var(--border-color)'}`,
                    background: paymentMethod === 'COD' ? 'rgba(245, 158, 11, 0.12)' : 'var(--bg-app)',
                    color: paymentMethod === 'COD' ? '#d97706' : 'var(--text-main)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    cursor: 'pointer'
                  }}
                >
                  <Banknote size={16} /> Cash on Delivery
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('UPI_ONLINE')}
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${paymentMethod === 'UPI_ONLINE' ? '#059669' : 'var(--border-color)'}`,
                    background: paymentMethod === 'UPI_ONLINE' ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-app)',
                    color: paymentMethod === 'UPI_ONLINE' ? '#059669' : 'var(--text-main)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    cursor: 'pointer'
                  }}
                >
                  <CreditCard size={16} /> Online / UPI
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-lg btn-primary"
              disabled={submitting}
              style={{ width: '100%', gap: '0.5rem', marginTop: '0.5rem' }}
            >
              <CheckCircle size={18} />
              {submitting ? 'Placing Order...' : `Confirm Order — ₹${(selectedProduct.price * quantity).toFixed(2)}`}
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}
