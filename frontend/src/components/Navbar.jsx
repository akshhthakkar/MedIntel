import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Menu, LogOut, Settings, ChevronDown, Search, X, LayoutDashboard, UploadCloud, FileText, Pill, Stethoscope, Activity, CalendarDays, ArrowRight } from 'lucide-react';
import NotificationBell from './NotificationBell';
import { Link, useNavigate } from 'react-router-dom';

const navy = '#152E57';
const teal = '#0d9488';

// ── All searchable platform modules
const MODULES = [
  { label: 'Dashboard',          desc: 'Overview, stats & recent reports',           href: '/dashboard',   icon: LayoutDashboard,  tags: ['home','summary','overview'] },
  { label: 'Upload Report',      desc: 'Upload a new lab or medical report',          href: '/upload',      icon: UploadCloud,      tags: ['pdf','scan','add','new'] },
  { label: 'My Reports',         desc: 'Browse & analyse all uploaded reports',       href: '/reports',     icon: FileText,         tags: ['lab','history','view','pdf'] },
  { label: 'Medications',        desc: 'Manage prescriptions & daily schedule',       href: '/medications', icon: Pill,             tags: ['pills','drugs','prescription','schedule','reminder'] },
  { label: 'Symptoms Tracker',   desc: 'Log daily symptoms, mood & energy',          href: '/symptoms',    icon: Stethoscope,      tags: ['pain','mood','energy','sleep','vitals'] },
  { label: 'Health Trends',      desc: 'Charts & analytics of lab parameters',       href: '/trends',      icon: Activity,         tags: ['chart','graph','analytics','parameters'] },
  { label: 'Timeline',           desc: 'Chronological view of your health events',   href: '/timeline',    icon: CalendarDays,     tags: ['history','events','dates'] },
  { label: 'Account Settings',   desc: 'Profile, password & notification preferences', href: '/settings',  icon: Settings,         tags: ['profile','account','password','email','notifications'] },
];

// Spotlight search component
const SearchBar = () => {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef  = useRef(null);
  const panelRef  = useRef(null);
  const navigate  = useNavigate();

  const results = query.trim().length === 0
    ? MODULES
    : MODULES.filter(m => {
        const q = query.toLowerCase();
        return (
          m.label.toLowerCase().includes(q) ||
          m.desc.toLowerCase().includes(q) ||
          m.tags.some(t => t.includes(q))
        );
      });

  // Open on Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setCursor(0);
    } else {
      setQuery('');
    }
  }, [open]);

  // Click outside to close
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    if (e.key === 'Enter' && results[cursor]) {
      navigate(results[cursor].href);
      setOpen(false);
    }
  };

  const go = (href) => { navigate(href); setOpen(false); };

  return (
    <>
      {/* Trigger pill */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border transition-all hover:border-gray-300 hover:bg-gray-50 group"
        style={{ borderColor: '#e9eef6', background: '#f8fafc', minWidth: 200 }}
      >
        <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
        <span className="text-sm text-gray-400 flex-1 text-left">Search modules…</span>
        <span
          className="hidden sm:inline text-[10px] font-bold px-1.5 py-0.5 rounded-md"
          style={{ background: '#e9eef6', color: '#94a3b8', letterSpacing: '0.05em' }}
        >
          ⌘K
        </span>
      </button>

      {/* Backdrop + Spotlight panel */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4"
          style={{ background: 'rgba(15,28,50,0.55)', backdropFilter: 'blur(4px)' }}>
          <div
            ref={panelRef}
            className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 24px 60px rgba(21,46,87,0.2)' }}
          >
            {/* Search input row */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
              <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search pages, features…"
                value={query}
                onChange={e => { setQuery(e.target.value); setCursor(0); }}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-none"
              />
              {query && (
                <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              )}
              <kbd
                className="text-[10px] font-bold px-2 py-1 rounded-lg"
                style={{ background: '#f1f5f9', color: '#94a3b8', border: '1px solid #e2e8f0' }}
              >
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
              {results.length === 0 ? (
                <div className="text-center py-10 text-sm text-gray-400">
                  No modules match "<span className="font-semibold text-gray-600">{query}</span>"
                </div>
              ) : (
                <>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    {query ? 'Results' : 'All Modules'}
                  </p>
                  <div className="px-2 pb-2 space-y-0.5">
                    {results.map((mod, i) => {
                      const Icon = mod.icon;
                      const active = i === cursor;
                      return (
                        <button
                          key={mod.href}
                          onClick={() => go(mod.href)}
                          onMouseEnter={() => setCursor(i)}
                          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all text-left"
                          style={active
                            ? { background: '#EBF2FF' }
                            : { background: 'transparent' }}
                        >
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={active
                              ? { background: navy }
                              : { background: '#f1f5f9' }}
                          >
                            <Icon className="h-4 w-4" style={{ color: active ? '#fff' : '#64748b' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold leading-none" style={{ color: active ? navy : '#1e293b' }}>
                              {mod.label}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5 truncate">{mod.desc}</p>
                          </div>
                          {active && (
                            <ArrowRight className="h-4 w-4 flex-shrink-0" style={{ color: teal }} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Footer hint */}
            <div className="flex items-center gap-4 px-4 py-2.5 border-t border-gray-100" style={{ background: '#f8fafc' }}>
              {[
                { keys: ['↑','↓'], label: 'navigate' },
                { keys: ['↵'],     label: 'open' },
                { keys: ['Esc'],   label: 'close' },
              ].map(({ keys, label }) => (
                <div key={label} className="flex items-center gap-1">
                  {keys.map(k => (
                    <kbd key={k} className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: '#e2e8f0', color: '#64748b', border: '1px solid #cbd5e1' }}>
                      {k}
                    </kbd>
                  ))}
                  <span className="text-[10px] text-gray-400 ml-0.5">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ── Main Navbar
const Navbar = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <nav
      className="flex-shrink-0 z-30"
      style={{
        background: '#ffffff',
        borderBottom: '1px solid #e9eef6',
        boxShadow: '0 1px 4px rgba(21,46,87,0.06)',
      }}
    >
      <div className="px-4 sm:px-6">
        <div className="flex items-center h-14 gap-3">

          {/* Mobile hamburger */}
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* ── Search bar (center/left) */}
          <div className="flex-1">
            <SearchBar />
          </div>

          {/* ── Right: notifications + user */}
          <div className="flex items-center gap-1 flex-shrink-0">

            {/* Notifications */}
            {user?._id && (
              <div className="relative flex items-center justify-center h-9 w-9 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                <NotificationBell />
              </div>
            )}

            {/* Divider */}
            <div className="h-6 w-px bg-gray-200 mx-1" />

            {/* User dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(prev => !prev)}
                className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-xl hover:bg-gray-100 transition-colors"
                style={dropdownOpen ? { background: '#f1f5f9' } : {}}
              >
                <div
                  className="h-8 w-8 rounded-xl flex items-center justify-center text-white text-sm font-black flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${navy}, #1e4a8c)` }}
                >
                  {user?.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-bold leading-none" style={{ color: navy }}>
                    {user?.name?.split(' ')[0] || 'User'}
                  </p>
                  <p className="text-[10px] text-gray-400 leading-none mt-0.5">Patient</p>
                </div>
                <ChevronDown
                  className="h-3.5 w-3.5 text-gray-400 hidden sm:block transition-transform duration-200"
                  style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
              </button>

              {dropdownOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-52 rounded-2xl overflow-hidden z-50"
                  style={{
                    background: '#fff',
                    border: '1px solid #e9eef6',
                    boxShadow: '0 8px 32px rgba(21,46,87,0.12)',
                  }}
                >
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-bold" style={{ color: navy }}>{user?.name}</p>
                    <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                  </div>
                  <div className="p-1.5 space-y-0.5">
                    <Link
                      to="/settings"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                    >
                      <Settings className="h-4 w-4 flex-shrink-0" style={{ color: teal }} />
                      Account Settings
                    </Link>
                    <button
                      onClick={() => { setDropdownOpen(false); logout(); }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4 flex-shrink-0" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
