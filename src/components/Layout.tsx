import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  Wheat,
  Tractor,
  ClipboardList,
  Package,
  Settings,
  Menu,
  X,
  ChevronRight,
  Users,
  Flag,
  AlertTriangle,
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/map', label: 'Map View', icon: Map },
  { path: '/fields', label: 'Fields', icon: Wheat },
  { path: '/equipment', label: 'Equipment', icon: Tractor },
  { path: '/alerts', label: 'Alerts', icon: AlertTriangle },
  { path: '/operations', label: 'Operations', icon: ClipboardList },
  { path: '/products', label: 'Products', icon: Package },
  { path: '/operators', label: 'Operators', icon: Users },
  { path: '/flags', label: 'Flags', icon: Flag },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-stone-50">
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-white shadow-lg rounded-lg p-2.5 hover:bg-stone-50 transition-colors"
      >
        <Menu className="w-5 h-5 text-stone-700" />
      </button>

      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-stone-200 z-50 transform transition-transform duration-300 ease-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-5 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-green-600 to-green-700 rounded-lg flex items-center justify-center shadow-sm">
              <Wheat className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-stone-900 text-sm tracking-tight">Rocking Z Acres</h1>
              <p className="text-[10px] text-stone-400 uppercase tracking-wider font-medium">Farm Management</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 hover:bg-stone-100 rounded-md transition-colors"
          >
            <X className="w-4 h-4 text-stone-400" />
          </button>
        </div>

        <nav className="p-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                  isActive
                    ? 'bg-green-50 text-green-700 shadow-sm'
                    : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'
                }`}
              >
                <Icon className={`w-[18px] h-[18px] ${isActive ? 'text-green-600' : 'text-stone-400 group-hover:text-stone-600'}`} />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-green-400" />}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-stone-100">
          <div className="flex items-center gap-2 px-2">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs text-stone-400 font-medium">Sandbox Mode</span>
          </div>
        </div>
      </aside>

      <main className="lg:ml-64 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
