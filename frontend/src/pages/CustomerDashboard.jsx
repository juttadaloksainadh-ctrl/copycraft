import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import Footer from '../components/common/Footer';
import Badge from '../components/common/Badge';
import OrderTracker from '../components/customer/OrderTracker';
import Modal from '../components/common/Modal';
import DataTable from '../components/common/DataTable';
import ProfilePage from '../components/common/ProfilePage';
import { Printer, UploadCloud, Clock, Gift, Phone, HelpCircle, Eye, ShieldCheck, Plus, MessageSquare } from 'lucide-react';

export default function CustomerDashboard({ onNavigate }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [activeStaff, setActiveStaff] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tickets, setTickets] = useState([
    { id: 'TCK-101', subject: 'Spiral binding queries', status: 'RESOLVED', createdAt: '2026-08-05T09:00:00Z' }
  ]);
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
    fetchActiveStaff();
  }, []);

  useEffect(() => {
    if (activeTab === 'upload') {
      onNavigate('upload');
      setActiveTab('dashboard'); // Reset tab state
    }
  }, [activeTab]);

  const fetchOrders = async () => {
    try {
      const res = await apiFetch('/orders/my-orders');
      if (res.success) {
        setOrders(res.orders || []);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveStaff = async () => {
    try {
      const res = await apiFetch('/orders/staff/active');
      if (res.success) {
        setActiveStaff(res.staff || []);
      }
    } catch (e) {}
  };

  const handleCreateTicket = (e) => {
    e.preventDefault();
    if (!newTicketSubject.trim()) return;

    const newTicket = {
      id: `TCK-${Math.floor(100 + Math.random() * 900)}`,
      subject: newTicketSubject,
      status: 'OPEN',
      createdAt: new Date().toISOString()
    };
    setTickets([newTicket, ...tickets]);
    setNewTicketSubject('');
    setShowTicketModal(false);
  };

  const columns = [
    { header: 'Order ID', accessor: 'id', cell: row => <span style={{ fontWeight: 700 }}>{row.id}</span> },
    { header: 'Date', accessor: 'createdAt', cell: row => new Date(row.createdAt).toLocaleDateString() },
    { header: 'Files', cell: row => `${row.files?.length || 1} Document(s)` },
    { header: 'Total Price', accessor: 'finalPrice', cell: row => <span style={{ fontWeight: 700, color: 'var(--primary)' }}>₹{row.pricing?.finalPrice}</span> },
    { header: 'Status', cell: row => <Badge status={row.orderStatus} /> },
    {
      header: 'Actions',
      cell: row => (
        <button className="btn btn-sm btn-secondary" onClick={() => setSelectedOrder(row)} style={{ gap: '0.3rem' }}>
          <Eye size={14} /> Track
        </button>
      )
    }
  ];

  const staffColumns = [
    { header: 'Staff Name', accessor: 'name', cell: row => <span style={{ fontWeight: 700 }}>{row.name}</span> },
    { header: 'Role', accessor: 'role', cell: row => <Badge status={row.role === 'dealer' ? 'ADEQUATE' : 'ASSIGNED'} /> },
    { header: 'Campus Station', cell: row => row.collegeName || row.collegeId || '—' },
    {
      header: 'Contact Info',
      accessor: 'phone',
      cell: row => (
        <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
          {row.phone}
        </span>
      )
    }
  ];

  return (
    <div className="dashboard-layout" style={{ minHeight: '100vh', background: 'var(--bg-app)' }}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Navbar />

        <main className="main-content" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* TAB 1: Main Dashboard Overview */}
          {activeTab === 'dashboard' && (
            <>
              {/* Welcome Banner */}
              <div className="card glass-panel animate-fade-in" style={{ padding: '1.75rem', background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--primary-light) 100%)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <span className="badge badge-primary" style={{ marginBottom: '0.4rem' }}>CAMPUS CUSTOMER HUB</span>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Welcome back, {user?.name || 'Student'}! 👋</h2>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      Ready to print your lecture notes or assignment for campus delivery?
                    </p>
                  </div>
                  <button className="btn btn-lg btn-primary" onClick={() => onNavigate('upload')} style={{ gap: '0.5rem' }}>
                    <UploadCloud size={20} />
                    Print New Document
                  </button>
                </div>
              </div>

              {/* Metrics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                <div className="card">
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>TOTAL ORDERS</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)', margin: '0.2rem 0' }}>
                    {orders.length}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>All delivered on time</div>
                </div>

                <div className="card">
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>COPYCRAFT WALLET</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--success)', margin: '0.2rem 0' }}>
                    ₹{user?.walletBalance || 150}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Available referral balance</div>
                </div>

                <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>YOUR DELIVERY PIN</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)', margin: '0.2rem 0', letterSpacing: '3px', fontFamily: 'var(--font-mono)' }}>
                    {user?.deliveryPin}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Share with executive on handover</div>
                </div>

                <div className="card">
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>YOUR REFERRAL CODE</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent)', margin: '0.2rem 0', fontFamily: 'var(--font-mono)' }}>
                    {user?.referralCode || 'ANANYA20'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Share with friends for ₹50 extra</div>
                </div>
              </div>

              {/* Active Print Directory (Dealers & Distributors) */}
              <DataTable
                columns={staffColumns}
                data={activeStaff}
                title="Active Campus Print Stations & coordinators Directory"
                searchPlaceholder="Search active stations..."
                exportFileName="active-campus-print-staff"
              />

              {/* Recent Orders */}
              <DataTable
                columns={columns}
                data={orders.slice(0, 5)}
                title="Recent Print Orders"
                searchPlaceholder="Search order ID or status..."
                exportFileName="my-copycraft-orders"
              />
            </>
          )}

          {/* TAB 2: Order History */}
          {activeTab === 'orders' && (
            <DataTable
              columns={columns}
              data={orders}
              title="All Your Printed Documents History"
              searchPlaceholder="Search order ID or status..."
              exportFileName="my-copycraft-orders"
            />
          )}

          {/* TAB 3: Refer & Earn */}
          {activeTab === 'referrals' && (
            <div className="card glass-panel" style={{ padding: '2.5rem', textAlign: 'center' }}>
              <Gift size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Refer Friends. Get Free Prints.</h3>
              <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto 1.5rem auto', fontSize: '0.95rem' }}>
                Share your unique referral code with classmates. Once they register and place their first order, you both get ₹50 added to your CopyCraft wallets!
              </p>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.75rem 1.5rem',
                background: 'var(--bg-app)',
                borderRadius: 'var(--radius-md)',
                border: '1.5px dashed var(--border-color)',
                fontSize: '1.5rem',
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
                color: 'var(--primary)'
              }}>
                {user?.referralCode || 'ANANYA20'}
              </div>
            </div>
          )}

          {/* TAB 4: Help & Support Center */}
          {activeTab === 'support' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Campus Help Center & Tickets</h3>
                <button className="btn btn-sm btn-primary" onClick={() => setShowTicketModal(true)} style={{ gap: '0.4rem' }}>
                  <Plus size={16} /> Open Support Ticket
                </button>
              </div>

              {/* Help Desk Contact Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1rem',
                marginBottom: '1rem'
              }}>
                <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '1px solid var(--border)' }}>
                  <h4 style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
                    📧 Email Support
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Send your print files or queries directly to:</p>
                  <a href="mailto:copycraftprints@gmail.com" style={{ fontWeight: 600, color: 'var(--text-main)', textDecoration: 'none' }}>
                    copycraftprints@gmail.com
                  </a>
                </div>
                <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '1px solid var(--border)' }}>
                  <h4 style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
                    📞 Hotline Contacts
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Call or WhatsApp for instant delivery support:</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontWeight: 600 }}>
                    <a href="tel:+917981001141" style={{ color: 'var(--text-main)', textDecoration: 'none' }}>+91 79810 01141</a>
                    <a href="tel:+917337219975" style={{ color: 'var(--text-main)', textDecoration: 'none' }}>+91 73372 19975</a>
                  </div>
                </div>
              </div>

              <DataTable
                columns={[
                  { header: 'Ticket ID', accessor: 'id', cell: row => <span style={{ fontWeight: 700 }}>{row.id}</span> },
                  { header: 'Subject Details', accessor: 'subject' },
                  { header: 'Status', cell: row => <Badge status={row.status === 'OPEN' ? 'PENDING' : 'PAID'} /> },
                  { header: 'Created At', cell: row => new Date(row.createdAt).toLocaleDateString() }
                ]}
                data={tickets}
                title="Your Support Tickets"
                searchPlaceholder="Search tickets..."
                exportFileName="my-support-tickets"
              />
            </div>
          )}

          {/* TAB: Profile */}
          {activeTab === 'profile' && <ProfilePage />}
        </main>

        {/* Live Order Tracker Modal */}
        <Modal isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} title="Live Order Tracking" maxWidth="750px">
          <OrderTracker order={selectedOrder} />
        </Modal>

        {/* Support Ticket Modal */}
        <Modal isOpen={showTicketModal} onClose={() => setShowTicketModal(false)} title="Create Support Ticket" maxWidth="450px">
          <form onSubmit={handleCreateTicket} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="input-group">
              <label className="input-label">Explain your print query / issue</label>
              <textarea
                required
                className="input-field"
                rows={4}
                placeholder="e.g. Spiral binding query on my Computer Networks assignment..."
                value={newTicketSubject}
                onChange={e => setNewTicketSubject(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-lg btn-primary">
              Submit Ticket
            </button>
          </form>
        </Modal>

        <Footer />
      </div>
    </div>
  );
}
