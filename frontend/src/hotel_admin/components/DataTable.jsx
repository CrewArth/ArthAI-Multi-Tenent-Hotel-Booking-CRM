import React from 'react';
import '../styles/dataTable.css';

/**
 * Reusable DataTable component for Hotel Admin
 *
 * @param {Array} columns - [{ header, accessor, render, align: 'left'|'center'|'right', width, className }]
 * @param {Array} data - Array of row objects
 * @param {string} keyField - Unique ID field on each row object (default: '_id')
 * @param {boolean} loading - Displays loading spinner
 * @param {string} loadingMessage - Custom loading text
 * @param {string} emptyMessage - Custom empty records text
 * @param {Function} onRowClick - Optional row click handler
 * @param {string} className - Optional container class
 */
export const DataTable = ({
  columns = [],
  data = [],
  keyField = '_id',
  loading = false,
  loadingMessage = 'Loading data...',
  emptyMessage = 'No records found.',
  onRowClick,
  className = '',
}) => {
  return (
    <div className={`ha-table-container ${className}`}>
      {loading ? (
        <div className="ha-table-loading">
          <div className="ha-spinner" />
          <span>{loadingMessage}</span>
        </div>
      ) : data.length === 0 ? (
        <div className="ha-table-empty">{emptyMessage}</div>
      ) : (
        <table className="ha-data-table">
          <thead>
            <tr>
              {columns.map((col, idx) => {
                const alignClass = col.align ? `align-${col.align}` : 'align-left';
                return (
                  <th
                    key={col.header || idx}
                    className={`${alignClass} ${col.className || ''}`}
                    style={col.width ? { width: col.width } : undefined}
                  >
                    {col.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIdx) => {
              const rowKey = row[keyField] || row.id || rowIdx;
              return (
                <tr
                  key={rowKey}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  style={onRowClick ? { cursor: 'pointer' } : undefined}
                >
                  {columns.map((col, colIdx) => {
                    const alignClass = col.align ? `align-${col.align}` : 'align-left';
                    const cellVal = col.accessor ? row[col.accessor] : undefined;
                    return (
                      <td
                        key={`${rowKey}-${colIdx}`}
                        className={`${alignClass} ${col.className || ''}`}
                      >
                        {col.render ? col.render(row, rowIdx) : (cellVal ?? '—')}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default DataTable;
