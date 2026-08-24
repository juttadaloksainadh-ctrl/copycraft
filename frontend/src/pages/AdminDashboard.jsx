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
import {
  DollarSign,
  TrendingUp,
  Users,
  Building2,
  Package,
  Tag,
  ShieldCheck,
  Plus,
  RefreshCw,
  Sliders,
  Trash2,
  Edit,
  AlertOctagon,
  FileText
} from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [analytics, setAnalytics] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('admin_dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showCollegeModal, setShowCollegeModal] = useState(false);
  const [editingCollege, setEditingCollege] = useState(null);

  // New Coupon Form State
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discountPercentage: 15,
    maxDiscount: 50,
    minOrderValue: 100
  });

  // Staff Form State
  const [editingStaff, setEditingStaff] = useState(null);
  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'dealer',
    collegeIds: []
  });

  // College Form State
  const [collegeForm, setCollegeForm] = useState({
    name: '',
    code: '',
    city: '',
    deliveryLocations: 'Hostel 4, Hostel 12, LTC Hall A'
  });

  // Dynamic Pricing Rates State
  const [pricingRates, setPricingRates] = useState({
    bwRate: 1.50,
    colorRate: 6.00,
    spiralRate: 35,
    softcoverRate: 65,
    hardcoverRate: 130,
    laminationRate: 25,
    convenienceFeeRate: 2.6
  });

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async (isManualRefresh = false) => {
    setLoading(true);
    try {
      const [resAnalytics, resUsers, resCoupons, resLogs, resColleges, resPricing] = await Promise.all([
        apiFetch('/admin/analytics'),
        apiFetch('/admin/users'),
        apiFetch('/admin/coupons'),
        apiFetch('/admin/audit-logs'),
        apiFetch('/orders/colleges'),
        apiFetch('/orders/pricing-rates')
      ]);

      if (resAnalytics.success) {
        setAnalytics(resAnalytics);
        setOrders(resAnalytics.allOrders || resAnalytics.orders || resAnalytics.recentOrders || []);
      }
      if (resUsers.success) setUsersList(resUsers.users || []);
      if (resCoupons.success) setCoupons(resCoupons.coupons || []);
      if (resLogs.success) setAuditLogs(resLogs.auditLogs || []);
      if (resColleges.success) {
        setColleges(resColleges.colleges || []);
        if (resColleges.colleges?.length > 0) {
          setStaffForm(prev => ({ ...prev, collegeId: resColleges.colleges[0].id }));
        }
      }
      if (resPricing.success && resPricing.pricingRates) {
        const pr = resPricing.pricingRates;
        setPricingRates({
          bwRate: pr.printMode?.bw ?? 1.50,
          colorRate: pr.printMode?.color ?? 6.00,
          spiralRate: pr.binding?.spiral ?? 35,
          softcoverRate: pr.binding?.softcover ?? 65,
          hardcoverRate: pr.binding?.hardcover ?? 130,
          laminationRate: pr.lamination?.both ?? 25,
          convenienceFeeRate: Number((pr.convenienceFeeRate !== undefined ? pr.convenienceFeeRate * 100 : 2.6).toFixed(1))
        });
      }
      if (isManualRefresh) {
        addToast('Admin analytics & multi-campus orders refreshed!', 'success');
      }
    } catch (e) {
      addToast('Error fetching executive analytics', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/admin/coupons', {
        method: 'POST',
        body: JSON.stringify(newCoupon)
      });
      if (res.success) {
        addToast(`Coupon '${newCoupon.code}' created successfully!`, 'success');
        setShowCouponModal(false);
        setNewCoupon({ code: '', discountPercentage: 15, maxDiscount: 50, minOrderValue: 100 });
        fetchAdminData();
      } else {
        addToast(res.message, 'error');
      }
    } catch (e) {
      addToast('Coupon creation failed', 'error');
    }
  };

  const handleCreateOrUpdateStaff = async (e) => {
    e.preventDefault();
    try {
      if (!staffForm.collegeIds || staffForm.collegeIds.length === 0) {
        addToast('Please select at least one assigned campus for this staff account', 'warning');
        return;
      }

      let res;
      if (editingStaff) {
        res = await apiFetch(`/admin/staff/${editingStaff.id}`, {
          method: 'PUT',
          body: JSON.stringify(staffForm)
        });
      } else {
        res = await apiFetch('/admin/staff', {
          method: 'POST',
          body: JSON.stringify(staffForm)
        });
      }

      if (res.success) {
        addToast(editingStaff ? `Staff account '${staffForm.name}' updated successfully!` : `${staffForm.role.toUpperCase()} account created successfully!`, 'success');
        setShowStaffModal(false);
        setEditingStaff(null);
        setStaffForm({
          name: '',
          email: '',
          password: '',
          phone: '',
          role: 'dealer',
          collegeIds: colleges.length > 0 ? [colleges[0].id] : []
        });
        fetchAdminData();
      } else {
        addToast(res.message, 'error');
      }
    } catch (e) {
      addToast('Failed to save staff account', 'error');
    }
  };

  const handleDeleteStaff = async (userId) => {
    if (!confirm('Are you sure you want to permanently delete this user account? They will lose access immediately.')) return;
    try {
      const res = await apiFetch(`/admin/users/${userId}`, { method: 'DELETE' });
      if (res.success) {
        addToast('User account deleted successfully', 'success');
        fetchAdminData();
      } else {
        addToast(res.message, 'error');
      }
    } catch (e) {
      addToast('Error deleting user account', 'error');
    }
  };

  const handleCreateOrUpdateCollege = async (e) => {
    e.preventDefault();
    const payload = {
      ...collegeForm,
      deliveryLocations: typeof collegeForm.deliveryLocations === 'string' 
        ? collegeForm.deliveryLocations.split(',').map(s => s.trim()) 
        : collegeForm.deliveryLocations
    };

    try {
      let res;
      if (editingCollege) {
        res = await apiFetch(`/admin/colleges/${editingCollege.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        res = await apiFetch('/admin/colleges', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      if (res.success) {
        addToast(editingCollege ? 'College updated successfully!' : 'College added successfully!', 'success');
        setShowCollegeModal(false);
        setEditingCollege(null);
        setCollegeForm({ name: '', code: '', city: '', deliveryLocations: '' });
        fetchAdminData();
      } else {
        addToast(res.message, 'error');
      }
    } catch (e) {
      addToast('Failed to save college station', 'error');
    }
  };

  const handleDeleteCollege = async (collegeId) => {
    if (!confirm('Are you sure you want to delete this college station?')) return;
    try {
      const res = await apiFetch(`/admin/colleges/${collegeId}`, { method: 'DELETE' });
      if (res.success) {
        addToast('College station deleted successfully', 'success');
        fetchAdminData();
      } else {
        addToast(res.message, 'error');
      }
    } catch (e) {
      addToast('Error deleting college', 'error');
    }
  };

  const handleSavePricing = async (e) => {
    e.preventDefault();
    setSavingPricing(true);
    try {
      const res = await apiFetch('/admin/pricing', {
        method: 'PUT',
        body: JSON.stringify({
          printMode: { bw: Number(pricingRates.bwRate), color: Number(pricingRates.colorRate) },
          binding: {
            staple: 5,
            spiral: Number(pricingRates.spiralRate),
            softcover: Number(pricingRates.softcoverRate),
            hardcover: Number(pricingRates.hardcoverRate)
          },
          lamination: { front: 15, both: Number(pricingRates.laminationRate), full: 45 },
          convenienceFeeRate: Number((Number(pricingRates.convenienceFeeRate) / 100).toFixed(4))
        })
      });
      if (res.success) {
        addToast('Printing rates & convenience fee updated in real-time!', 'success');
        fetchAdminData();
      } else {
        addToast(res.message, 'error');
      }
    } catch (e) {
      addToast('Failed to update pricing rates', 'error');
    } finally {
      setSavingPricing(false);
    }
  };

  // User columns with multi-college badge and edit/delete buttons
  const userColumns = [
    { header: 'Name', accessor: 'name', cell: row => <span style={{ fontWeight: 700 }}>{row.name}</span> },
    { header: 'Email ID', accessor: 'email' },
    { header: 'Role', accessor: 'role', cell: row => <Badge status={row.role.toUpperCase()} /> },
    { header: 'Contact Phone', accessor: 'phone' },
    {
      header: 'Assigned Campuses',
      cell: row => {
        if (['admin', 'super_admin'].includes(row.role)) {
          return <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>Central Command</span>;
        }

        const assigned = Array.isArray(row.collegeIds) && row.collegeIds.length > 0
          ? row.collegeIds
          : (row.collegeId ? [row.collegeId] : []);

        if (assigned.length === 0) {
          return <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Unassigned</span>;
        }

        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', maxWidth: '280px' }}>
            {assigned.map(cid => {
              const clg = colleges.find(c => c.id === cid);
              return (
                <span
                  key={cid}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  {clg ? clg.name : cid}
                </span>
              );
            })}
          </div>
        );
      }
    },
    {
      header: 'Actions',
      cell: row => (
        !['admin', 'super_admin'].includes(row.role) ? (
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => {
                setEditingStaff(row);
                setStaffForm({
                  name: row.name || '',
                  email: row.email || '',
                  password: '',
                  phone: row.phone || '',
                  role: row.role || 'dealer',
                  collegeIds: Array.isArray(row.collegeIds) && row.collegeIds.length > 0
                    ? row.collegeIds
                    : (row.collegeId ? [row.collegeId] : [])
                });
                setShowStaffModal(true);
              }}
              style={{ padding: '0.25rem 0.5rem' }}
            >
              <Edit size={13} /> Edit
            </button>
            <button
              className="btn btn-sm btn-danger"
              onClick={() => handleDeleteStaff(row.id)}
              style={{ gap: '0.2rem', padding: '0.25rem 0.5rem' }}
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>System Protected</span>
      )
    }
  ];

  // College columns with edit/delete buttons
  const collegeColumns = [
    { header: 'College Name', accessor: 'name', cell: row => <span style={{ fontWeight: 700 }}>{row.name}</span> },
    { header: 'Code', accessor: 'code' },
    { header: 'City', accessor: 'city' },
    { header: 'Delivery Hubs', cell: row => row.deliveryLocations?.join(' • ') || 'Main Academic Hall' },
    {
      header: 'Actions',
      cell: row => (
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => {
              setEditingCollege(row);
              setCollegeForm({
                name: row.name,
                code: row.code,
                city: row.city,
                deliveryLocations: row.deliveryLocations?.join(', ') || ''
              });
              setShowCollegeModal(true);
            }}
            style={{ padding: '0.25rem 0.5rem' }}
          >
            <Edit size={13} /> Edit
          </button>
          <button
            className="btn btn-sm btn-danger"
            onClick={() => handleDeleteCollege(row.id)}
            style={{ padding: '0.25rem 0.5rem' }}
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
      )
    }
  ];

  // Complete orders column detailing specs and location
  const orderColumns = [
    { header: 'Order ID', accessor: 'id', cell: row => <span style={{ fontWeight: 700 }}>{row.id}</span> },
    { header: 'Customer', cell: row => <div><div>{row.customerName}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{row.customerPhone}</div></div> },
    { header: 'College Campus', cell: row => row.collegeName || '—' },
    {
      header: 'Print Specifications',
      cell: row => (
        <div style={{ fontSize: '0.75rem', lineHeight: 1.3 }}>
          {row.files?.map((f, i) => (
            <div key={i} style={{ borderBottom: i < row.files.length - 1 ? '1px solid var(--border-color)' : 'none', padding: '2px 0' }}>
              • {f.name} ({f.pageCount || 1} pgs x {f.quantity || 1}) - <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{f.printMode}</span>, {f.binding} binding
            </div>
          ))}
        </div>
      )
    },
    { header: 'Delivery Location', accessor: 'deliveryLocation' },
    { header: 'Total Paid', cell: row => <span style={{ fontWeight: 700, color: 'var(--success)' }}>₹{row.pricing?.finalPrice}</span> },
    { header: 'Status', cell: row => <Badge status={row.orderStatus} /> }
  ];

  const couponColumns = [
    { header: 'Coupon Code', accessor: 'code', cell: row => <span style={{ fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>{row.code}</span> },
    { header: 'Discount', accessor: 'discountPercentage', cell: row => `${row.discountPercentage}% OFF` },
    { header: 'Max Discount', accessor: 'maxDiscount', cell: row => `₹${row.maxDiscount}` },
    { header: 'Min Order', accessor: 'minOrderValue', cell: row => `₹${row.minOrderValue}` },
    { header: 'Status', cell: () => <Badge status="PAID" /> }
  ];

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

        <main className="main-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Executive Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span className="badge badge-primary" style={{ marginBottom: '0.3rem' }}>EXECUTIVE COMMAND CENTER</span>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800 }}>CopyCraft Enterprise Analytics</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Real-time revenue, multi-campus growth & infrastructure monitoring</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {activeTab === 'users' && (
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => {
                    setEditingStaff(null);
                    setStaffForm({
                      name: '',
                      email: '',
                      password: '',
                      phone: '',
                      role: 'dealer',
                      collegeIds: colleges.length > 0 ? [colleges[0].id] : []
                    });
                    setShowStaffModal(true);
                  }}
                  style={{ gap: '0.4rem' }}
                >
                  <Plus size={16} /> Create Staff Account
                </button>
              )}
              {activeTab === 'colleges' && (
                <button className="btn btn-sm btn-primary" onClick={() => { setEditingCollege(null); setShowCollegeModal(true); }} style={{ gap: '0.4rem' }}>
                  <Plus size={16} /> Add College Station
                </button>
              )}
              {activeTab === 'coupons' && (
                <button className="btn btn-sm btn-primary" onClick={() => setShowCouponModal(true)} style={{ gap: '0.4rem' }}>
                  <Plus size={16} /> Create Promo Coupon
                </button>
              )}
              <button className="btn btn-sm btn-secondary" onClick={() => fetchAdminData(true)} disabled={loading} style={{ gap: '0.4rem' }}>
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                <span className="hide-on-mobile">{loading ? 'Refreshing...' : 'Sync Data'}</span>
              </button>
            </div>
          </div>

          {/* TAB 1: Analytics & Executive Dashboard */}
          {activeTab === 'admin_dashboard' && (
            <>
              {/* Business Metrics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '1rem' }}>
                <div className="card">
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>TOTAL REVENUE</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--success)', margin: '0.2rem 0' }}>
                    ₹{loading ? '—' : (analytics?.metrics?.totalRevenue?.toLocaleString() ?? 0)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <TrendingUp size={14} /> +24.8% Month Over Month
                  </div>
                </div>

                <div className="card">
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>TOTAL ORDERS</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)', margin: '0.2rem 0' }}>
                    {loading ? '—' : (analytics?.metrics?.totalOrders?.toLocaleString() ?? 0)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Processed across active campuses</div>
                </div>

                <div className="card">
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>TOTAL CUSTOMERS</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent)', margin: '0.2rem 0' }}>
                    {loading ? '—' : (analytics?.metrics?.totalCustomers?.toLocaleString() ?? 0)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active student accounts</div>
                </div>

                <div className="card">
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>STOCK ALERTS</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--warning)', margin: '0.2rem 0' }}>
                    {loading ? '—' : (analytics?.metrics?.lowStockCount ?? 0)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--warning)' }}>Requires dealer restocking</div>
                </div>
              </div>

              {/* Revenue Chart Visualizer */}
              <div className="card" style={{ padding: '1.5rem' }}>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1.25rem' }}>
                  Monthly Revenue Growth Trajectory (INR ₹)
                </h4>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', height: '180px', paddingTop: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                  {analytics?.charts?.revenueChartData.map((item, idx) => {
                    const maxRev = 120000;
                    const heightPercent = Math.min(100, Math.max(15, (item.revenue / maxRev) * 100));
                    return (
                      <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', height: '100%', justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>₹{(item.revenue / 1000).toFixed(0)}k</span>
                        <div style={{
                          width: '100%',
                          maxWidth: '40px',
                          height: `${heightPercent}%`,
                          background: 'linear-gradient(180deg, var(--primary) 0%, var(--accent) 100%)',
                          borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                          transition: 'height 0.4s ease'
                        }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* TAB 2: Complete Orders specifications & delivery location (irrespective of college) */}
          {activeTab === 'orders' && (
            <DataTable
              columns={orderColumns}
              data={orders}
              title="Global Multi-Campus Print Orders Queue"
              searchPlaceholder="Search order ID, location, specifications..."
              exportFileName="copycraft-global-orders-log"
            />
          )}

          {/* TAB 3: User & Staff Accounts creation / deletion */}
          {activeTab === 'users' && (
            <DataTable
              columns={userColumns}
              data={usersList}
              title="Campus User & Staff Directory"
              searchPlaceholder="Search name, email ID, role..."
              exportFileName="copycraft-users-directory"
            />
          )}

          {/* TAB 4: College Coverage Availability */}
          {activeTab === 'colleges' && (
            <DataTable
              columns={collegeColumns}
              data={colleges}
              title="Active Coverage Colleges & Stations"
              searchPlaceholder="Search college name, code, city..."
              exportFileName="copycraft-active-colleges"
            />
          )}

          {/* TAB 5: Dynamic Pricing Configuration */}
          {activeTab === 'pricing' && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sliders size={18} color="var(--primary)" />
                  Global Dynamic Pricing Engine Matrix
                </h4>
                <button className="btn btn-sm btn-primary" onClick={handleUpdatePricing}>
                  Save Pricing Rates
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="input-group">
                  <label className="input-label">B&W Rate (₹ / page)</label>
                  <input
                    type="number"
                    step="0.10"
                    className="input-field"
                    value={pricingRates.bwRate}
                    onChange={e => setPricingRates({ ...pricingRates, bwRate: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Colour Rate (₹ / page)</label>
                  <input
                    type="number"
                    step="0.50"
                    className="input-field"
                    value={pricingRates.colorRate}
                    onChange={e => setPricingRates({ ...pricingRates, colorRate: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Spiral Binding (₹)</label>
                  <input
                    type="number"
                    className="input-field"
                    value={pricingRates.spiralRate}
                    onChange={e => setPricingRates({ ...pricingRates, spiralRate: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Softcover Thermal (₹)</label>
                  <input
                    type="number"
                    className="input-field"
                    value={pricingRates.softcoverRate}
                    onChange={e => setPricingRates({ ...pricingRates, softcoverRate: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Hardcover Deluxe (₹)</label>
                  <input
                    type="number"
                    className="input-field"
                    value={pricingRates.hardcoverRate}
                    onChange={e => setPricingRates({ ...pricingRates, hardcoverRate: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Lamination (₹ / side)</label>
                  <input
                    type="number"
                    className="input-field"
                    value={pricingRates.laminationRate}
                    onChange={e => setPricingRates({ ...pricingRates, laminationRate: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Convenience Fee (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="input-field"
                    value={pricingRates.convenienceFeeRate}
                    onChange={e => setPricingRates({ ...pricingRates, convenienceFeeRate: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: Coupons */}
          {activeTab === 'coupons' && (
            <DataTable
              columns={couponColumns}
              data={coupons}
              title="Promotional Coupons & Referral Campaigns"
              searchPlaceholder="Search coupon code..."
              exportFileName="copycraft-coupons"
            />
          )}

          {/* TAB 7: Security Audit Logs & Security Alerts */}
          {activeTab === 'audit' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="card" style={{ padding: '1rem', borderLeft: '4px solid var(--danger)', background: 'var(--danger-bg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, color: 'var(--danger)' }}>
                  <AlertOctagon size={20} /> INTRUSION DETECTION SENTINEL ACTIVE
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '0.35rem' }}>
                  All failed login attempts to Dealer, Distributor or Admin portals are logged below immediately as security events.
                </div>
              </div>

              <DataTable
                columns={[
                  { header: 'Event ID', accessor: 'id', cell: row => <span style={{ fontWeight: 700 }}>{row.id}</span> },
                  { header: 'Action Event', accessor: 'action', cell: row => <span style={{ color: row.isAlert ? 'var(--danger)' : 'var(--text-main)', fontWeight: row.isAlert ? 700 : 500 }}>{row.action}</span> },
                  { header: 'Audit Details', accessor: 'details' },
                  { header: 'Security Severity', cell: row => row.isAlert ? <span className="badge badge-danger">CRITICAL ALERT</span> : <span className="badge badge-primary">INFO</span> },
                  { header: 'Timestamp', accessor: 'timestamp', cell: row => new Date(row.timestamp).toLocaleString() }
                ]}
                data={auditLogs}
                title="System Security & Operations Audit Trail Logs"
                searchPlaceholder="Search audit events..."
                exportFileName="copycraft-audit-logs"
              />
            </div>
          )}

          {/* TAB: Profile */}
          {activeTab === 'profile' && <ProfilePage />}
        </main>

        {/* Create Coupon Modal */}
        <Modal isOpen={showCouponModal} onClose={() => setShowCouponModal(false)} title="Create Promo Coupon" maxWidth="450px">
          <form onSubmit={handleCreateCoupon} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="input-group">
              <label className="input-label">Coupon Code (Uppercase)</label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="e.g. EXAM100"
                value={newCoupon.code}
                onChange={e => setNewCoupon({ ...newCoupon, code: e.target.value })}
                style={{ textTransform: 'uppercase' }}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Discount Percentage (%)</label>
              <input
                type="number"
                required
                min={1}
                max={100}
                className="input-field"
                value={newCoupon.discountPercentage}
                onChange={e => setNewCoupon({ ...newCoupon, discountPercentage: e.target.value })}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Max Discount Cap (₹)</label>
              <input
                type="number"
                required
                className="input-field"
                value={newCoupon.maxDiscount}
                onChange={e => setNewCoupon({ ...newCoupon, maxDiscount: e.target.value })}
              />
            </div>

            <button type="submit" className="btn btn-lg btn-primary" style={{ marginTop: '0.5rem' }}>
              Publish Coupon
            </button>
          </form>
        </Modal>

        {/* Create / Edit Staff Account Modal */}
        <Modal
          isOpen={showStaffModal}
          onClose={() => { setShowStaffModal(false); setEditingStaff(null); }}
          title={editingStaff ? `Edit Staff Account (${editingStaff.name})` : "Create Staff Account"}
          maxWidth="520px"
        >
          <form onSubmit={handleCreateOrUpdateStaff} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="input-group">
              <label className="input-label">Staff Role</label>
              <select
                className="input-field"
                value={staffForm.role}
                onChange={e => setStaffForm({ ...staffForm, role: e.target.value })}
              >
                <option value="dealer">Print Dealer (Hostel & Campus Station)</option>
                <option value="distributor">Delivery Coordinator (Distributor)</option>
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="e.g. Suresh Kumar"
                value={staffForm.name}
                onChange={e => setStaffForm({ ...staffForm, name: e.target.value })}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Login Email ID</label>
              <input
                type="email"
                required
                className="input-field"
                placeholder="e.g. suresh@copycraft.com"
                value={staffForm.email}
                onChange={e => setStaffForm({ ...staffForm, email: e.target.value })}
              />
            </div>

            <div className="input-group">
              <label className="input-label">
                Password {editingStaff && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>(Leave blank to keep unchanged)</span>}
              </label>
              <input
                type="password"
                required={!editingStaff}
                className="input-field"
                placeholder={editingStaff ? "Enter new password if changing" : "Choose password"}
                value={staffForm.password}
                onChange={e => setStaffForm({ ...staffForm, password: e.target.value })}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Contact Number</label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="e.g. +91 97222 33344"
                value={staffForm.phone}
                onChange={e => setStaffForm({ ...staffForm, phone: e.target.value })}
              />
            </div>

            {/* Multi-College Assignment Selection */}
            <div className="input-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <label className="input-label" style={{ marginBottom: 0 }}>
                  Assigned Campuses ({staffForm.collegeIds?.length || 0} Selected)
                </label>
                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <button
                    type="button"
                    onClick={() => setStaffForm({ ...staffForm, collegeIds: colleges.map(c => c.id) })}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                  >
                    Select All
                  </button>
                  <span style={{ color: 'var(--border-color)' }}>|</span>
                  <button
                    type="button"
                    onClick={() => setStaffForm({ ...staffForm, collegeIds: [] })}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
                maxHeight: '190px',
                overflowY: 'auto',
                padding: '0.6rem',
                background: 'var(--bg-app)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)'
              }}>
                {colleges.length > 0 ? (
                  colleges.map(c => {
                    const isChecked = (staffForm.collegeIds || []).includes(c.id);
                    return (
                      <label
                        key={c.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.65rem',
                          padding: '0.45rem 0.65rem',
                          borderRadius: 'var(--radius-sm)',
                          background: isChecked ? 'var(--primary-light)' : 'transparent',
                          border: isChecked ? '1px solid var(--border-focus)' : '1px solid transparent',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: isChecked ? 700 : 500,
                          color: isChecked ? 'var(--primary)' : 'var(--text-main)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            const current = staffForm.collegeIds || [];
                            if (e.target.checked) {
                              setStaffForm({ ...staffForm, collegeIds: [...current, c.id] });
                            } else {
                              setStaffForm({ ...staffForm, collegeIds: current.filter(id => id !== c.id) });
                            }
                          }}
                          style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }}
                        />
                        <span style={{ flex: 1 }}>{c.name} <span style={{ opacity: 0.7, fontSize: '0.75rem' }}>({c.city})</span></span>
                      </label>
                    );
                  })
                ) : (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0.5rem', textAlign: 'center' }}>
                    No colleges added yet. Please add college stations first.
                  </div>
                )}
              </div>
            </div>

            <button type="submit" className="btn btn-lg btn-primary" style={{ marginTop: '0.5rem' }}>
              {editingStaff ? 'Save Staff Changes' : 'Register Staff User'}
            </button>
          </form>
        </Modal>

        {/* Create / Edit College Modal */}
        <Modal isOpen={showCollegeModal} onClose={() => setShowCollegeModal(false)} title={editingCollege ? "Edit College Station" : "Add College Coverage Station"} maxWidth="480px">
          <form onSubmit={handleCreateOrUpdateCollege} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="input-group">
              <label className="input-label">College name</label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="e.g. Indian Institute of Technology Bombay"
                value={collegeForm.name}
                onChange={e => setCollegeForm({ ...collegeForm, name: e.target.value })}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Unique Code (Shortname)</label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="e.g. IITB"
                value={collegeForm.code}
                onChange={e => setCollegeForm({ ...collegeForm, code: e.target.value })}
              />
            </div>

            <div className="input-group">
              <label className="input-label">City location</label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="e.g. Mumbai"
                value={collegeForm.city}
                onChange={e => setCollegeForm({ ...collegeForm, city: e.target.value })}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Supported Delivery Locations (Comma separated)</label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="e.g. Hostel 4, Hostel 12, LTC Hall A"
                value={collegeForm.deliveryLocations}
                onChange={e => setCollegeForm({ ...collegeForm, deliveryLocations: e.target.value })}
              />
            </div>

            <button type="submit" className="btn btn-lg btn-primary" style={{ marginTop: '0.5rem' }}>
              {editingCollege ? "Save Changes" : "Create College Hub"}
            </button>
          </form>
        </Modal>

        <Footer />
      </div>
    </div>
  );
}
