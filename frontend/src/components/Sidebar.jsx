import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  UploadCloud, 
  FileText, 
  Settings, 
  X,
  Activity,
  Pill,
  CalendarDays,
  Stethoscope
} from 'lucide-react';

const navy = '#152E57';
const teal = '#0d9488';

const navigation = [
  { name: 'Dashboard',     href: '/dashboard',   icon: LayoutDashboard },
  { name: 'Upload Report', href: '/upload',       icon: UploadCloud },
  { name: 'My Reports',    href: '/reports',      icon: FileText },
  { name: 'Medications',   href: '/medications',  icon: Pill },
  { name: 'Symptoms',      href: '/symptoms',     icon: Stethoscope },
  { name: 'Health Trends', href: '/trends',       icon: Activity },
  { name: 'Timeline',      href: '/timeline',     icon: CalendarDays },
  { name: 'Settings',      href: '/settings',     icon: Settings },
];

const Sidebar = ({ isOpen, onClose }) => {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-64 flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0 md:flex-shrink-0
        `}
        style={{ background: navy, borderRight: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* Logo area */}
        <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2.5">
            <img src="/medintel-logo.jpg" alt="MedIntel" className="h-8 w-8 rounded-lg object-cover" />
            <div>
              <span className="text-white font-extrabold text-lg leading-none tracking-tight">
                Med<span style={{ color: teal }}>Intel</span>
              </span>
              <p className="text-[9px] tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Understand Today
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="md:hidden text-white/40 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => { if (window.innerWidth < 768) onClose(); }}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                    isActive
                      ? 'text-white'
                      : 'text-white/50 hover:text-white/90'
                  }`
                }
                style={({ isActive }) => isActive
                  ? { background: 'rgba(255,255,255,0.12)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }
                  : {}
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                      style={isActive
                        ? { background: teal, color: '#fff' }
                        : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }
                      }
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>{item.name}</span>
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: teal }} />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          className="px-4 py-4 border-t text-[10px] tracking-wider"
          style={{ borderColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.25)' }}
        >
          © {new Date().getFullYear()} MedIntel · Understand Today. Healthier Tomorrow.
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
