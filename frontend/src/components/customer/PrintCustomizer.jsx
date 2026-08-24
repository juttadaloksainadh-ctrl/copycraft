import React from 'react';
import { Sliders, Copy, Sparkles, BookOpen, Layers } from 'lucide-react';
import { PRICING_DEFAULTS } from '../../utils/pricingService';

export default function PrintCustomizer({ options, onOptionsChange, rates = PRICING_DEFAULTS }) {
  const handleChange = (key, value) => {
    onOptionsChange({ ...options, [key]: value });
  };

  // Resolve dynamic prices with safe fallback to PRICING_DEFAULTS
  const bwRate = rates?.printMode?.bw ?? PRICING_DEFAULTS.printMode.bw;
  const colorRate = rates?.printMode?.color ?? PRICING_DEFAULTS.printMode.color;

  const bindingRates = {
    staple: rates?.binding?.staple ?? PRICING_DEFAULTS.binding.staple,
    spiral: rates?.binding?.spiral ?? PRICING_DEFAULTS.binding.spiral,
    softcover: rates?.binding?.softcover ?? PRICING_DEFAULTS.binding.softcover,
    hardcover: rates?.binding?.hardcover ?? PRICING_DEFAULTS.binding.hardcover
  };

  const laminationRates = {
    front: rates?.lamination?.front ?? PRICING_DEFAULTS.lamination.front,
    both: rates?.lamination?.both ?? PRICING_DEFAULTS.lamination.both,
    full: rates?.lamination?.full ?? PRICING_DEFAULTS.lamination.full
  };

  const coverSheetRates = {
    transparent: rates?.coverSheet?.transparent ?? PRICING_DEFAULTS.coverSheet.transparent,
    cardboard: rates?.coverSheet?.cardboard ?? PRICING_DEFAULTS.coverSheet.cardboard
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sliders size={18} color="var(--primary)" />
          Print & Finishing Preferences
        </h3>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Real-time cost recalculation</span>
      </div>

      {/* Grid Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
        {/* Color Mode */}
        <div className="input-group">
          <label className="input-label">Color Mode</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {[
              { id: 'bw', label: 'Black & White', price: `₹${bwRate.toFixed(2)}/page` },
              { id: 'color', label: 'Full Colour', price: `₹${colorRate.toFixed(2)}/page` }
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleChange('printMode', item.id)}
                style={{
                  padding: '0.65rem 0.5rem',
                  borderRadius: 'var(--radius-md)',
                  border: `1.5px solid ${options.printMode === item.id ? 'var(--primary)' : 'var(--border-color)'}`,
                  background: options.printMode === item.id ? 'var(--primary-light)' : 'var(--bg-app)',
                  color: options.printMode === item.id ? 'var(--primary)' : 'var(--text-main)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  textAlign: 'center'
                }}
              >
                <div>{item.label}</div>
                <div style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: '2px' }}>{item.price}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Side Mode (Duplex) */}
        <div className="input-group">
          <label className="input-label">Sides</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {[
              { id: 'double', label: 'Double Side (Duplex)', badge: 'Save 15%' },
              { id: 'single', label: 'Single Side', badge: 'Standard' }
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleChange('sideMode', item.id)}
                style={{
                  padding: '0.65rem 0.5rem',
                  borderRadius: 'var(--radius-md)',
                  border: `1.5px solid ${options.sideMode === item.id ? 'var(--primary)' : 'var(--border-color)'}`,
                  background: options.sideMode === item.id ? 'var(--primary-light)' : 'var(--bg-app)',
                  color: options.sideMode === item.id ? 'var(--primary)' : 'var(--text-main)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  textAlign: 'center'
                }}
              >
                <div>{item.label}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--success)', marginTop: '2px' }}>{item.badge}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Paper Size */}
        <div className="input-group">
          <label className="input-label">Paper Size</label>
          <select
            className="input-field"
            value={options.paperSize}
            onChange={e => handleChange('paperSize', e.target.value)}
          >
            <option value="A4">A4 (Standard 210 x 297 mm)</option>
            <option value="Letter">Letter (216 x 279 mm)</option>
            <option value="Legal">Legal (216 x 356 mm)</option>
            <option value="A3">A3 (Poster 297 x 420 mm)</option>
          </select>
        </div>

        {/* Binding Option */}
        <div className="input-group">
          <label className="input-label">Binding Style</label>
          <select
            className="input-field"
            value={options.binding}
            onChange={e => handleChange('binding', e.target.value)}
          >
            <option value="none">No Binding (Loose Sheets)</option>
            <option value="staple">Corner Staple (+₹{bindingRates.staple})</option>
            <option value="spiral">Plastic Spiral Binding (+₹{bindingRates.spiral})</option>
            <option value="softcover">Softcover Thermal Bind (+₹{bindingRates.softcover})</option>
            <option value="hardcover">Hardcover Golden Emboss (+₹{bindingRates.hardcover})</option>
          </select>
        </div>

        {/* Lamination Option */}
        <div className="input-group">
          <label className="input-label">Lamination Protection</label>
          <select
            className="input-field"
            value={options.lamination}
            onChange={e => handleChange('lamination', e.target.value)}
          >
            <option value="none">None</option>
            <option value="front">Front Cover Lamination (+₹{laminationRates.front})</option>
            <option value="both">Front & Back Cover Lamination (+₹{laminationRates.both})</option>
            <option value="full">Full Document Gloss Sealed (+₹{laminationRates.full})</option>
          </select>
        </div>

        {/* Cover Sheet */}
        <div className="input-group">
          <label className="input-label">Cover Sheet Type</label>
          <select
            className="input-field"
            value={options.coverSheet}
            onChange={e => handleChange('coverSheet', e.target.value)}
          >
            <option value="none">None</option>
            <option value="transparent">Transparent OHP Front Sheet (+₹{coverSheetRates.transparent})</option>
            <option value="cardboard">Heavy Cardboard Back (+₹{coverSheetRates.cardboard})</option>
          </select>
        </div>
      </div>

      {/* Quantity Selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Number of Copies (Quantity):</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => handleChange('quantity', Math.max(1, (options.quantity || 1) - 1))}
            style={{ width: '36px', height: '36px' }}
          >
            -
          </button>
          <span style={{ fontWeight: 800, fontSize: '1.1rem', minWidth: '30px', textAlign: 'center' }}>
            {options.quantity || 1}
          </span>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => handleChange('quantity', (options.quantity || 1) + 1)}
            style={{ width: '36px', height: '36px' }}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

