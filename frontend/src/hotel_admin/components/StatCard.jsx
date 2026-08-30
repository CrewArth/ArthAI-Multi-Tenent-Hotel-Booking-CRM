import React from 'react';

/**
 * Reusable StatCard KPI widget for Hotel Admin Dashboard
 */
export const StatCard = ({
  title,
  value,
  icon: Icon,
  colorTheme = 'blue',
  subtitle,
}) => {
  const themeClasses = {
    blue: { iconBg: '#eff6ff', iconColor: '#2563eb', valColor: '#0f172a' },
    green: { iconBg: '#f0fdf4', iconColor: '#16a34a', valColor: '#16a34a' },
    amber: { iconBg: '#fef3c7', iconColor: '#d97706', valColor: '#d97706' },
    emerald: { iconBg: '#ecfdf5', iconColor: '#059669', valColor: '#059669' },
    purple: { iconBg: '#f5f3ff', iconColor: '#7c3aed', valColor: '#7c3aed' },
  };

  const theme = themeClasses[colorTheme] || themeClasses.blue;

  return (
    <div className="ha-stat-card">
      <div className="ha-stat-card__top">
        <span className="ha-stat-card__title">{title}</span>
        {Icon && (
          <div
            className="ha-stat-card__icon-wrap"
            style={{ background: theme.iconBg, color: theme.iconColor }}
          >
            <Icon size={18} />
          </div>
        )}
      </div>
      <div className="ha-stat-card__value" style={{ color: theme.valColor }}>
        {value ?? '—'}
      </div>
      {subtitle && <div className="ha-stat-card__subtitle">{subtitle}</div>}
    </div>
  );
};

export default StatCard;
