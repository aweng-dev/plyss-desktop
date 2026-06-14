import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Database, Users, ShieldCheck,
  LogOut, Menu, X, ArrowUpRight, Sun, Moon, Command, type LucideIcon,
} from 'lucide-react';
import Logo from '../Logo';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { ToastProvider } from './Toast';
import CommandPalette from './CommandPalette';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const NAV: NavItem[] = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/records', label: 'Records', icon: Database },
  { to: '/admin/enumerators', label: 'Enumerators', icon: Users },
  { to: '/admin/team', label: 'Team', icon: ShieldCheck },
];

const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-md px-3.5 py-2.5 font-mono text-xs uppercase tracking-[0.12em] transition-colors ${
    isActive
      ? 'bg-forest text-on-forest'
      : 'text-on-forest-2 hover:text-on-forest hover:bg-forest/60'
  }`;

/**
 * The admin console shell: a forest sidebar (desktop) / slide-over (mobile) with
 * primary navigation, wrapped around an <Outlet/> for the active view.
 */
const AdminLayout: React.FC = () => {
  const { session, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  const admin = session?.admin;

  // Close the mobile menu whenever the route changes.
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  // Global ⌘K / Ctrl-K opens the command palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleLogout = () => { logout(); navigate('/admin/login', { replace: true }); };

  const brand = (
    <Link to="/admin" className="flex items-center gap-3 min-w-0">
      <Logo size="sm" />
      <span className="leading-none min-w-0">
        <span className="block font-display text-lg text-on-forest">PLYSS</span>
        <span className="block font-mono text-[0.58rem] uppercase tracking-[0.18em] text-on-forest-2 mt-0.5">
          Admin console
        </span>
      </span>
    </Link>
  );

  const nav = (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={navClass}>
          <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
          {label}
        </NavLink>
      ))}
    </nav>
  );

  const footer = (
    <div className="border-t border-rule-forest/50 pt-4 space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setCmdOpen(true)}
          className="flex-1 inline-flex items-center justify-between gap-2 rounded-md border border-rule-forest px-3 py-2 text-on-forest-2 hover:text-on-forest hover:border-on-forest-2 transition-colors"
        >
          <span className="inline-flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.12em]">
            <Command className="w-3.5 h-3.5" /> Quick actions
          </span>
          <kbd className="font-mono text-[0.58rem] text-on-forest-2">⌘K</kbd>
        </button>
        <button
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          aria-pressed={isDark}
          className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-rule-forest text-on-forest-2 hover:text-on-forest transition-colors"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
      {admin?.email && (
        <p className="px-1 min-w-0">
          <span className="block font-mono text-[0.58rem] uppercase tracking-[0.16em] text-on-forest-2">
            Signed in
          </span>
          <span className="block text-sm text-on-forest truncate mt-0.5">{admin.name || admin.email}</span>
        </p>
      )}
      <button onClick={handleLogout} className="chip chip--on-forest w-full justify-center">
        <LogOut className="w-4 h-4" />
        Log out
      </button>
    </div>
  );

  return (
    <ToastProvider>
    <div className="min-h-screen bg-paper text-ink">
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      {/* Desktop sidebar */}
      <aside className="focus-on-dark hidden lg:flex fixed inset-y-0 left-0 w-60 bg-forest-deep text-on-forest flex-col justify-between p-5 z-30">
        <div className="space-y-8">
          {brand}
          {nav}
        </div>
        <div className="space-y-4">
          <Link to="/" className="flex items-center gap-2 px-1 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-on-forest-2 hover:text-on-forest transition-colors">
            View public site <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
          {footer}
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="focus-on-dark lg:hidden sticky top-0 z-30 bg-forest-deep text-on-forest">
        <div className="flex items-center justify-between gap-4 h-16 px-5">
          {brand}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            className="inline-flex items-center justify-center w-10 h-10 rounded-md border border-rule-forest text-on-forest"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile slide-over */}
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-forest-deep/50 backdrop-blur-[1px]" onClick={() => setMenuOpen(false)} aria-hidden="true" />
          <div className="focus-on-dark absolute inset-y-0 left-0 w-72 max-w-[82vw] bg-forest-deep text-on-forest flex flex-col justify-between p-5 animate-[hm-rise_0.24s_ease-out]">
            <div className="space-y-8">
              {brand}
              {nav}
            </div>
            <div className="space-y-4">
              <Link to="/" className="flex items-center gap-2 px-1 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-on-forest-2 hover:text-on-forest transition-colors">
                View public site <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
              {footer}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="lg:pl-60">
        <main className="max-w-6xl mx-auto px-5 lg:px-10 py-8 sm:py-12">
          <Outlet />
        </main>
      </div>
    </div>
    </ToastProvider>
  );
};

export default AdminLayout;
