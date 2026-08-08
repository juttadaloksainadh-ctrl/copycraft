import React, { useState } from 'react';
import { Printer, Zap, ShieldCheck, Truck, Sparkles, ArrowRight, CheckCircle2, Building2, Layers, DollarSign } from 'lucide-react';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import { calculateOrderPrice } from '../../server/services/pricingService';

export default function LandingPage({ onNavigate }) {
  const [estPages, setEstPages] = useState(15);
  const [estColorMode, setEstColorMode] = useState('bw');
  const [estSideMode, setEstSideMode] = useState('double');
  const [estBinding, setEstBinding] = useState('spiral');

  const quote = calculateOrderPrice({
    pageCount: estPages,
    printMode: estColorMode,
    sideMode: estSideMode,
    binding: estBinding,
    quantity: 1
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-app)' }}>
      <Navbar />

      {/* Hero Section */}
      <section style={{
        padding: '4.5rem 1.5rem 3.5rem 1.5rem',
        textAlign: 'center',
        background: 'radial-gradient(ellipse at top, var(--primary-light) 0%, transparent 70%)',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div className="container" style={{ maxWidth: '900px' }}>
          <div className="badge badge-primary animate-fade-in" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            <Sparkles size={14} /> AI-POWERED CAMPUS PRINTING PLATFORM
          </div>

          <h1 style={{
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            marginBottom: '1.25rem',
            color: 'var(--text-main)'
          }}>
            Print Smart. <span style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Deliver Faster.</span>
          </h1>

          <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', maxWidth: '700px', margin: '0 auto 2.25rem auto' }}>
            Upload notes, assignments, and presentations from your phone or laptop. Get crisp prints delivered directly to your hostel room or classroom in minutes.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button className="btn btn-lg btn-primary" onClick={() => onNavigate('upload')} style={{ gap: '0.6rem' }}>
              <Printer size={20} />
              Print Documents Now
              <ArrowRight size={18} />
            </button>
            <button className="btn btn-lg btn-secondary" onClick={() => onNavigate('dashboard')}>
              Explore Live Portal
            </button>
          </div>

          {/* Quick Metrics Banner */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1.5rem',
            marginTop: '3.5rem',
            padding: '1.5rem',
            background: 'var(--bg-glass)',
            backdropFilter: 'blur(10px)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-md)'
          }}>
            {[
              { label: 'Colleges Onboarded', value: '45+' },
              { label: 'Documents Printed', value: '1.2M+' },
              { label: 'Avg Delivery Time', value: '18 Mins' },
              { label: 'Customer Rating', value: '4.95 / 5★' }
            ].map((m, idx) => (
              <div key={idx}>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-heading)' }}>
                  {m.value}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {m.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Dynamic Price Estimator Section */}
      <section style={{ padding: '4rem 1.5rem', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
              TRANSPARENT PRICING
            </span>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.25rem' }}>
              Calculate Print Cost Instantly
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'center' }}>
            {/* Interactive Calculator Controls */}
            <div className="card" style={{ padding: '2rem' }}>
              <div className="input-group">
                <label className="input-label">Total Pages ({estPages} Pages)</label>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={estPages}
                  onChange={e => setEstPages(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Color Mode</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <button
                    className={`btn btn-sm ${estColorMode === 'bw' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setEstColorMode('bw')}
                  >
                    Black & White (₹1.50)
                  </button>
                  <button
                    className={`btn btn-sm ${estColorMode === 'color' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setEstColorMode('color')}
                  >
                    Full Colour (₹6.00)
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Side Printing</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <button
                    className={`btn btn-sm ${estSideMode === 'double' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setEstSideMode('double')}
                  >
                    Duplex (Double)
                  </button>
                  <button
                    className={`btn btn-sm ${estSideMode === 'single' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setEstSideMode('single')}
                  >
                    Single Side
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Binding Style</label>
                <select className="input-field" value={estBinding} onChange={e => setEstBinding(e.target.value)}>
                  <option value="none">No Binding (₹0)</option>
                  <option value="staple">Corner Staple (+₹5)</option>
                  <option value="spiral">Plastic Spiral Binding (+₹35)</option>
                  <option value="softcover">Softcover Thermal (+₹65)</option>
                  <option value="hardcover">Hardcover Golden (+₹130)</option>
                </select>
              </div>
            </div>

            {/* Price Output Display Card */}
            <div className="card glass-panel" style={{ padding: '2.5rem', textAlign: 'center', background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--primary-light) 100%)' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)' }}>ESTIMATED TOTAL QUOTE</div>
              <div style={{ fontSize: '3.5rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-heading)', margin: '0.5rem 0' }}>
                ₹{quote.breakdown.finalPrice.toFixed(2)}
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Includes GST (18%) + Instant Campus Classroom Delivery
              </p>
              <button className="btn btn-lg btn-primary" onClick={() => onNavigate('upload')} style={{ width: '100%' }}>
                Print This Document Now
              </button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
