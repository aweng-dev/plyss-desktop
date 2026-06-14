import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Database, Users, ShieldCheck, Sun, Moon, ExternalLink, LogOut, Search, CornerDownLeft,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  run: () => void;
  keywords?: string;
}

const CommandPalette: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const commands: Command[] = useMemo(() => {
    const go = (to: string) => () => { onClose(); navigate(to); };
    return [
      { id: 'overview', label: 'Go to Overview', hint: 'Dashboard', icon: LayoutDashboard, run: go('/admin'), keywords: 'home dashboard analytics' },
      { id: 'records', label: 'Go to Records', hint: 'Individuals & households', icon: Database, run: go('/admin/records'), keywords: 'survey people families' },
      { id: 'enumerators', label: 'Go to Enumerators', hint: 'Field workers', icon: Users, run: go('/admin/enumerators'), keywords: 'field staff approve suspend' },
      { id: 'team', label: 'Go to Team', hint: 'Administrators', icon: ShieldCheck, run: go('/admin/team'), keywords: 'admins access' },
      { id: 'theme', label: isDark ? 'Switch to light theme' : 'Switch to dark theme', icon: isDark ? Sun : Moon, run: () => { toggleTheme(); onClose(); }, keywords: 'dark light mode appearance' },
      { id: 'site', label: 'View public site', icon: ExternalLink, run: () => { onClose(); window.open('/', '_blank', 'noopener'); }, keywords: 'website landing' },
      { id: 'logout', label: 'Log out', icon: LogOut, run: () => { onClose(); logout(); navigate('/admin/login', { replace: true }); }, keywords: 'sign out exit' },
    ];
  }, [isDark, navigate, logout, toggleTheme, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => `${c.label} ${c.hint ?? ''} ${c.keywords ?? ''}`.toLowerCase().includes(q));
  }, [commands, query]);

  // Reset + focus when opened.
  useEffect(() => {
    if (open) { setQuery(''); setActive(0); requestAnimationFrame(() => inputRef.current?.focus()); }
  }, [open]);

  useEffect(() => { setActive(0); }, [query]);

  if (!open) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); filtered[active]?.run(); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };

  return (
    <div className="fixed inset-0 z-[350]">
      <div className="absolute inset-0 bg-forest-deep/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div className="absolute left-1/2 top-[12vh] -translate-x-1/2 w-[min(92vw,34rem)]">
        <div role="dialog" aria-modal="true" aria-label="Command palette" className="rounded-xl border border-rule bg-paper shadow-2xl overflow-hidden animate-[hm-rise_0.2s_ease-out]">
          <div className="flex items-center gap-3 px-4 border-b border-rule">
            <Search className="w-4 h-4 text-muted shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search actions and pages…"
              aria-label="Command search"
              className="flex-1 bg-transparent py-3.5 text-sm text-ink placeholder:text-muted focus:outline-none"
            />
            <kbd className="hidden sm:inline font-mono text-[0.6rem] uppercase tracking-wider text-muted border border-rule rounded px-1.5 py-0.5">esc</kbd>
          </div>
          <ul className="max-h-80 overflow-y-auto py-2">
            {filtered.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-muted">No matching actions.</li>
            ) : (
              filtered.map((c, i) => {
                const Icon = c.icon;
                const isActive = i === active;
                return (
                  <li key={c.id}>
                    <button
                      onMouseMove={() => setActive(i)}
                      onClick={c.run}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isActive ? 'bg-paper-2' : ''}`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-accent-deep' : 'text-muted'}`} />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm text-ink truncate">{c.label}</span>
                        {c.hint && <span className="block text-xs text-muted truncate">{c.hint}</span>}
                      </span>
                      {isActive && <CornerDownLeft className="w-3.5 h-3.5 text-muted shrink-0" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
