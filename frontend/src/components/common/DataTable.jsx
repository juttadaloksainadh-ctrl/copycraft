import React, { useState, useMemo } from 'react';
import { Search, ArrowUpDown, Download, ChevronLeft, ChevronRight, FileSpreadsheet, FileText } from 'lucide-react';
import { exportToCSV, exportToPDF } from '../../utils/exportUtils';

export default function DataTable({
  columns = [],
  data = [],
  title = 'Data Records',
  searchPlaceholder = 'Search records...',
  exportFileName = 'copycraft-export'
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const filteredData = useMemo(() => {
    return data.filter(item => {
      return Object.values(item).some(val =>
        String(val || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [data, searchTerm]);

  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;
    return [...filteredData].sort((a, b) => {
      let aVal = a[sortColumn] || '';
      let bVal = b[sortColumn] || '';
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortColumn, sortDirection]);

  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (key) => {
    if (sortColumn === key) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(key);
      setSortDirection('asc');
    }
  };

  const handleExportCSV = () => {
    exportToCSV(data, `${exportFileName}.csv`);
  };

  const handleExportPDF = () => {
    const headers = columns.map(c => c.header);
    const rows = data.map(item => columns.map(c => String(c.accessor ? item[c.accessor] : '')));
    exportToPDF(title, headers, rows, `${exportFileName}.pdf`);
  };

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      {/* Top Header & Action Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
        <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{title} ({filteredData.length})</h4>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: '240px' }}>
            <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="input-field"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{ paddingLeft: '32px', paddingTop: '0.4rem', paddingBottom: '0.4rem', fontSize: '0.85rem' }}
            />
          </div>

          {/* Export Buttons */}
          <button className="btn btn-sm btn-secondary" onClick={handleExportCSV} title="Export CSV">
            <FileSpreadsheet size={15} color="var(--success)" />
            <span>CSV</span>
          </button>
          <button className="btn btn-sm btn-secondary" onClick={handleExportPDF} title="Export PDF">
            <FileText size={15} color="var(--danger)" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* Table Structure */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  onClick={() => col.accessor && handleSort(col.accessor)}
                  style={{
                    padding: '0.75rem 0.6rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    cursor: col.accessor ? 'pointer' : 'default',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    {col.header}
                    {col.accessor && <ArrowUpDown size={13} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    transition: 'background var(--transition-fast)'
                  }}
                >
                  {columns.map((col, colIndex) => (
                    <td key={colIndex} style={{ padding: '0.75rem 0.6rem', color: 'var(--text-main)' }}>
                      {col.cell ? col.cell(row) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  No matching records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
        <span style={{ color: 'var(--text-muted)' }}>
          Showing {sortedData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} entries
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            className="btn btn-sm btn-secondary"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          >
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontWeight: 600, padding: '0 0.5rem' }}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="btn btn-sm btn-secondary"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
