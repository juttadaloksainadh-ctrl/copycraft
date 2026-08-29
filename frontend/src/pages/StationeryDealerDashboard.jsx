import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiFetch } from '../utils/api';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import Footer from '../components/common/Footer';
import Badge from '../components/common/Badge';
import ProfilePage from '../components/common/ProfilePage';
import {
  ShoppingBag, PlusCircle, Package, RefreshCw, Phone, MapPin,
  CheckCircle, Truck, Camera, Upload, Trash2, Edit2, DollarSign, ToggleLeft, ToggleRight
} from 'lucide-react';

export default function StationeryDealerDashboard({ onNavigate }) {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('stationery_orders');
  const [orders, setOrders] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // New Item Upload Form State
  const [uploadForm, setUploadForm] = useState({
    name: '',
    category: 'Notebooks',
    price: '',
    stockQuantity: '50',
    inStock: true,
    description: '',
    imageUrl: ''
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async (isManual = false) => {
    setLoading(true);
    try {
      const [ordRes, itemRes] = await Promise.all([
        apiFetch('/stationery/dealer/orders'),
        apiFetch('/stationery/items')
      ]);

      if (ordRes.success) setOrders(ordRes.orders || []);
      if (itemRes.success) setItems(itemRes.items || []);

      if (isManual) addToast('Stationery dashboard refreshed!', 'success');
    } catch (e) {
      addToast('Error fetching dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setUploadForm(f => ({ ...f, imageUrl: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadProduct = async (e) => {
    e.preventDefault();
    if (!uploadForm.name || !uploadForm.price) {
      addToast('Product name and price are required', 'warning');
      return;
    }

    setUploading(true);
    try {
      const res = await apiFetch('/stationery/items', {
        method: 'POST',
        body: JSON.stringify(uploadForm)
      });

      if (res.success) {
        addToast('Stationery product uploaded successfully! ✏️', 'success');
        setUploadForm({
          name: '',
          category: 'Notebooks',
          price: '',
          stockQuantity: '50',
          inStock: true,
          description: '',
          imageUrl: ''
        });
        setImagePreview(null);
        fetchDashboardData();
        setActiveTab('catalog');
      } else {
        addToast(res.message || 'Upload failed', 'error');
      }
    } catch (err) {
      addToast('Error uploading product', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleToggleStock = async (item) => {
    try {
      const res = await apiFetch(`/stationery/items/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({ inStock: !item.inStock })
      });
      if (res.success) {
        addToast(`Updated stock status for "${item.name}"`, 'success');
        fetchDashboardData();
      }
    } catch (e) {
      addToast('Stock update failed', 'error');
    }
  };

  const handleUpdatePrice = async (item, newPrice) => {
    if (!newPrice || isNaN(newPrice)) return;
    try {
      const res = await apiFetch(`/stationery/items/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({ price: Number(newPrice) })
      });
      if (res.success) {
        addToast('Price updated successfully', 'success');
        fetchDashboardData();
      }
    } catch (e) {
      addToast('Price update failed', 'error');
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await apiFetch(`/stationery/items/${itemId}`, { method: 'DELETE' });
      if (res.success) {
        addToast('Product deleted from store', 'success');
        fetchDashboardData();
      }
    } catch (e) {
      addToast('Delete failed', 'error');
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await apiFetch(`/stationery/dealer/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      if (res.success) {
        addToast(`Order #${orderId} marked as ${newStatus}!`, 'success');
        fetchDashboardData();
      }
    } catch (e) {
      addToast('Order status update failed', 'error');
    }
  };

  return (
    <div className="dashboard-layout" style={{ minHeight: '100vh', background: 'var(--bg-app)' }}>
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Navbar onMobileMenuToggle={() => setMobileMenuOpen(v => !v)} />

        <main className="main-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span className="badge badge-success" style={{ marginBottom: '0.3rem' }}>STATIONERY DEALER HUB</span>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800 }}>{user?.name || 'Campus Stationery Shop'}</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Manage campus stationery store, upload products, and fulfill student orders</p>
            </div>

            <button className="btn btn-sm btn-secondary" onClick={() => fetchDashboardData(true)} disabled={loading} style={{ gap: '0.4rem' }}>
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Refreshing...' : 'Refresh Hub'}
            </button>
          </div>

          {/* Sub Navigation Bar */}
          <div className="mobile-tab-pills">
            <button
              onClick={() => setActiveTab('stationery_orders')}
              className={`btn btn-sm ${activeTab === 'stationery_orders' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Received Orders ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab('upload_new')}
              className={`btn btn-sm ${activeTab === 'upload_new' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ gap: '0.35rem' }}
            >
              <PlusCircle size={14} /> Upload New Item
            </button>
            <button
              onClick={() => setActiveTab('catalog')}
              className={`btn btn-sm ${activeTab === 'catalog' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Catalog &amp; Stock Availability ({items.length})
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`btn btn-sm ${activeTab === 'profile' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Profile
            </button>
          </div>

          {/* TAB 1: Received Stationery Orders */}
          {activeTab === 'stationery_orders' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {orders.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                  {orders.map(order => (
                    <div key={order.id} className="card card-hover" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: `4px solid ${order.orderStatus === 'DELIVERED' ? 'var(--success)' : 'var(--primary)'}` }}>
                      {/* Header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>STATIONERY ORDER</div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{order.id}</div>
                        </div>
                        <Badge status={order.orderStatus} />
                      </div>

                      {/* Customer & Location */}
                      <div style={{ background: 'var(--bg-app)', padding: '0.75rem', borderRadius: '12px', fontSize: '0.85rem' }}>
                        <div style={{ fontWeight: 700 }}>{order.customerName}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{order.customerPhone}</div>
                        <div style={{ color: 'var(--danger)', fontWeight: 700, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={13} /> {order.deliveryLocation}
                        </div>
                      </div>

                      {/* Ordered Items */}
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>ITEMS ({order.items?.length})</div>
                        {order.items?.map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                            <span style={{ fontWeight: 700 }}>{item.name} <span style={{ color: 'var(--primary)' }}>x{item.quantity}</span></span>
                            <span style={{ fontWeight: 800 }}>₹{item.price * item.quantity}</span>
                          </div>
                        ))}
                      </div>

                      {/* Total & Action */}
                      <div style={{ marginTop: 'auto', paddingTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>TOTAL BILL</div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>₹{order.totalAmount || order.pricing?.finalPrice}</div>
                        </div>

                        {order.orderStatus === 'PENDING' && (
                          <button className="btn btn-sm btn-primary" onClick={() => handleUpdateOrderStatus(order.id, 'OUT_FOR_DELIVERY')} style={{ gap: '0.3rem' }}>
                            <Truck size={14} /> Dispatch Order
                          </button>
                        )}
                        {order.orderStatus === 'OUT_FOR_DELIVERY' && (
                          <button className="btn btn-sm btn-primary" onClick={() => handleUpdateOrderStatus(order.id, 'DELIVERED')} style={{ gap: '0.3rem', background: 'var(--success)' }}>
                            <CheckCircle size={14} /> Mark Delivered
                          </button>
                        )}
                        {order.orderStatus === 'DELIVERED' && (
                          <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: '0.8rem' }}>✓ Completed</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No stationery orders received yet.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Upload New Item (Camera or Gallery Picker) */}
          {activeTab === 'upload_new' && (
            <div className="card" style={{ maxWidth: '640px', width: '100%', margin: '0 auto', padding: '2rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ width: '54px', height: '54px', borderRadius: '16px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>
                  <PlusCircle size={28} />
                </div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>Upload New Stationery Product</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Add stationery items to your campus store. Students can view and order immediately.
                </p>
              </div>

              <form onSubmit={handleUploadProduct} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                {/* Photo Upload Box (Camera or File Picker) */}
                <div className="input-group">
                  <label className="input-label">Product Image Photo</label>
                  <div style={{
                    border: '2px dashed var(--border-color)',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    textAlign: 'center',
                    background: 'var(--bg-app)',
                    position: 'relative',
                    cursor: 'pointer'
                  }}>
                    {imagePreview ? (
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <img src={imagePreview} alt="Preview" style={{ height: '140px', objectFit: 'contain', borderRadius: '12px' }} />
                        <button
                          type="button"
                          onClick={() => { setImagePreview(null); setUploadForm(f => ({ ...f, imageUrl: '' })); }}
                          style={{ position: 'absolute', top: '-10px', right: '-10px', background: 'var(--danger)', color: '#fff', borderRadius: '50%', padding: '4px', border: 'none', cursor: 'pointer' }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                        <Camera size={32} color="var(--primary)" />
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)' }}>
                          Take Photo with Camera or Browse Gallery
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          PNG, JPG, WEBP formats accepted
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleImageFileChange}
                          style={{ display: 'none' }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Name */}
                <div className="input-group">
                  <label className="input-label">Item Name</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="e.g. Classmate 200pg Spiral Notebook A4"
                    value={uploadForm.name}
                    onChange={e => setUploadForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>

                {/* Category & Price */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group">
                    <label className="input-label">Category</label>
                    <select
                      className="input-field"
                      value={uploadForm.category}
                      onChange={e => setUploadForm(f => ({ ...f, category: e.target.value }))}
                    >
                      <option value="Notebooks">Notebooks</option>
                      <option value="Pens & Markers">Pens &amp; Markers</option>
                      <option value="Lab & Art Supplies">Lab &amp; Art Supplies</option>
                      <option value="Files & Folders">Files &amp; Folders</option>
                      <option value="Tech Accessories">Tech Accessories</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label className="input-label">Price (₹)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      className="input-field"
                      placeholder="e.g. 95"
                      value={uploadForm.price}
                      onChange={e => setUploadForm(f => ({ ...f, price: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Stock Availability Toggle */}
                <div className="input-group">
                  <label className="input-label">Stock Availability</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => setUploadForm(f => ({ ...f, inStock: !f.inStock }))}
                      style={{
                        padding: '0.6rem 1.25rem',
                        borderRadius: 'var(--radius-md)',
                        border: `2px solid ${uploadForm.inStock ? '#10B981' : 'var(--danger)'}`,
                        background: uploadForm.inStock ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: uploadForm.inStock ? '#10B981' : 'var(--danger)',
                        fontWeight: 800,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      {uploadForm.inStock ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      {uploadForm.inStock ? 'Stock Available' : 'Out of Stock'}
                    </button>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Students can only order items marked "Stock Available"
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div className="input-group">
                  <label className="input-label">Product Description (Optional)</label>
                  <textarea
                    className="input-field"
                    rows={3}
                    placeholder="Provide details such as size, page count, or brand..."
                    value={uploadForm.description}
                    onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-lg btn-primary"
                  disabled={uploading}
                  style={{ width: '100%', gap: '0.5rem', marginTop: '0.5rem' }}
                >
                  <Upload size={18} />
                  {uploading ? 'Publishing Product...' : 'Upload & Publish Product'}
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: Catalog & Stock Management */}
          {activeTab === 'catalog' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Manage prices and toggle stock availability (`In Stock` / `Out of Stock`) for your uploaded items:
              </div>

              {items.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                  {items.map(item => (
                    <div key={item.id} className="card card-hover" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
                      <div>
                        {/* Image & Category */}
                        <div style={{ display: 'flex', gap: '0.85rem', marginBottom: '0.75rem' }}>
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '12px' }}
                            onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=60'; }}
                          />
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>{item.category}</span>
                            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0.1rem 0', lineHeight: '1.3' }}>{item.name}</h4>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.description}</div>
                          </div>
                        </div>
                      </div>

                      {/* Stock Toggle & Price Edit */}
                      <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {/* Stock Toggle Button */}
                        <button
                          onClick={() => handleToggleStock(item)}
                          style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '999px',
                            border: 'none',
                            background: item.inStock ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: item.inStock ? '#10B981' : 'var(--danger)',
                            fontWeight: 800,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}
                        >
                          {item.inStock ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                          {item.inStock ? 'Available' : 'Out of Stock'}
                        </button>

                        {/* Price Input */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>₹</span>
                          <input
                            type="number"
                            className="input-field"
                            defaultValue={item.price}
                            style={{ width: '70px', padding: '0.2rem 0.4rem', fontSize: '0.85rem' }}
                            onBlur={(e) => handleUpdatePrice(item, e.target.value)}
                          />
                        </div>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          style={{ padding: '0.35rem', color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                          title="Delete product"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No stationery items uploaded yet. Click "Upload New Item" to add items to your store.
                </div>
              )}
            </div>
          )}

          {/* TAB: Profile */}
          {activeTab === 'profile' && <ProfilePage />}
        </main>

        <Footer />
      </div>
    </div>
  );
}
