import { LayoutDashboard, Package } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navigationItems = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard, end: true },
  { label: 'Packages', to: '/packages', icon: Package },
];

export const Sidebar = () => (
  <aside className="sa-sidebar" aria-label="Super Admin navigation">
    <nav className="sa-sidebar-nav">
      {navigationItems.map(({ label, to, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `sa-sidebar-link${isActive ? ' active' : ''}`}
        >
          <Icon size={19} aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  </aside>
);
