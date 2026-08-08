import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiFetch } from '../utils/api';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import Footer from '../components/common/Footer';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import ProfilePage from '../components/common/ProfilePage';
import { Truck, Building2, Users, DollarSign, UserCheck, RefreshCw, Phone, ShieldCheck } from 'lucide-react';

export default function DistributorDashboard() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('distributor_dashboard');
  const [assignModalOrder, setAssignModalOrder] = useState(null);
  const [selectedDealerId, setSelectedDealerId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/distributor/dashboard');
      if (res.success) {
        setData(res);
      }
    } catch (e) {
      addToast('Error fetching distributor dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignDealer = async () => {
    if (!selectedDealerId) return;
    try {
      const res = await apiFetch('/distributor/assign-dealer', {
        method: 'POST',
        body: JSON.stringify({ orderId: assignModalOrder.id, dealerId: selectedDealerId })
      });
      if (res.success) {
        addToast(`Order ${assignModalOrder.id} assigned successfully`, 'success');
        setAssignModalOrder(null);
        setSelectedDealerId('');
        fetchDashboard();
      } else {
        addToast(res.message, 'error');
      }
    } catch (e) {
      addToast('Assignment failed', 'error');
    }
  };

  const collegeColumns = [
    { header: 'College Name', accessor: 'name', cell: row => <span style={{ fontWeight: 700 }}>{row.name}</span> },
    { header: 'City', accessor: 'city' },
    { header: 'Active Dealers', accessor: 'activeDealers' },
    { header: 'Total Orders', accessor: 'orderCount' }
  ];

  const dealerColumns = [
    { header: 'Dealer Name', accessor: 'name', cell: row => <span style={{ fontWeight: 700 }}>{row.name}</span> },
    { header: 'College Station', cell: row => row.collegeId === 'clg_1' ? 'IIT Bombay' : 'BITS Pilani' },
    {
      header: 'Contact Number',
      accessor: 'phone',
      cell: row => (
        <a href={`tel:${row.phone}`} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
          <Phone size={14} /> {row.phone || '+91 97222 33344'}
        </a>
      )
    }
  ];

  const orderColumns = [
    { header: 'Order ID', accessor: 'id', cell: row => <span style={{ fontWeight: 700 }}>{row.id}</span> },
    {
      header: 'Customer Details',
      cell: row => (
        <div>
          <div style={{ fontWeight: 700 }}>{row.customerName || 'Student User'}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.customerPhone || 'N/A'}</div>
        </div>
      )
    },
    {
      header: 'Academic Details',
      cell: row => (
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{row.collegeName || 'IIT Bombay'}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.yearOfStudy || '3rd Year'} • {row.branch || 'Computer Science'}</div>
        </div>
      )
    },
    { header: 'Delivery Location', accessor: 'deliveryLocation', cell: row => <span style={{ fontSize: '0.85rem' }}>{row.deliveryLocation}</span> },
    {
      header: 'Assigned Dealer',
      cell: row => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.dealerName || 'Unassigned'}</div>
          {row.dealerPhone && (
            <div style={{ fontSize: '0.75rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '2px' }}>
              <Phone size={11} /> {row.dealerPhone}
            </div>
          )}
        </div>
      )
    },
    { header: 'Status', cell: row => <Badge status={row.orderStatus} /> },
    {
      header: 'Action',
      cell: row => (
        <button
          className="btn btn-sm btn-secondary"
          onClick={() => {
            setAssignModalOrder(row);
            setSelectedDealerId(row.dealerId || '');
          }}
          style={{ gap: '0.3rem', fontSize: '0.75rem' }}
        >
          <UserCheck size={13} /> Reassign
        </button>
      )
    }
  ];

  return (
    <div className="dashboard-layout" style={{ minHeight: '100vh', background: 'var(--bg-app)' }}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Navbar />

        <main className="main-content" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span className="badge badge-primary" style={{ marginBottom: '0.3rem' }}>DISTRIBUTOR HUB</span>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>{user?.name || 'Campus Operations Center'}</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Managing IIT Bombay & Regional College Print Operations</p>
            </div>
            <button className="btn btn-sm btn-secondary" onClick={fetchDashboard}>
              <RefreshCw size={15} /> Sync Analytics
            </button>
          </div>

          {/* Conditional Tab Rendering */}
          {activeTab === 'distributor_dashboard' && (
            <>
              {/* Metrics Overview Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                <div className="card">
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>TOTAL COLLEGES</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)', margin: '0.2rem 0' }}>
                    {data?.stats?.totalColleges || 3}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>Active campus networks</div>
                </div>

                <div className="card">
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>ACTIVE DEALERS</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent)', margin: '0.2rem 0' }}>
                    {data?.stats?.activeDealers || 4}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>Hostel print hubs</div>
                </div>

                <div className="card">
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>TOTAL ACTIVE ORDERS</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--success)', margin: '0.2rem 0' }}>
                    {data?.stats?.totalOrders || 8} Orders
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Operations print load</div>
                </div>
              </div>

              <DataTable
                columns={orderColumns}
                data={data?.recentOrders || []}
                title="Active Campus Print Orders"
                searchPlaceholder="Search order ID, customer details, status..."
                exportFileName="distributor-active-orders"
              />
            </>
          )}

          {activeTab === 'dealers' && (
            <DataTable
              columns={dealerColumns}
              data={data?.dealers || []}
              title="Campus Print Stations (Dealers Directory)"
              searchPlaceholder="Search dealer name or station..."
              exportFileName="campus-dealers-directory"
            />
          )}

          {activeTab === 'colleges' && (
            <DataTable
              columns={collegeColumns}
              data={data?.collegeStats || []}
              title="Campus Network Metrics"
              searchPlaceholder="Search college or city..."
              exportFileName="distributor-college-report"
            />
          )}

          {activeTab === 'reports' && (
            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
              <Building2 size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Campus Print Load & SLA Reports</h3>
              <p style={{ color: 'var(--text-muted)', maxWidth: '450px', margin: '0.5rem auto 1.5rem auto' }}>
                Operational print volume and delivery performance metrics are healthy. Irrespective of individual college lines, student SLA fulfillment is currently at 98.4%.
              </p>
            </div>
          )}

          {/* TAB: Profile */}
          {activeTab === 'profile' && <ProfilePage />}
        </main>

        {/* Assign Dealer Modal */}
        <Modal
          isOpen={!!assignModalOrder}
          onClose={() => setAssignModalOrder(null)}
          title={`Assign Dealer to Order #${assignModalOrder?.id}`}
          maxWidth="450px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ background: 'var(--bg-app)', padding: '1rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 700, marginBottom: '0.35rem' }}>Order Details</div>
              <div>Customer: {assignModalOrder?.customerName}</div>
              <div>College: {assignModalOrder?.collegeName || 'IIT Bombay'}</div>
              <div>Destination: {assignModalOrder?.deliveryLocation}</div>
            </div>

            <div className="input-group">
              <label className="input-label">Select Campus Dealer</label>
              <select
                className="input-field"
                value={selectedDealerId}
                onChange={e => setSelectedDealerId(e.target.value)}
              >
                <option value="">-- Choose Print Station --</option>
                {data?.dealers
                  ?.filter(d => d.collegeId === assignModalOrder?.collegeId)
                  ?.map(dealer => (
                    <option key={dealer.id} value={dealer.id}>
                      {dealer.name} ({dealer.phone})
                    </option>
                  ))}
              </select>
            </div>

            <button
              className="btn btn-lg btn-primary"
              onClick={handleAssignDealer}
              disabled={!selectedDealerId}
              style={{ width: '100%' }}
            >
              Confirm Assignment
            </button>
          </div>
        </Modal>

        <Footer />
      </div>
    </div>
  );
}
