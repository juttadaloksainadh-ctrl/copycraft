import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiFetch } from '../utils/api';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import Footer from '../components/common/Footer';
import PrintQueueCard from '../components/dealer/PrintQueueCard';
import Badge from '../components/common/Badge';
import DataTable from '../components/common/DataTable';
import ProfilePage from '../components/common/ProfilePage';
import { Printer, AlertTriangle, CheckCircle2, Package, RefreshCw, BarChart2, MessageSquare, Phone } from 'lucide-react';

export default function DealerDashboard() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [collegeName, setCollegeName] = useState('');
  const [activeTab, setActiveTab] = useState('queue');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDealerQueue();
  }, []);

  const fetchDealerQueue = async (isManualRefresh = false) => {
    setLoading(true);
    try {
      const res = await apiFetch('/dealer/queue');
      if (res.success) {
        setOrders(res.orders || []);
        setInventory(res.inventory || []);
        if (res.collegeName) setCollegeName(res.collegeName);
        if (isManualRefresh) {
          addToast('Print queue & stock refreshed!', 'success');
        }
      }
    } catch (e) {
      addToast('Error loading dealer queue', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const res = await apiFetch(`/dealer/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      if (res.success) {
        const msg = newStatus === 'PRINTED'
          ? `Order ${orderId} marked as PRINTED and moved to Printed Orders!`
          : newStatus === 'OUT_FOR_DELIVERY'
          ? `Order ${orderId} dispatched for delivery!`
          : `Order ${orderId} status updated to ${newStatus}`;
        addToast(msg, 'success');
        fetchDealerQueue();
      } else {
        addToast(res.message, 'error');
      }
    } catch (e) {
      addToast('Failed to update status', 'error');
    }
  };

  const handleStockUpdate = async (itemId, newStock) => {
    try {
      const res = await apiFetch(`/dealer/inventory/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify({ currentStock: Number(newStock) })
      });
      if (res.success) {
        addToast('Stock level updated successfully', 'success');
        fetchDealerQueue();
      }
    } catch (e) {
      addToast('Error updating stock level', 'error');
    }
  };

  const filteredOrders = orders.filter(o => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'ASSIGNED') return o.orderStatus === 'ASSIGNED' || o.orderStatus === 'CREATED' || o.orderStatus === 'PRINTING';
    if (filterStatus === 'PRINTED') return o.orderStatus === 'PRINTED' || o.orderStatus === 'PACKAGING';
    if (filterStatus === 'DELIVERED') return o.orderStatus === 'OUT_FOR_DELIVERY' || o.orderStatus === 'DELIVERED';
    return o.orderStatus === filterStatus;
  });

  const lowStockAlerts = inventory.filter(i => i.status === 'LOW_STOCK' || i.status === 'CRITICAL');

  // Performance calculation - strictly hidden any pricing data
  const completedOrders = orders.filter(o => o.orderStatus === 'DELIVERED' || o.orderStatus === 'OUT_FOR_DELIVERY');
  const totalPagesPrinted = completedOrders.reduce((sum, o) => {
    const pages = o.files?.reduce((acc, f) => acc + (f.pageCount || 1) * (f.quantity || 1), 0) || 0;
    return sum + pages;
  }, 0);

  const inventoryColumns = [
    { header: 'Item Name', accessor: 'itemName', cell: row => <span style={{ fontWeight: 700 }}>{row.itemName}</span> },
    { header: 'Current Stock', accessor: 'currentStock', cell: row => `${row.currentStock} ${row.unit}` },
    { header: 'Min Threshold', accessor: 'minThreshold', cell: row => `${row.minThreshold} ${row.unit}` },
    { header: 'Status', cell: row => <Badge status={row.status === 'IN_STOCK' ? 'PAID' : 'PENDING'} /> },
    {
      header: 'Actions',
      cell: row => (
        <input
          type="number"
          className="input-field"
          defaultValue={row.currentStock}
          style={{ width: '80px', padding: '0.2rem 0.5rem', fontSize: '0.85rem' }}
          onBlur={(e) => handleStockUpdate(row.id, e.target.value)}
        />
      )
    }
  ];

  const pendingCount = orders.filter(o => o.orderStatus === 'ASSIGNED' || o.orderStatus === 'CREATED' || o.orderStatus === 'PRINTING').length;
  const printedCount = orders.filter(o => o.orderStatus === 'PRINTED' || o.orderStatus === 'PACKAGING').length;
  const completedCount = orders.filter(o => o.orderStatus === 'OUT_FOR_DELIVERY' || o.orderStatus === 'DELIVERED').length;

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
              <span className="badge badge-accent" style={{ marginBottom: '0.3rem' }}>DEALER OPERATIONAL HUB</span>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800 }}>{user?.name || 'Suresh Print Hub'}</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{collegeName ? `Campus Station • ${collegeName}` : 'Campus Print Station'}</p>
            </div>

            <button className="btn btn-sm btn-secondary" onClick={() => fetchDealerQueue(true)} disabled={loading} style={{ gap: '0.4rem' }}>
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Refreshing...' : 'Refresh Queue'}
            </button>
          </div>

          {/* TAB 1: Print Job Queue */}
          {activeTab === 'queue' && (
            <>
              {lowStockAlerts.length > 0 && (
                <div className="card animate-fade-in" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid var(--warning)', background: 'var(--warning-bg)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 700, color: 'var(--warning)' }}>
                    <AlertTriangle size={18} /> Low Stock Alert ({lowStockAlerts.length} Item Need Replenishment)
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '0.35rem' }}>
                    {lowStockAlerts.map(i => `${i.itemName} (${i.currentStock} ${i.unit} remaining)`).join(' • ')}
                  </div>
                </div>
              )}

              <div className="mobile-tab-pills">

                {[
                  { id: 'ALL', label: `All Orders (${orders.length})` },
                  { id: 'ASSIGNED', label: `Pending Print (${pendingCount})` },
                  { id: 'PRINTED', label: `Printed Orders (${printedCount})` },
                  { id: 'DELIVERED', label: `Completed (${completedCount})` }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterStatus(tab.id)}
                    className={`btn btn-sm ${filterStatus === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
                {filteredOrders.length > 0 ? (
                  filteredOrders.map(order => (
                    <PrintQueueCard
                      key={order.id}
                      order={order}
                      onStatusChange={handleStatusChange}
                    />
                  ))
                ) : (
                  <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No active orders in this queue filter.
                  </div>
                )}
              </div>
            </>
          )}

          {/* TAB 2: Stock / Inventory Manager */}
          {activeTab === 'inventory' && (
            <DataTable
              columns={inventoryColumns}
              data={inventory}
              title="Station Paper & Toner Stock Levels"
              searchPlaceholder="Search inventory item..."
              exportFileName="dealer-stock-levels"
            />
          )}

          {/* TAB 3: Daily Stats & Performance */}
          {activeTab === 'performance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
                <div className="card">
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>COMPLETED JOBS</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)', margin: '0.2rem 0' }}>
                    {completedOrders.length} Orders
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>100% SLA fulfillment</div>
                </div>

                <div className="card">
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>TOTAL SHEETS PRINTED</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent)', margin: '0.2rem 0' }}>
                    {totalPagesPrinted} A4 Sheets
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Includes simplex & duplex prints</div>
                </div>

                <div className="card">
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>STATION QUALITY RATING</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--success)', margin: '0.2rem 0' }}>
                    4.9 ★★★★★
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>Based on student feedback</div>
                </div>
              </div>

              <DataTable
                columns={[
                  { header: 'Order ID', accessor: 'id', cell: row => <span style={{ fontWeight: 700 }}>{row.id}</span> },
                  { header: 'Completed Date', cell: row => new Date(row.timeline.find(t => t.status === 'DELIVERED' || t.status === 'OUT_FOR_DELIVERY')?.time || row.createdAt).toLocaleDateString() },
                  { header: 'Files Printed', cell: row => `${row.files?.length || 1} Document(s)` }
                ]}
                data={completedOrders}
                title="Completed Print Logs"
                searchPlaceholder="Search order ID..."
                exportFileName="dealer-completed-print-logs"
              />
            </div>
          )}

          {/* TAB 4: Support Contact */}
          {activeTab === 'support' && (
            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
              <MessageSquare size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Need replenishment or technical support?</h3>
              <p style={{ color: 'var(--text-muted)', maxWidth: '450px', margin: '0.5rem auto 1.5rem auto' }}>
                Contact your assigned regional operations coordinator or reach out directly to the CopyCraft central administrator.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                <a href="tel:+919811122233" className="btn btn-primary" style={{ gap: '0.5rem' }}>
                  <Phone size={16} /> Contact Campus Distributor
                </a>
              </div>
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
